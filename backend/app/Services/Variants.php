<?php

declare(strict_types=1);

namespace App\Services;

use App\Financial\Money;
use App\Models\AttributeTerm;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Bounded, transactional catalog metadata. Stock is never an editable field. */
final class Variants
{
    public const LIMIT = 500;

    private const FIELDS = ['sku', 'price', 'sale_price', 'sale_starts_at', 'sale_ends_at', 'flash_price', 'flash_starts_at', 'flash_ends_at', 'weight_grams', 'max_quantity', 'color_name', 'color_hex', 'size', 'image'];

    private const DATES = ['sale_starts_at', 'sale_ends_at', 'flash_starts_at', 'flash_ends_at'];

    private const MESSAGES = [
        'required' => 'این فیلد الزامی است.', 'string' => 'مقدار متنی معتبر وارد کنید.',
        'max' => 'مقدار بیش از حد مجاز است.', 'integer' => 'عدد صحیح وارد کنید.',
        'unique' => 'این شناسه کالا قبلاً ثبت شده است.', 'regex' => 'قالب مقدار معتبر نیست.',
        'prohibited' => 'موجودی فقط با تعدیل دارای دلیل و عامل تغییر می‌کند.',
        'date_format' => 'تاریخ میلادی UTC معتبر وارد کنید.',
        'after_or_equal' => 'تاریخ خارج از محدوده ذخیره‌سازی است.', 'before' => 'تاریخ خارج از محدوده ذخیره‌سازی است.',
    ];

    public function listing(User $actor, int $productId, bool $trashed = false): LengthAwarePaginator
    {
        Gate::forUser($actor->fresh())->authorize('viewAny', ProductVariant::class);
        Product::findOrFail($productId);

        return ProductVariant::query()->where('product_id', $productId)->when($trashed, fn ($query) => $query->onlyTrashed())->with('terms.attribute:id,name,type')->orderBy('id')->paginate(30);
    }

    public function save(User $actor, int $productId, array $input, ?int $id = null, ?array $termIds = null): ProductVariant
    {
        return DB::transaction(function () use ($actor, $productId, $input, $id, $termIds): ProductVariant {
            $actor = app(CatalogAccess::class)->lock($actor, ProductVariant::class);
            $product = $this->parent($productId);
            $record = $id === null ? new ProductVariant : ProductVariant::query()->where('product_id', $productId)->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize($id === null ? 'create' : 'update', $id === null ? ProductVariant::class : $record);
            if ($id === null && ProductVariant::withTrashed()->where('product_id', $productId)->count() >= self::LIMIT) {
                $this->fail('variants', 'هر محصول حداکثر ۵۰۰ تنوع دارد.');
            }
            if (array_diff(array_keys($input), self::FIELDS) !== []) {
                $this->fail('input', 'فیلد غیرمجاز است؛ موجودی فقط با تعدیل دارای دلیل و عامل تغییر می‌کند.');
            }
            $data = $this->validate(array_replace($record->only(self::FIELDS), $input), $id);
            $terms = $termIds === null ? null : $this->terms($termIds);
            if ($terms !== null) {
                $key = $this->key($terms);
                if ($id !== null && $record->combination_key !== $key && $this->inUse($record)) {
                    $this->fail('terms', 'ترکیب تنوع دارای موجودی یا سابقه خرید قابل تغییر نیست.');
                }
                if (ProductVariant::withTrashed()->where('product_id', $productId)->where('combination_key', $key)->when($id !== null, fn ($query) => $query->where('id', '<>', $id))->exists()) {
                    $this->fail('terms', 'این ترکیب قبلاً ثبت شده است؛ در صورت حذف، همان تنوع را بازیابی کنید.');
                }
                $data['combination_key'] = $key;
            }
            $before = $record->getAttributes();
            $record->forceFill([...$data, 'product_id' => $product->id])->saveQuietly();
            if ($terms !== null) {
                $this->assign($record, $terms);
            }
            app(CatalogAudit::class)->write($actor, $record, $id === null ? 'create' : 'update', $before, $record->getAttributes());

            return $record;
        });
    }

