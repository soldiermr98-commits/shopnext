<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AttributeTerm;
use App\Models\CatalogAttribute;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class Attributes
{
    private const MESSAGES = [
        'required' => 'این فیلد الزامی است.', 'string' => 'مقدار متنی معتبر وارد کنید.',
        'max' => 'مقدار واردشده بیش از حد مجاز است.', 'min' => 'مقدار منفی مجاز نیست.',
        'integer' => 'عدد صحیح وارد کنید.', 'unique' => 'این نامک قبلاً در این محدوده ثبت شده است.',
        'regex' => 'قالب مقدار واردشده معتبر نیست.', 'in' => 'نوع ویژگی معتبر نیست.',
    ];

    public function listing(User $actor): LengthAwarePaginator
    {
        Gate::forUser($actor->fresh())->authorize('viewAny', CatalogAttribute::class);

        return CatalogAttribute::query()->withCount('terms')->orderBy('id')->paginate(30);
    }

    public function terms(User $actor, int $attributeId): LengthAwarePaginator
    {
        Gate::forUser($actor->fresh())->authorize('viewAny', AttributeTerm::class);
        CatalogAttribute::findOrFail($attributeId);

        return AttributeTerm::query()->with('attribute:id,name,type')->where('attribute_id', $attributeId)->orderBy('order_index')->orderBy('id')->paginate(30);
    }

    public function save(User $actor, array $input, ?int $id = null): CatalogAttribute
    {
        return DB::transaction(function () use ($actor, $input, $id): CatalogAttribute {
            $actor = app(CatalogAccess::class)->lock($actor, CatalogAttribute::class);
            $record = $id === null ? new CatalogAttribute : CatalogAttribute::query()->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize($id === null ? 'create' : 'update', $id === null ? CatalogAttribute::class : $record);
            $data = Validator::make($input, [
                'name' => ['required', 'string', 'max:255'],
                'slug' => ['required', 'string', 'max:255', 'regex:/^[\pL\pN]+(?:[-_][\pL\pN]+)*$/uD', Rule::unique('catalog_attributes', 'slug')->ignore($id)],
                'type' => ['required', Rule::in(['select', 'color', 'image'])],
            ], self::MESSAGES)->validate();
            if ($id !== null && $data['type'] !== $record->type && $record->terms()->exists()) {
                throw ValidationException::withMessages(['type' => 'نوع ویژگی دارای گزینه قابل تغییر نیست.']);
            }
            $before = $record->getAttributes();
            $record->forceFill($data)->saveQuietly();
            app(CatalogAudit::class)->write($actor, $record, $id === null ? 'create' : 'update', $before, $record->getAttributes());

            return $record;
        });
    }

    public function saveTerm(User $actor, int $attributeId, array $input, ?int $id = null): AttributeTerm
    {
        return DB::transaction(function () use ($actor, $attributeId, $input, $id): AttributeTerm {
            $actor = app(CatalogAccess::class)->lock($actor, AttributeTerm::class);
            $attribute = CatalogAttribute::query()->lockForUpdate()->findOrFail($attributeId);
            $record = $id === null ? new AttributeTerm : AttributeTerm::query()->where('attribute_id', $attributeId)->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize($id === null ? 'create' : 'update', $id === null ? AttributeTerm::class : $record);
            $input = array_replace($record->only(['hex', 'image']), $input);
            foreach (['hex', 'image'] as $field) {
                if (($input[$field] ?? null) === '') {
                    $input[$field] = null;
                }
            }
            $data = Validator::make($input, [
                'name' => ['required', 'string', 'max:255'],
                'slug' => ['required', 'string', 'max:255', 'regex:/^[\pL\pN]+(?:[-_][\pL\pN]+)*$/uD', Rule::unique('attribute_terms', 'slug')->where('attribute_id', $attributeId)->ignore($id)],
                'hex' => [Rule::requiredIf($attribute->type === 'color'), 'nullable', 'string', 'regex:/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iD'],
                'image' => [Rule::requiredIf($attribute->type === 'image'), 'nullable', 'string', 'regex:#^/media/[a-f0-9]{48}\.png$#D'],
                'order_index' => ['sometimes', 'integer', 'min:0', 'max:2147483647'],
            ], self::MESSAGES)->validate();
            if (isset($data['hex'])) {
                $hex = strtoupper($data['hex']);
                if (strlen($hex) === 4) {
                    $hex = '#'.implode('', array_map(fn (string $digit): string => $digit.$digit, str_split(substr($hex, 1))));
                }
                $data['hex'] = $hex;
            }
            if (! empty($data['image']) && ! Storage::disk('local')->exists('media/'.basename($data['image']))) {
                throw ValidationException::withMessages(['image' => 'تصویر معتبر و بارگذاری‌شده را انتخاب کنید.']);
            }
            $before = $record->getAttributes();
            $record->forceFill([...$data, 'attribute_id' => $attributeId])->saveQuietly();
            app(CatalogAudit::class)->write($actor, $record, $id === null ? 'create' : 'update', $before, $record->getAttributes());

            return $record;
        });
    }

    public function delete(User $actor, int $id): void
    {
        DB::transaction(function () use ($actor, $id): void {
            $actor = app(CatalogAccess::class)->lock($actor, CatalogAttribute::class);
            $record = CatalogAttribute::query()->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize('delete', $record);
            if ($record->terms()->exists()) {
                throw ValidationException::withMessages(['attribute' => 'ابتدا گزینه‌های این ویژگی را حذف کنید.']);
            }
            $before = $record->getAttributes();
            $record->deleteQuietly();
            app(CatalogAudit::class)->write($actor, $record, 'delete', $before, []);
        });
    }

    public function deleteTerm(User $actor, int $attributeId, int $id): void
    {
        DB::transaction(function () use ($actor, $attributeId, $id): void {
            $actor = app(CatalogAccess::class)->lock($actor, AttributeTerm::class);
            $record = AttributeTerm::query()->where('attribute_id', $attributeId)->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize('delete', $record);
            if (DB::table('product_attribute_terms')->where('term_id', $id)->exists()) {
                throw ValidationException::withMessages(['term' => 'گزینه استفاده‌شده در محصول قابل حذف نیست.']);
            }
            $before = $record->getAttributes();
            $record->deleteQuietly();
            app(CatalogAudit::class)->write($actor, $record, 'delete', $before, []);
        });
    }
}
