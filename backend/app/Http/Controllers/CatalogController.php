<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Financial\PricingService;
use App\Services\RichText;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Read-only catalog IDs for financial flows; no management resources. */
final class CatalogController
{
    public function index(Request $r)
    {
        $r->validate(['page' => ['sometimes', 'integer', 'between:1,10000'], 'limit' => ['sometimes', 'integer', 'between:1,50'], 'search' => ['nullable', 'string', 'max:200']]);
        $q = DB::table('products')->where('status', 'published');
        if ($r->filled('search')) {
            $q->where('title', 'like', '%'.$r->input('search').'%');
        }
        $page = $q->orderByDesc('id')->paginate($r->integer('limit', 12));

        return response()->json(['products' => $this->project($page->items()), 'total' => $page->total(), 'page' => $page->currentPage(), 'limit' => $page->perPage(), 'totalPages' => $page->lastPage()]);
    }

    public function show(string $slug)
    {
        $p = DB::table('products')->where('status', 'published')->where(fn ($q) => $q->where('slug', $slug)->orWhere('id', ctype_digit($slug) ? $slug : 0))->first();
        abort_unless($p, 404);

        return response()->json(['product' => $this->project([$p])[0], 'related' => []]);
    }

    private function project(array $products): array
    {
        $ids = array_map(fn ($p) => $p->id, $products);
        $variants = DB::table('product_variants')->whereIn('product_id', $ids)->orderBy('id')->limit(5001)->get();
        abort_if($variants->count() > 5000, 503, 'کاتالوگ نیاز به بخش‌بندی دارد.');
        $groups = $variants->groupBy('product_id');
        $categories = DB::table('category_product')->whereIn('product_id', $ids)->get()->groupBy('product_id');
        $prices = app(PricingService::class);

        return array_map(function ($p) use ($groups, $categories, $prices): array {
            $unit = $prices->unitPrice($p);
            $vs = ($groups->get($p->id) ?? collect())->map(fn ($v) => ['id' => (string) $v->id, 'productId' => (string) $p->id, 'sku' => $v->sku, 'colorName' => $v->color_name, 'colorHex' => $v->color_hex, 'size' => $v->size, 'price' => $v->price, 'salePrice' => $prices->unitPrice($v) < $v->price ? $prices->unitPrice($v) : null, 'stock' => $v->stock, 'image' => $this->image($v->image)])->all();

            return ['id' => (string) $p->id, 'title' => $p->title, 'slug' => $p->slug, 'sku' => $p->sku, 'brand' => $p->brand ?? '', 'categoryIds' => ($categories->get($p->id) ?? collect())->pluck('category_id')->map(fn ($id) => (string) $id)->all(), 'type' => $p->type, 'price' => $p->price, 'salePrice' => $unit < $p->price ? $unit : null, 'stock' => $p->type === 'variable' ? array_sum(array_column($vs, 'stock')) : $p->stock, 'rating' => (float) $p->rating, 'reviewsCount' => $p->reviews_count, 'mainImage' => $this->image($p->main_image), 'galleryImages' => [], 'shortDescription' => strip_tags($p->short_description ?? ''), 'fullDescription' => app(RichText::class)->clean($p->full_description), 'status' => 'published', 'featured' => (bool) $p->featured, 'tags' => json_decode($p->tags ?? '[]', true), 'attributes' => json_decode($p->attributes ?? '{}', true), 'specifications' => json_decode($p->specifications ?? '[]', true), 'variants' => $vs, 'createdAt' => $p->created_at];
        }, $products);
    }

    private function image(?string $path): string
    {
        return $path && preg_match('#^/(images|media)/[A-Za-z0-9/_.-]+$#D', $path) && ! str_contains($path, '..') && ! str_contains($path, '//') ? $path : '/images/catalog-placeholder.svg';
    }
}
