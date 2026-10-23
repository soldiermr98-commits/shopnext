<?php

declare(strict_types=1);

use App\Http\Controllers\CatalogController;
use App\Models\ActivityLog;
use App\Models\Product;
use App\Models\User;
use App\Services\ProductContent;
use App\Services\Products;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

it('L3a product content independently gates six roles on reads and transactional audited writes', function (string $role, bool $allowed) {
    $actor = User::factory()->create(['role' => $role]);
    $service = app(ProductContent::class);
    if (! $allowed) {
        expect(fn () => $service->read($actor, 999))->toThrow(AuthorizationException::class);
        expect(fn () => $service->save($actor, 999, []))->toThrow(AuthorizationException::class);

        return;
    }
    $product = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'product', 'sku' => 'SKU', 'price' => 100]);
    $service->save($actor, $product->id, ['full_description' => '<p>متن <strong>مجاز</strong></p><script>alert(1)</script>', 'short_description' => '<b>کوتاه</b>', 'faqs' => [['question' => '<b>پرسش؟</b>', 'answer' => '<p>پاسخ</p><img src=x onerror=alert(1)>']], 'specifications' => [['group' => 'فنی', 'key' => 'وزن', 'value' => 'سبک']]]);
    $read = $service->read($actor, $product->id);
    expect($read['product']->full_description)->toContain('<strong>مجاز</strong>')->not->toContain('<script');
    expect($product->fresh()->short_description)->toBe('کوتاه');
    $faqs = json_decode($product->fresh()->faqs, true);
    expect($faqs[0]['question'])->toBe('پرسش؟');
    expect($faqs[0]['answer'])->not->toContain('onerror');
    expect($product->fresh()->price)->toBe(100);
    expect($product->fresh()->stock)->toBe(0);
    $audit = ActivityLog::where('action', 'content.update')->firstOrFail();
    expect($audit->user_id)->toBe($actor->id);
    expect($audit->changed_fields)->toContain('full_description', 'faqs', 'specifications');
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a product gallery persists exact drag order main selection alt replacement and safe clear', function () {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'admin']);
    $product = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'product', 'sku' => 'SKU', 'price' => 100, 'status' => 'published']);
    $one = '/media/'.str_repeat('a', 48).'.png';
    $two = '/media/'.str_repeat('b', 48).'.png';
    foreach ([$one, $two] as $path) {
        Storage::disk('local')->put(ltrim($path, '/'), 'fixture-only');
    }
    $service = app(ProductContent::class);
    $service->save($actor, $product->id, ['gallery' => [['path' => $two, 'alt' => 'دوم'], ['path' => $one, 'alt' => '<b>اول</b>']], 'main_image' => $one]);
    expect(json_decode($product->fresh()->gallery_images, true))->toBe([$two, $one]);
    expect($product->fresh()->main_image)->toBe($one);
    $this->getJson('/api/products/product')->assertOk()->assertJsonPath('product.galleryImages', [$two, $one])->assertJsonPath('product.mainImageAlt', 'اول');
    $service->save($actor, $product->id, ['gallery' => [['path' => $one, 'alt' => 'جدید'], ['path' => $two, 'alt' => 'دوم']]]);
    expect($product->fresh()->main_image)->toBe($one);
    $service->save($actor, $product->id, ['main_image' => $two]);
    expect($product->fresh()->main_image)->toBe($two);
    $service->save($actor, $product->id, ['gallery' => []]);
    expect($product->fresh()->main_image)->toBe('/images/catalog-placeholder.svg');
    expect(json_decode($product->fresh()->gallery_alt_texts, true))->toBe([]);
    expect(Storage::disk('local')->exists(ltrim($one, '/')))->toBeTrue();
});

it('L3a product content validates Persian limits and forbids inventory prices unsafe paths and invalid relation identities', function () {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'admin']);
    $product = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'product', 'sku' => 'SKU', 'price' => 100]);
    foreach ([['stock' => 1], ['price' => 1], ['gallery' => [['path' => '/media/a.svg', 'alt' => 'SVG']]], ['gallery' => [['path' => '/media/'.str_repeat('a', 48).'.png', 'alt' => 'ناپیدا']]], ['main_image' => '/images/other.svg'], ['specifications' => [['key' => '<b></b>', 'value' => 'متن']]], ['faqs' => [['question' => 'پرسش', 'answer' => '<p></p>']]], ['faqs' => array_fill(0, 21, ['question' => 'پرسش', 'answer' => 'پاسخ'])], ['relations' => ['related' => [$product->id]]], ['relations' => ['related' => [999999]]], ['relations' => ['bad' => []]], ['relations' => ['related' => [1.0]]], ['full_description' => str_repeat('م', 50001)]] as $input) {
        try {
            app(ProductContent::class)->save($actor, $product->id, $input);
            $this->fail('Unsafe editorial write succeeded.');
        } catch (ValidationException $exception) {
            expect(json_encode($exception->errors(), JSON_UNESCAPED_UNICODE))->toMatch('/[آ-ی]/u');
        }
    }
    expect($product->fresh()->stock)->toBe(0);
    expect(ActivityLog::where('action', 'content.update')->count())->toBe(0);
});

