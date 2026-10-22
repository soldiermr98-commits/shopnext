<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Product metadata only. Inventory must NEVER enter this write contract. */
final class Products
{
    public const FIELDS = ['title', 'slug', 'sku', 'type', 'brand_id', 'price', 'sale_price', 'sale_starts_at', 'sale_ends_at', 'flash_price', 'flash_starts_at', 'flash_ends_at', 'weight_grams', 'max_quantity', 'low_stock_threshold', 'short_description', 'full_description', 'status', 'published_at', 'featured', 'meta_title', 'meta_description'];

    private const DATES = ['published_at', 'sale_starts_at', 'sale_ends_at', 'flash_starts_at', 'flash_ends_at'];

    private const MESSAGES = [
        'required' => 'این فیلد الزامی است.', 'required_if' => 'زمان انتشار برای محصول زمان‌بندی‌شده الزامی است.',
        'string' => 'مقدار متنی معتبر وارد کنید.', 'max' => 'مقدار واردشده بیش از حد مجاز است.',
        'unique' => 'این نامک یا شناسه کالا قبلاً ثبت شده است.', 'regex' => 'قالب مقدار واردشده معتبر نیست.',
        'not_regex' => 'نامک صرفاً عددی لاتین برای شناسه داخلی رزرو شده است.',
        'in' => 'مقدار انتخاب‌شده معتبر نیست.', 'boolean' => 'مقدار انتخاب‌شده معتبر نیست.',
        'exists' => 'برند معتبر نیست.', 'integer' => 'عدد صحیح وارد کنید.',
        'prohibited' => 'موجودی فقط با عملیات تعدیل دارای دلیل و عامل تغییر می‌کند.',
        'date_format' => 'تاریخ میلادی UTC معتبر وارد کنید.',
        'after_or_equal' => 'تاریخ خارج از محدوده ذخیره‌سازی است.', 'before' => 'تاریخ خارج از محدوده ذخیره‌سازی است.',
    ];

    public function listing(User $actor, bool $trashed = false): LengthAwarePaginator
    {
        Gate::forUser($actor->fresh())->authorize('viewAny', Product::class);

        return Product::query()->when($trashed, fn ($query) => $query->onlyTrashed())->with('brandRecord:id,name')->select(['id', 'brand_id', 'title', 'slug', 'sku', 'type', 'price', 'sale_price', 'stock', 'status', 'published_at', 'deleted_at', 'created_at'])->orderByDesc('id')->paginate(30);
    }

