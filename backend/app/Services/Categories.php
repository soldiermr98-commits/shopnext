<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class Categories
{
    public function listing(User $actor): LengthAwarePaginator
    {
        Gate::forUser($actor->fresh())->authorize('viewAny', Category::class);

        return Category::query()->with('parent:id,title')->orderBy('order_index')->orderBy('id')->paginate(30);
    }

    public function children(User $actor, ?int $parentId): LengthAwarePaginator
    {
        Gate::forUser($actor->fresh())->authorize('viewAny', Category::class);

        return Category::query()->with('parent:id,title')->where('parent_id', $parentId)->orderBy('order_index')->orderBy('id')->paginate(30);
    }

    public function save(User $actor, array $input, ?int $id = null): Category
    {
        return DB::transaction(function () use ($actor, $input, $id): Category {
            $actor = $this->lock($actor);
            $record = $id === null ? new Category : Category::query()->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize($id === null ? 'create' : 'update', $id === null ? Category::class : $record);
            if (($input['parent_id'] ?? null) === '') {
                $input['parent_id'] = null;
            }
            $data = Validator::make($input, [
                'title' => ['required', 'string', 'max:255'],
                'slug' => ['required', 'string', 'max:255', 'regex:/^[\pL\pN]+(?:[-_][\pL\pN]+)*$/uD', Rule::unique('categories', 'slug')->ignore($id)],
                'parent_id' => ['nullable', 'integer', Rule::exists('categories', 'id')],
                'description' => ['nullable', 'string', 'max:50000'],
                'meta_title' => ['nullable', 'string', 'max:160'],
                'meta_description' => ['nullable', 'string', 'max:320'],
                'image' => ['nullable', 'string', 'regex:#^/media/[a-f0-9]{48}\.png$#D'],
                'featured' => ['sometimes', 'boolean'],
            ], [
                'required' => 'این فیلد الزامی است.', 'string' => 'مقدار متنی معتبر وارد کنید.',
                'max' => 'مقدار واردشده بیش از حد مجاز است.', 'unique' => 'این نامک قبلاً ثبت شده است.',
                'exists' => 'دسته والد معتبر نیست.', 'regex' => 'قالب مقدار واردشده معتبر نیست.',
                'integer' => 'شناسه باید عدد صحیح باشد.', 'boolean' => 'مقدار انتخاب‌شده معتبر نیست.',
            ])->validate();
            $parent = array_key_exists('parent_id', $data) ? $data['parent_id'] : $record->parent_id;
            $seen = $id === null ? [] : [$id];
            while ($parent !== null) {
                if (in_array((int) $parent, $seen, true) || count($seen) >= 32) {
                    throw ValidationException::withMessages(['parent_id' => 'چرخه یا عمق بیش از حد در درخت دسته‌ها مجاز نیست.']);
                }
                $seen[] = (int) $parent;
                $parent = Category::query()->whereKey($parent)->value('parent_id');
            }
            if (! empty($data['image']) && ! Storage::disk('local')->exists('media/'.basename($data['image']))) {
                throw ValidationException::withMessages(['image' => 'تصویر معتبر و بارگذاری‌شده را انتخاب کنید.']);
            }
            $before = $record->getAttributes();
            $record->forceFill($data)->saveQuietly();
            $this->audit($actor, $id === null ? 'create' : 'update', $record, $before);

            return $record;
        });
    }

    public function reorder(User $actor, ?int $parentId, array $ids): void
    {
        DB::transaction(function () use ($actor, $parentId, $ids): void {
            $actor = $this->lock($actor);
            Gate::forUser($actor)->authorize('update', new Category);
            Validator::make(['ids' => $ids], ['ids' => ['required', 'array', 'max:500'], 'ids.*' => ['required', 'integer', 'distinct']], ['required' => 'ترتیب دسته‌ها الزامی است.', 'array' => 'ترتیب دسته‌ها معتبر نیست.', 'max' => 'حداکثر ۵۰۰ دسته را مرتب کنید.', 'integer' => 'شناسه دسته معتبر نیست.', 'distinct' => 'شناسه دسته تکراری است.'])->validate();
            $records = Category::query()->where('parent_id', $parentId)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $expected = $records->keys()->map(fn ($id): int => (int) $id)->sort()->values()->all();
            $actual = array_map(intval(...), $ids);
            sort($actual);
            if ($expected !== $actual) {
                throw ValidationException::withMessages(['ids' => 'همه دسته‌های هم‌سطح را دقیقاً یک بار انتخاب کنید.']);
            }
            foreach (array_values($ids) as $position => $id) {
                $record = $records->get($id);
                $before = $record->getAttributes();
                $record->forceFill(['order_index' => $position])->saveQuietly();
                $this->audit($actor, 'reorder', $record, $before);
            }
        });
    }

    public function delete(User $actor, int $id): void
    {
        DB::transaction(function () use ($actor, $id): void {
            $actor = $this->lock($actor);
            $record = Category::query()->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize('delete', $record);
            if (Category::query()->where('parent_id', $id)->exists() || DB::table('category_product')->where('category_id', $id)->exists()) {
                throw ValidationException::withMessages(['category' => 'دسته دارای زیرمجموعه یا محصول قابل حذف نیست.']);
            }
            $before = $record->getAttributes();
            $record->deleteQuietly();
            $this->audit($actor, 'delete', $record, $before);
        });
    }

    private function lock(User $actor): User
    {
        $fresh = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
        Gate::forUser($fresh)->authorize('viewAny', Category::class);
        if (DB::table('catalog_locks')->where('name', 'taxonomy')->lockForUpdate()->first() === null) {
            throw new \RuntimeException('Taxonomy serialization lock is missing.');
        }

        return $fresh;
    }

    private function audit(User $actor, string $action, Category $record, array $before): void
    {
        $safe = array_flip(['id', 'title', 'slug', 'parent_id', 'order_index', 'featured', 'image']);
        (new ActivityLog)->forceFill([
            'user_id' => $actor->id, 'user_name' => $actor->name, 'user_role' => $actor->role,
            'action' => $action, 'module' => 'categories', 'subject_id' => (string) $record->id,
            'changed_fields' => array_keys($record->getChanges()), 'before' => array_intersect_key($before, $safe),
            'after' => $action === 'delete' ? [] : array_intersect_key($record->getAttributes(), $safe), 'ip_address' => request()->ip(),
        ])->save();
    }
}