it('L3a related upsell cross sell retain order and never publicly expose draft scheduled or trashed targets', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $products = [];
    foreach (['root', 'first', 'second', 'draft', 'trash', 'future'] as $slug) {
        $products[$slug] = app(Products::class)->save($actor, ['title' => $slug, 'slug' => $slug, 'sku' => strtoupper($slug), 'price' => 100, 'status' => in_array($slug, ['draft', 'future'], true) ? 'draft' : 'published']);
    }
    app(Products::class)->save($actor, ['status' => 'scheduled', 'published_at' => now('UTC')->addDay()->format('Y-m-d H:i:s')], $products['future']->id);
    $service = app(ProductContent::class);
    $service->save($actor, $products['root']->id, ['relations' => ['related' => [$products['second']->id, $products['first']->id, $products['draft']->id, $products['trash']->id, $products['future']->id], 'upsell' => [$products['first']->id], 'cross_sell' => [$products['second']->id]]]);
    app(Products::class)->delete($actor, $products['trash']->id);
    $read = $service->read($actor, $products['root']->id);
    expect($read['relations']['related'])->toHaveCount(5);
    $this->getJson('/api/products/root')->assertOk()->assertJsonPath('product.relatedProductIds', [(string) $products['second']->id, (string) $products['first']->id])->assertJsonPath('product.upsellProductIds', [(string) $products['first']->id])->assertJsonPath('product.crossSellProductIds', [(string) $products['second']->id]);
    expect(fn () => $service->save($actor, $products['root']->id, ['relations' => ['related' => [$products['first']->id, $products['first']->id]]]))->toThrow(ValidationException::class);
    expect(fn () => $service->save($actor, $products['root']->id, ['relations' => ['related' => [$products['trash']->id]]]))->toThrow(ValidationException::class);
    expect(fn () => DB::table('product_relations')->insert(['source_id' => $products['root']->id, 'target_id' => $products['root']->id, 'kind' => 'related', 'order_index' => 99]))->toThrow(QueryException::class);
    $service->save($actor, $products['root']->id, ['relations' => []]);
    expect(DB::table('product_relations')->count())->toBe(0);
});

it('L3a content and relation audits roll back together and migration refuses lossy editorial rollback', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $root = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'root', 'sku' => 'ROOT', 'price' => 100]);
    $target = app(Products::class)->save($actor, ['title' => 'دیگر', 'slug' => 'target', 'sku' => 'TARGET', 'price' => 100]);
    ActivityLog::creating(function (): void {
        throw new RuntimeException('Injected editorial audit failure.');
    });
    try {
        expect(fn () => app(ProductContent::class)->save($actor, $root->id, ['faqs' => [['question' => 'پرسش', 'answer' => 'پاسخ']], 'relations' => ['related' => [$target->id]]]))->toThrow(RuntimeException::class);
        expect($root->fresh()->faqs)->toBeNull();
        expect(DB::table('product_relations')->count())->toBe(0);
    } finally {
        ActivityLog::flushEventListeners();
    }
    app(ProductContent::class)->save($actor, $root->id, ['faqs' => [['question' => 'پرسش', 'answer' => 'پاسخ']]]);
    $migration = require database_path('migrations/2026_10_23_000001_add_product_content.php');
    expect(fn () => $migration->down())->toThrow(RuntimeException::class);
    DB::table('products')->where('id', $root->id)->update(['faqs' => json_encode([['question' => '<b>واردشده</b>', 'answer' => '<p>مجاز</p><svg onload=alert(1)></svg>']])]);
    $faqs = app(ProductContent::class)->publicFaqs($root->fresh()->faqs);
    expect($faqs[0]['question'])->toBe('واردشده');
    expect($faqs[0]['answer'])->not->toContain('svg', 'onload');
});

it('L3a product content refreshes safety flags on reads and writes', function (string $field, bool $value) {
    $actor = User::factory()->create(['role' => 'admin']);
    $root = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'root', 'sku' => 'ROOT', 'price' => 100]);
    DB::table('users')->where('id', $actor->id)->update([$field => $value]);
    expect(fn () => app(ProductContent::class)->read($actor, $root->id))->toThrow(AuthorizationException::class);
    expect(fn () => app(ProductContent::class)->save($actor, $root->id, ['faqs' => []]))->toThrow(AuthorizationException::class);
})->with([['is_active', false], ['must_change_password', true]]);

it('L3a product content projection batches relations for fifty products without per product SQL', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $rows = [];
    for ($i = 0; $i < 1000; $i++) {
        $rows[] = ['title' => 'کالا '.$i, 'slug' => 'product-'.$i, 'sku' => 'SKU-'.$i, 'price' => 100, 'status' => 'published'];
    }
    DB::table('products')->insert($rows);
    $ids = Product::orderBy('id')->limit(50)->pluck('id')->all();
    foreach ($ids as $index => $id) {
        app(ProductContent::class)->save($actor, $id, ['relations' => ['related' => [$ids[($index + 1) % 50]]]]);
    }
    // Call the real controller directly to count catalog SQL, not session/cache middleware.
    $request = Request::create('/api/products', 'GET', ['limit' => 50]);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $response = app(CatalogController::class)->index($request);
    $queries = DB::getQueryLog();
    DB::disableQueryLog();
    expect($response->getData(true)['products'])->toHaveCount(50);
    expect($queries)->toHaveCount(6);
});