    /** Cartesian expansion is preflight-bounded BEFORE allocation or persistence. */
    public function generate(User $actor, int $productId, array $dimensions, mixed $price, ?string $prefix = null): int
    {
        return DB::transaction(function () use ($actor, $productId, $dimensions, $price, $prefix): int {
            $actor = app(CatalogAccess::class)->lock($actor, ProductVariant::class);
            $product = $this->parent($productId);
            Gate::forUser($actor)->authorize('create', ProductVariant::class);
            $price = CatalogInput::integer($price, 'price');
            $prefix ??= $product->sku;
            if (strlen($prefix) > 70 || ! preg_match('/^[A-Za-z0-9]+(?:[-_.][A-Za-z0-9]+)*$/D', $prefix) || count($dimensions) < 1 || count($dimensions) > 4) {
                $this->fail('dimensions', 'یک تا چهار ویژگی و پیشوند شناسه حداکثر ۷۰ نویسه انتخاب کنید.');
            }
            $count = 1;
            $normalized = [];
            foreach ($dimensions as $attributeId => $ids) {
                $attributeId = CatalogInput::integer($attributeId, 'dimensions', 1);
                if (! is_array($ids) || count($ids) < 1 || count($ids) > 20) {
                    $this->fail('dimensions', 'برای هر ویژگی یک تا ۲۰ گزینه انتخاب کنید.');
                }
                $ids = array_map(fn ($value): int => CatalogInput::integer($value, 'dimensions', 1), $ids);
                if (count(array_unique($ids)) !== count($ids)) {
                    $this->fail('dimensions', 'گزینه تکراری مجاز نیست.');
                }
                $terms = AttributeTerm::where('attribute_id', $attributeId)->whereIn('id', $ids)->orderBy('id')->get();
                if ($terms->count() !== count($ids)) {
                    $this->fail('dimensions', 'گزینه باید متعلق به ویژگی انتخاب‌شده باشد.');
                }
                $count *= count($ids);
                if ($count > 100) {
                    $this->fail('dimensions', 'هر عملیات تولید ماتریس حداکثر ۱۰۰ ترکیب دارد.');
                }
                $normalized[$attributeId] = $terms->pluck('id')->all();
            }
            ksort($normalized, SORT_NUMERIC);
            $combinations = [[]];
            foreach ($normalized as $ids) {
                $expanded = [];
                foreach ($combinations as $combination) {
                    foreach ($ids as $id) {
                        $expanded[] = [...$combination, $id];
                    }
                }
                $combinations = $expanded;
            }
            $created = 0;
            foreach ($combinations as $ids) {
                $terms = $this->terms($ids);
                $key = $this->key($terms);
                // Explicitly idempotent: never overwrite price/SKU/stock on rerun.
                if (ProductVariant::withTrashed()->where('product_id', $productId)->where('combination_key', $key)->exists()) {
                    continue;
                }
                $this->save($actor, $productId, ['sku' => $prefix.'-'.substr($key, 0, 16), 'price' => $price], termIds: $ids);
                $created++;
            }

            return $created;
        });
    }

    public function delete(User $actor, int $productId, int $id): void
    {
        DB::transaction(function () use ($actor, $productId, $id): void {
            $actor = app(CatalogAccess::class)->lock($actor, ProductVariant::class);
            $product = $this->parent($productId);
            $record = ProductVariant::query()->where('product_id', $productId)->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize('delete', $record);
            if ($this->inUse($record)) {
                $this->fail('variant', 'تنوع دارای موجودی، سبد یا سابقه سفارش قابل حذف نیست.');
            }
            if ($product->status !== 'draft' && ProductVariant::where('product_id', $productId)->count() <= 1) {
                $this->fail('variant', 'پیش از حذف آخرین تنوع، محصول را پیش‌نویس کنید.');
            }
            $before = $record->getAttributes();
            $record->deleteQuietly();
            app(CatalogAudit::class)->write($actor, $record, 'delete', $before, $record->getAttributes());
        });
    }

    public function restore(User $actor, int $productId, int $id): void
    {
        DB::transaction(function () use ($actor, $productId, $id): void {
            $actor = app(CatalogAccess::class)->lock($actor, ProductVariant::class);
            $this->parent($productId);
            $record = ProductVariant::onlyTrashed()->where('product_id', $productId)->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize('restore', $record);
            $before = $record->getAttributes();
            $record->restoreQuietly();
            app(CatalogAudit::class)->write($actor, $record, 'restore', $before, $record->getAttributes());
        });
    }

    private function parent(int $id): Product
    {
        $product = Product::query()->lockForUpdate()->findOrFail($id);
        if ($product->type !== 'variable') {
            $this->fail('type', 'تنوع فقط برای محصول متغیر ثبت می‌شود.');
        }

        return $product;
    }

