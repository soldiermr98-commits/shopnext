<?php

declare(strict_types=1);

namespace App\Services;

use App\Financial\Fraction;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

/** Atomic bounded selection; deliberately has NO direct stock mutation API. */
final class ProductBulk
{
    private const PRICE_FIELDS = ['price', 'sale_price', 'flash_price'];

    /** Whole percent, never floats. Scale all regular/sale/flash root + variant prices. */
    public function prices(User $actor, array $productIds, mixed $percent, string $direction): int
    {
        return DB::transaction(function () use ($actor, $productIds, $percent, $direction): int {
            $actor = app(CatalogAccess::class)->lock($actor, Product::class);
            $products = $this->products($actor, $productIds);
            if (! in_array($direction, ['increase', 'decrease'], true)) {
                $this->fail('direction', 'افزایش یا کاهش را انتخاب کنید.');
            }
            $percent = CatalogInput::integer($percent, 'percent', 1, $direction === 'decrease' ? 100 : 1000);
            $factor = new Fraction((string) ($direction === 'increase' ? 100 + $percent : 100 - $percent), '100');
            $variants = ProductVariant::query()->whereIn('product_id', $products->modelKeys())->select(['id', ...self::PRICE_FIELDS])->orderBy('id')->limit(1001)->lockForUpdate()->get();
            if ($products->count() + $variants->count() > 1000) {
                $this->fail('products', 'هر عملیات گروهی حداکثر ۱۰۰۰ ردیف قیمت دارد؛ انتخاب را کوچک‌تر کنید.');
            }
            $count = 0;
            foreach ($products->concat($variants) as $record) {
                Gate::forUser($actor)->authorize('update', $record);
                $before = $record->only(self::PRICE_FIELDS);
                $after = [];
                foreach (self::PRICE_FIELDS as $field) {
                    $after[$field] = $record->$field === null ? null : Fraction::of($record->$field)->times($factor)->rounded();
                }
                $record->forceFill($after)->saveQuietly();
                app(CatalogAudit::class)->write($actor, $record, 'bulk.price', $before, $after);
                $count++;
            }

            return $count;
        });
    }

    /** Explicit category replacement; empty categories clears only the selection. */
    public function categories(User $actor, array $productIds, array $categoryIds): int
    {
        return DB::transaction(function () use ($actor, $productIds, $categoryIds): int {
            $actor = app(CatalogAccess::class)->lock($actor, Product::class);
            $products = $this->products($actor, $productIds);
            $categoryIds = $this->ids($categoryIds, 'categories', 30, true);
            if (Category::whereIn('id', $categoryIds)->count() !== count($categoryIds)) {
                $this->fail('categories', 'دسته انتخاب‌شده معتبر نیست.');
            }
            $memberships = DB::table('category_product')->whereIn('product_id', $products->modelKeys())->orderBy('category_id')->get()->groupBy('product_id');
            foreach ($products as $record) {
                Gate::forUser($actor)->authorize('update', $record);
                $before = ($memberships->get($record->id) ?? collect())->pluck('category_id')->all();
                DB::table('category_product')->where('product_id', $record->id)->delete();
                foreach ($categoryIds as $id) {
                    DB::table('category_product')->insert(['product_id' => $record->id, 'category_id' => $id]);
                }
                app(CatalogAudit::class)->write($actor, $record, 'bulk.categories', ['categories' => $before], ['categories' => $categoryIds]);
            }

            return $products->count();
        });
    }

    private function products(User $actor, array $ids): Collection
    {
        $ids = $this->ids($ids, 'products', 50);
        $products = Product::query()->whereIn('id', $ids)->select(['id', ...self::PRICE_FIELDS])->orderBy('id')->lockForUpdate()->get();
        if ($products->count() !== count($ids)) {
            $this->fail('products', 'محصول انتخاب‌شده معتبر نیست یا در سطل زباله است.');
        }
        foreach ($products as $record) {
            Gate::forUser($actor)->authorize('update', $record);
        }

        return $products;
    }

    private function ids(array $ids, string $field, int $limit, bool $empty = false): array
    {
        if ((! $empty && $ids === []) || count($ids) > $limit) {
            $this->fail($field, 'تعداد انتخاب‌ها خارج از محدوده مجاز است.');
        }
        $ids = array_map(fn ($value): int => CatalogInput::integer($value, $field, 1), $ids);
        if (count(array_unique($ids)) !== count($ids)) {
            $this->fail($field, 'انتخاب تکراری مجاز نیست.');
        }
        sort($ids, SORT_NUMERIC);

        return $ids;
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
