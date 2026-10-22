<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Brand;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class Brands
{
    public function listing(User $actor): LengthAwarePaginator
    {
        Gate::forUser($actor->fresh())->authorize('viewAny', Brand::class);

        return Brand::query()->orderBy('id')->paginate(30);
    }

    public function save(User $actor, array $input, ?int $id = null): Brand
    {
        return DB::transaction(function () use ($actor, $input, $id): Brand {
            $actor = app(CatalogAccess::class)->lock($actor, Brand::class);
            $record = $id === null ? new Brand : Brand::query()->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize($id === null ? 'create' : 'update', $id === null ? Brand::class : $record);
            $data = Validator::make($input, [
                'name' => ['required', 'string', 'max:255'],
                'slug' => ['required', 'string', 'max:255', 'regex:/^[\pL\pN]+(?:[-_][\pL\pN]+)*$/uD', Rule::unique('brands', 'slug')->ignore($id)],
                'origin_country' => ['nullable', 'string', 'max:100'],
                'is_official' => ['sometimes', 'boolean'],
                'logo' => ['nullable', 'string', 'regex:#^/media/[a-f0-9]{48}\.png$#D'],
            ], [
                'required' => 'این فیلد الزامی است.', 'string' => 'مقدار متنی معتبر وارد کنید.',
                'max' => 'مقدار واردشده بیش از حد مجاز است.', 'unique' => 'این نامک قبلاً ثبت شده است.',
                'regex' => 'قالب مقدار واردشده معتبر نیست.', 'boolean' => 'مقدار انتخاب‌شده معتبر نیست.',
            ])->validate();
            if (! empty($data['logo']) && ! Storage::disk('local')->exists('media/'.basename($data['logo']))) {
                throw ValidationException::withMessages(['logo' => 'نشان معتبر و بارگذاری‌شده را انتخاب کنید.']);
            }
            $before = $record->getAttributes();
            $record->forceFill($data)->saveQuietly();
            app(CatalogAudit::class)->write($actor, $record, $id === null ? 'create' : 'update', $before, $record->getAttributes());

            return $record;
        });
    }

    public function delete(User $actor, int $id): void
    {
        DB::transaction(function () use ($actor, $id): void {
            $actor = app(CatalogAccess::class)->lock($actor, Brand::class);
            $record = Brand::query()->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize('delete', $record);
            if (DB::table('products')->where('brand_id', $id)->exists()) {
                throw ValidationException::withMessages(['brand' => 'برند دارای محصول قابل حذف نیست.']);
            }
            $before = $record->getAttributes();
            $record->deleteQuietly();
            app(CatalogAudit::class)->write($actor, $record, 'delete', $before, []);
        });
    }
}