    private function validate(array $input, ?int $id): array
    {
        foreach (['sale_price', 'flash_price', 'weight_grams', 'max_quantity', 'image', ...self::DATES] as $field) {
            if (($input[$field] ?? null) === '') {
                $input[$field] = null;
            }
        }
        foreach (['price', 'sale_price', 'flash_price', 'weight_grams', 'max_quantity'] as $field) {
            if (isset($input[$field])) {
                $input[$field] = CatalogInput::integer($input[$field], $field, $field === 'max_quantity' ? 1 : 0, in_array($field, ['max_quantity', 'weight_grams'], true) ? 1000000 : Money::MAX);
            }
        }
        $rules = [
            'sku' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9]+(?:[-_.][A-Za-z0-9]+)*$/D', Rule::unique('product_variants', 'sku')->ignore($id), Rule::unique('products', 'sku')],
            'price' => ['required', 'integer'], 'sale_price' => ['nullable', 'integer'], 'flash_price' => ['nullable', 'integer'],
            'weight_grams' => ['nullable', 'integer'], 'max_quantity' => ['nullable', 'integer'],
            'color_name' => ['nullable', 'string', 'max:100'], 'color_hex' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/D'], 'size' => ['nullable', 'string', 'max:100'],
            'image' => ['nullable', 'string', 'regex:#^/media/[a-f0-9]{48}\.png$#D'], 'stock' => ['prohibited'],
        ];
        foreach (self::DATES as $field) {
            $rules[$field] = ['nullable', 'date_format:Y-m-d H:i:s', 'after_or_equal:1970-01-02 00:00:00', 'before:2038-01-19 00:00:00'];
        }
        $data = Validator::make($input, $rules, self::MESSAGES)->validate();
        unset($data['stock']);
        foreach (['sale', 'flash'] as $kind) {
            $price = $data[$kind.'_price'] ?? null;
            $start = $data[$kind.'_starts_at'] ?? null;
            $end = $data[$kind.'_ends_at'] ?? null;
            if ($price !== null && ($price > $data['price'] || ($kind === 'flash' && ($start === null || $end === null)))) {
                $this->fail($kind.'_price', 'قیمت تخفیف و بازه زمانی معتبر وارد کنید.');
            }
            if ($start !== null && $end !== null && $end <= $start) {
                $this->fail($kind.'_ends_at', 'پایان بازه باید پس از آغاز باشد.');
            }
            if ($price === null) {
                $data[$kind.'_starts_at'] = $data[$kind.'_ends_at'] = null;
            }
        }
        if (! empty($data['image']) && ! Storage::disk('local')->exists('media/'.basename($data['image']))) {
            $this->fail('image', 'تصویر معتبر و بارگذاری‌شده انتخاب کنید.');
        }

        return $data;
    }

    private function terms(array $ids): Collection
    {
        if (count($ids) < 1 || count($ids) > 4) {
            $this->fail('terms', 'یک تا چهار گزینه از ویژگی‌های متفاوت انتخاب کنید.');
        }
        $ids = array_map(fn ($value): int => CatalogInput::integer($value, 'terms', 1), $ids);
        $terms = AttributeTerm::with('attribute:id,name,type,slug')->whereIn('id', $ids)->orderBy('attribute_id')->get();
        if ($terms->count() !== count($ids) || $terms->pluck('attribute_id')->unique()->count() !== count($ids)) {
            $this->fail('terms', 'گزینه‌ها باید معتبر و متعلق به ویژگی‌های متفاوت باشند.');
        }

        return $terms;
    }

    private function key(Collection $terms): string
    {
        return hash('sha256', json_encode($terms->map(fn ($term): array => [(int) $term->attribute_id, (int) $term->id])->all(), JSON_THROW_ON_ERROR));
    }

    private function assign(ProductVariant $record, Collection $terms): void
    {
        DB::table('variant_attribute_terms')->where('variant_id', $record->id)->delete();
        foreach ($terms as $term) {
            DB::table('product_attribute_terms')->insertOrIgnore(['product_id' => $record->product_id, 'term_id' => $term->id, 'attribute_id' => $term->attribute_id]);
            DB::table('variant_attribute_terms')->insert(['variant_id' => $record->id, 'product_id' => $record->product_id, 'term_id' => $term->id, 'attribute_id' => $term->attribute_id]);
        }
        // These legacy display hints are snapshots, not pricing inputs.
        $color = $terms->first(fn ($term): bool => $term->attribute->type === 'color');
        $size = $terms->first(fn ($term): bool => $term->attribute->slug === 'size');
        if ($size === null) {
            $size = $terms->first(fn ($term): bool => $term->attribute->type === 'select');
        }
        $record->forceFill(['color_name' => $color?->name, 'color_hex' => $color?->hex, 'size' => $size?->name])->saveQuietly();
    }

    private function inUse(ProductVariant $record): bool
    {
        return $record->stock !== 0 || DB::table('order_items')->where('product_variant_id', $record->id)->exists() || DB::table('cart_items')->where('product_variant_id', $record->id)->exists();
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