    public function save(User $actor, array $input, ?int $id = null): Product
    {
        return DB::transaction(function () use ($actor, $input, $id): Product {
            $actor = app(CatalogAccess::class)->lock($actor, Product::class);
            $record = $id === null ? new Product : Product::query()->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize($id === null ? 'create' : 'update', $id === null ? Product::class : $record);
            $values = array_replace($id === null ? ['type' => 'simple', 'status' => 'draft', 'featured' => false, 'low_stock_threshold' => 5] : array_intersect_key($record->getAttributes(), array_flip(self::FIELDS)), $input);
            foreach (['brand_id', 'sale_price', 'flash_price', 'weight_grams', 'max_quantity', ...self::DATES] as $field) {
                if (($values[$field] ?? null) === '') {
                    $values[$field] = null;
                }
            }
            foreach (['price', 'sale_price', 'flash_price'] as $field) {
                if (isset($values[$field])) {
                    $values[$field] = CatalogInput::integer($values[$field], $field);
                }
            }
            foreach (['low_stock_threshold' => 0, 'weight_grams' => 0, 'max_quantity' => 1] as $field => $min) {
                if (isset($values[$field])) {
                    $values[$field] = CatalogInput::integer($values[$field], $field, $min, 1000000);
                }
            }
            $rules = [
                'title' => ['required', 'string', 'max:255'],
                'slug' => ['required', 'string', 'max:255', 'not_regex:/^[0-9]+$/D', 'regex:/^[\pL\pN]+(?:[-_][\pL\pN]+)*$/uD', Rule::unique('products', 'slug')->ignore($id)],
                'sku' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9]+(?:[-_.][A-Za-z0-9]+)*$/D', Rule::unique('products', 'sku')->ignore($id), Rule::unique('product_variants', 'sku')],
                'type' => ['required', Rule::in(['simple', 'variable', 'digital', 'bundle'])],
                'brand_id' => ['nullable', 'integer', Rule::exists('brands', 'id')],
                'price' => ['required', 'integer'], 'sale_price' => ['nullable', 'integer'], 'flash_price' => ['nullable', 'integer'],
                'weight_grams' => ['nullable', 'integer'], 'max_quantity' => ['nullable', 'integer'], 'low_stock_threshold' => ['sometimes', 'integer'],
                'short_description' => ['nullable', 'string', 'max:2000'], 'full_description' => ['nullable', 'string', 'max:50000'],
                'status' => ['required', Rule::in(['draft', 'published', 'scheduled'])], 'featured' => ['sometimes', 'boolean'],
                'meta_title' => ['nullable', 'string', 'max:160'], 'meta_description' => ['nullable', 'string', 'max:320'],
                'stock' => ['prohibited'],
            ];
            foreach (self::DATES as $field) {
                $rules[$field] = ['nullable', 'date_format:Y-m-d H:i:s', 'after_or_equal:1970-01-02 00:00:00', 'before:2038-01-19 00:00:00'];
            }
            $rules['published_at'][] = 'required_if:status,scheduled';
            $data = Validator::make($values, $rules, self::MESSAGES)->validate();
            unset($data['stock']);
            foreach (['sale', 'flash'] as $kind) {
                $price = $data[$kind.'_price'] ?? null;
                $start = $data[$kind.'_starts_at'] ?? null;
                $end = $data[$kind.'_ends_at'] ?? null;
                if ($price !== null && $price > $data['price']) {
                    throw ValidationException::withMessages([$kind.'_price' => 'قیمت تخفیف بیشتر از قیمت اصلی نیست.']);
                }
                if ($start !== null && $end !== null && $end <= $start) {
                    throw ValidationException::withMessages([$kind.'_ends_at' => 'پایان بازه باید پس از آغاز باشد.']);
                }
                if ($kind === 'flash' && $price !== null && ($start === null || $end === null)) {
                    throw ValidationException::withMessages(['flash_price' => 'بازه آغاز و پایان فروش ویژه الزامی است.']);
                }
                if ($price === null) {
                    $data[$kind.'_starts_at'] = $data[$kind.'_ends_at'] = null;
                }
            }
            if ($data['status'] !== 'scheduled') {
                $data['published_at'] = null;
            }
            if ($data['type'] === 'variable' && $data['status'] !== 'draft' && ($id === null || ! ProductVariant::where('product_id', $id)->exists())) {
                throw ValidationException::withMessages(['type' => 'پیش از انتشار محصول متغیر، تنوع‌های آن را ثبت کنید.']);
            }
            if ($id !== null && $data['type'] !== $record->type && ((int) $record->stock !== 0 || DB::table('product_variants')->where('product_id', $id)->exists() || DB::table('order_items')->where('product_id', $id)->exists() || DB::table('cart_items')->where('product_id', $id)->exists())) {
                throw ValidationException::withMessages(['type' => 'نوع محصول دارای موجودی، تنوع یا سابقه خرید قابل تغییر نیست.']);
            }
            if (! empty($data['brand_id'])) {
                $data['brand'] = Brand::findOrFail($data['brand_id'])->name;
            } elseif ($id === null || $record->brand_id !== null) {
                $data['brand'] = null;
            }
            $before = $record->getAttributes();
            try {
                $record->forceFill($data)->saveQuietly();
            } catch (ValidationException $exception) {
                if (isset($exception->errors()['content'])) {
                    throw ValidationException::withMessages(['full_description' => 'حجم متن توضیحات بیش از حد مجاز است.']);
                }
                throw $exception;
            }
            app(CatalogAudit::class)->write($actor, $record, $id === null ? 'create' : 'update', $before, $record->getAttributes());

            return $record;
        });
    }

    public function delete(User $actor, int $id): void
    {
        DB::transaction(function () use ($actor, $id): void {
            $actor = app(CatalogAccess::class)->lock($actor, Product::class);
            $record = Product::query()->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize('delete', $record);
            $before = $record->getAttributes();
            $record->deleteQuietly();
            app(CatalogAudit::class)->write($actor, $record, 'delete', $before, $record->getAttributes());
        });
    }

    public function restore(User $actor, int $id): void
    {
        DB::transaction(function () use ($actor, $id): void {
            $actor = app(CatalogAccess::class)->lock($actor, Product::class);
            $record = Product::onlyTrashed()->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize('restore', $record);
            $before = $record->getAttributes();
            $record->restoreQuietly();
            app(CatalogAudit::class)->write($actor, $record, 'restore', $before, $record->getAttributes());
        });
    }
}
