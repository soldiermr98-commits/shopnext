<?php

declare(strict_types=1);

use App\Financial\PricingService;
use App\Models\ActivityLog;
use App\Models\Product;
use App\Models\User;
use App\Services\Brands;
use App\Services\CatalogPublication;
use App\Services\Products;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

it('L3a product metadata independently gates six roles and persists create update soft delete restore actor audits', function (string $role, bool $allowed) {
    $actor = User::factory()->create(['role' => $role]);
    $service = app(Products::class);
    if (! $allowed) {
        foreach ([fn () => $service->listing($actor), fn () => $service->listing($actor, true), fn () => $service->save($actor, []), fn () => $service->save($actor, [], 123), fn () => $service->delete($actor, 123), fn () => $service->restore($actor, 123)] as $operation) {
            expect($operation)->toThrow(AuthorizationException::class);
        }
        expect(Product::withTrashed()->count())->toBe(0);

        return;
    }
    $product = $service->save($actor, ['title' => 'کالا', 'slug' => 'product', 'sku' => 'SKU-1', 'price' => '۱۲۳۴۵۶', 'status' => 'published']);
    expect($product->fresh()->price)->toBe(123456);
    expect($product->fresh()->stock)->toBe(0);
    $service->save($actor, ['title' => 'کالای تازه'], $product->id);
    expect($product->fresh()->title)->toBe('کالای تازه');
    $service->delete($actor, $product->id);
    expect(Product::find($product->id))->toBeNull();
    expect(Product::onlyTrashed()->find($product->id))->not->toBeNull();
    expect($service->listing($actor)->total())->toBe(0);
    expect($service->listing($actor, true)->total())->toBe(1);
    $service->restore($actor, $product->id);
    expect(Product::find($product->id))->not->toBeNull();
    $audit = ActivityLog::where('module', 'products')->where('user_id', $actor->id)->orderBy('id')->get();
    expect($audit->pluck('action')->all())->toBe(['create', 'update', 'delete', 'restore']);
    expect($audit[2]->changed_fields)->toContain('deleted_at');
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a product metadata accepts all four draft types and rejects float money direct inventory unsafe prices and type changes', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Products::class);
    foreach (['simple', 'variable', 'digital', 'bundle'] as $type) {
        expect($service->save($actor, ['title' => $type, 'slug' => $type, 'sku' => strtoupper($type), 'type' => $type, 'price' => 100])->fresh()->type)->toBe($type);
    }
    foreach ([1.0, '1e2', '1.2', false, '-1', '9007199254740992'] as $value) {
        expect(fn () => $service->save($actor, ['title' => 'نامعتبر', 'slug' => 'invalid', 'sku' => 'INVALID', 'price' => $value]))->toThrow(ValidationException::class);
    }
    $product = Product::where('slug', 'simple')->firstOrFail();
    foreach ([['stock' => 10], ['stock' => 0], ['sale_price' => 101], ['flash_price' => 50], ['max_quantity' => 1.0], ['type' => 'variable', 'status' => 'published']] as $input) {
        try {
            $service->save($actor, $input, $product->id);
            $this->fail('Invalid product mutation unexpectedly succeeded.');
        } catch (ValidationException $exception) {
            expect(json_encode($exception->errors(), JSON_UNESCAPED_UNICODE))->toMatch('/[آ-ی]/u');
        }
    }
    expect($product->fresh()->stock)->toBe(0);
    DB::table('products')->where('id', $product->id)->update(['stock' => 1]);
    expect(fn () => $service->save($actor, ['type' => 'bundle'], $product->id))->toThrow(ValidationException::class);
    expect($product->fresh()->type)->toBe('simple');
});

it('L3a product metadata reserves deleted slugs and cross table SKUs and blocks missing variable matrix publication', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Products::class);
    $product = $service->save($actor, ['title' => 'متغیر', 'slug' => 'variable', 'sku' => 'ROOT', 'type' => 'variable', 'price' => 100]);
    expect(fn () => $service->save($actor, ['status' => 'published'], $product->id))->toThrow(ValidationException::class);
    DB::table('product_variants')->insert(['product_id' => $product->id, 'sku' => 'CHILD', 'price' => 100]);
    $service->save($actor, ['status' => 'published'], $product->id);
    expect(fn () => $service->save($actor, ['type' => 'simple'], $product->id))->toThrow(ValidationException::class);
    expect(fn () => $service->save($actor, ['title' => 'تکراری', 'slug' => 'duplicate', 'sku' => 'CHILD', 'price' => 100]))->toThrow(ValidationException::class);
    $service->delete($actor, $product->id);
    expect(fn () => $service->save($actor, ['title' => 'تکراری', 'slug' => 'variable', 'sku' => 'NEW', 'price' => 100]))->toThrow(ValidationException::class);
    expect(fn () => $service->save($actor, ['title' => 'تکراری', 'slug' => 'new', 'sku' => 'ROOT', 'price' => 100]))->toThrow(ValidationException::class);
    $service->restore($actor, $product->id);
    expect(Product::find($product->id))->not->toBeNull();
});

it('L3a product publication applies one UTC predicate to public Unicode routes and authoritative pricing before after schedule and trash', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Products::class);
    $scheduled = $service->save($actor, ['title' => 'زمان‌بندی', 'slug' => 'کالای-زمانی', 'sku' => 'SCHEDULED', 'price' => 100, 'status' => 'scheduled', 'published_at' => '2026-03-21 20:30:00']);
    $service->save($actor, ['title' => 'پیش‌نویس', 'slug' => 'draft', 'sku' => 'DRAFT', 'price' => 100]);
    DB::table('products')->where('id', $scheduled->id)->update(['stock' => 5]);
    CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-03-21 20:29:59', 'UTC'));
    try {
        $this->getJson('/api/products')->assertOk()->assertJsonCount(0, 'products');
        $this->getJson('/api/products/'.rawurlencode($scheduled->slug))->assertNotFound();
        expect(CatalogPublication::visible($scheduled->fresh()))->toBeFalse();
        expect(fn () => app(PricingService::class)->quote([['product_id' => $scheduled->id, 'quantity' => 1]]))->toThrow(ValidationException::class);
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-03-21 20:30:00', 'UTC'));
        $this->getJson('/api/products')->assertOk()->assertJsonCount(1, 'products');
        $this->getJson('/api/products/'.rawurlencode($scheduled->slug))->assertOk()->assertJsonPath('product.id', (string) $scheduled->id)->assertJsonPath('product.status', 'published');
        expect(app(PricingService::class)->quote([['product_id' => $scheduled->id, 'quantity' => 1]])['lines'][0]['unit_price'])->toBe(100);
        expect($scheduled->fresh()->status)->toBe('scheduled');
        $service->delete($actor, $scheduled->id);
        $this->getJson('/api/products/'.$scheduled->id)->assertNotFound();
        expect(fn () => app(PricingService::class)->quote([['product_id' => $scheduled->id, 'quantity' => 1]]))->toThrow(ValidationException::class);
        $service->restore($actor, $scheduled->id);
        $this->getJson('/api/products/'.$scheduled->id)->assertOk();
    } finally {
        CarbonImmutable::setTestNow();
    }
});

it('L3a product sale windows persist exact UTC and retain lowest regular sale flash and zero pricing without floats', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Products::class);
    $product = $service->save($actor, ['title' => 'فروش', 'slug' => 'sale', 'sku' => 'SALE', 'price' => '١٠٠٠', 'sale_price' => 500, 'sale_starts_at' => '2026-03-21 20:30:00', 'sale_ends_at' => '2026-03-22 20:30:00', 'flash_price' => 400, 'flash_starts_at' => '2026-03-21 20:30:00', 'flash_ends_at' => '2026-03-21 21:30:00']);
    expect(DB::table('products')->where('id', $product->id)->value('sale_starts_at'))->toBe('2026-03-21 20:30:00');
    foreach (['2026-03-21 20:29:59' => 1000, '2026-03-21 20:30:00' => 400, '2026-03-21 21:30:00' => 500, '2026-03-22 20:30:00' => 1000] as $at => $expected) {
        expect(app(PricingService::class)->unitPrice(DB::table('products')->find($product->id), CarbonImmutable::parse($at, 'UTC')))->toBe($expected);
    }
    $service->save($actor, ['sale_price' => 0], $product->id);
    expect(app(PricingService::class)->unitPrice(DB::table('products')->find($product->id), CarbonImmutable::parse('2026-03-21 20:30:00', 'UTC')))->toBe(0);
    foreach ([['sale_ends_at' => '2026-03-21 20:30:00'], ['sale_starts_at' => '۱۴۰۵/۰۱/۰۱'], ['sale_starts_at' => '2040-01-01 00:00:00'], ['status' => 'scheduled', 'published_at' => null]] as $input) {
        expect(fn () => $service->save($actor, $input, $product->id))->toThrow(ValidationException::class);
    }
});

it('L3a product rich text SEO and brands persist safely while deleted products retain reference protection', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $brand = app(Brands::class)->save($actor, ['name' => 'نشان', 'slug' => 'brand']);
    $service = app(Products::class);
    $product = $service->save($actor, ['title' => 'کالا', 'slug' => 'product', 'sku' => 'PRODUCT', 'price' => 100, 'status' => 'published', 'brand_id' => $brand->id, 'full_description' => '<p>سلام</p><script>alert(1)</script><img src=x onerror=alert(1)><svg onload=alert(1)></svg>', 'meta_title' => 'عنوان سئو', 'meta_description' => 'توضیح سئو']);
    $html = DB::table('products')->where('id', $product->id)->value('full_description');
    expect($html)->toContain('<p>سلام</p>')->not->toContain('<script', 'onerror', '<svg');
    expect($product->fresh()->meta_title)->toBe('عنوان سئو');
    app(Brands::class)->save($actor, ['name' => 'نشان تازه', 'slug' => 'brand'], $brand->id);
    $this->getJson('/api/products/'.$product->id)->assertOk()->assertJsonPath('product.brand', 'نشان تازه');
    $service->delete($actor, $product->id);
    expect(fn () => app(Brands::class)->delete($actor, $brand->id))->toThrow(ValidationException::class);
    $service->restore($actor, $product->id);
    expect($product->fresh()->brand_id)->toBe($brand->id);
});

it('L3a product metadata rolls back update soft delete and restore if explicit actor audit fails', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Products::class);
    $active = $service->save($actor, ['title' => 'فعال', 'slug' => 'active', 'sku' => 'ACTIVE', 'price' => 100]);
    $trashed = $service->save($actor, ['title' => 'حذف', 'slug' => 'trashed', 'sku' => 'TRASHED', 'price' => 100]);
    $service->delete($actor, $trashed->id);
    ActivityLog::creating(function (): void {
        throw new RuntimeException('Injected product audit failure.');
    });
    try {
        expect(fn () => $service->save($actor, ['title' => 'تغییر'], $active->id))->toThrow(RuntimeException::class);
        expect(fn () => $service->delete($actor, $active->id))->toThrow(RuntimeException::class);
        expect(fn () => $service->restore($actor, $trashed->id))->toThrow(RuntimeException::class);
        expect($active->fresh()->title)->toBe('فعال');
        expect(Product::find($active->id))->not->toBeNull();
        expect(Product::onlyTrashed()->find($trashed->id))->not->toBeNull();
        expect(ActivityLog::where('module', 'products')->count())->toBe(3);
    } finally {
        ActivityLog::flushEventListeners();
    }
});

it('L3a product operations refresh both staff safety flags before every write or list', function (string $field, bool $value) {
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Products::class);
    $active = $service->save($actor, ['title' => 'فعال', 'slug' => 'active', 'sku' => 'ACTIVE', 'price' => 100]);
    $trashed = $service->save($actor, ['title' => 'حذف', 'slug' => 'trashed', 'sku' => 'TRASHED', 'price' => 100]);
    $service->delete($actor, $trashed->id);
    DB::table('users')->where('id', $actor->id)->update([$field => $value]);
    foreach ([fn () => $service->listing($actor), fn () => $service->save($actor, []), fn () => $service->save($actor, ['title' => 'تغییر'], $active->id), fn () => $service->delete($actor, $active->id), fn () => $service->restore($actor, $trashed->id)] as $operation) {
        expect($operation)->toThrow(AuthorizationException::class);
    }
})->with([['is_active', false], ['must_change_password', true]]);

it('L3a product thousand row lists eager load live brand names in four queries without long rich text hydration', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $brand = app(Brands::class)->save($actor, ['name' => 'نشان', 'slug' => 'brand']);
    $rows = [];
    for ($i = 0; $i < 1000; $i++) {
        $rows[] = ['title' => 'کالا '.$i, 'slug' => 'product-'.$i, 'sku' => 'SKU-'.$i, 'price' => 100, 'brand_id' => $brand->id];
    }
    DB::table('products')->insert($rows);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $page = app(Products::class)->listing($actor);
    foreach ($page as $product) {
        expect($product->brandRecord->name)->toBe('نشان');
        expect($product->getAttributes())->not->toHaveKey('full_description');
    }
    expect($page->total())->toBe(1000);
    expect($page->count())->toBe(30);
    $queries = DB::getQueryLog();
    DB::disableQueryLog();
    expect($queries)->toHaveCount(4);
});

it('L3a product migration refuses lossy rollback instead of silently resurrecting trashed products', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $product = app(Products::class)->save($actor, ['title' => 'حذف', 'slug' => 'trashed', 'sku' => 'TRASHED', 'price' => 100]);
    app(Products::class)->delete($actor, $product->id);
    $migration = require database_path('migrations/2026_10_22_000003_add_product_editor_foundation.php');
    expect(fn () => $migration->down())->toThrow(RuntimeException::class);
    expect(Product::onlyTrashed()->find($product->id))->not->toBeNull();
});

it('L3a product slugs reserve the numeric ID namespace so a saved slug cannot resolve to another product', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Products::class);
    $owner = $service->save($actor, ['title' => 'اصل', 'slug' => 'original', 'sku' => 'ORIGINAL', 'price' => 100, 'status' => 'published']);
    expect(fn () => $service->save($actor, ['title' => 'ابهام', 'slug' => (string) $owner->id, 'sku' => 'ALIAS', 'price' => 200, 'status' => 'published']))->toThrow(ValidationException::class);
    $other = $service->save($actor, ['title' => 'دوم', 'slug' => 'item-'.$owner->id, 'sku' => 'OTHER', 'price' => 200, 'status' => 'published']);
    $this->getJson('/api/products/'.$owner->id)->assertOk()->assertJsonPath('product.id', (string) $owner->id)->assertJsonPath('product.price', 100);
    $this->getJson('/api/products/'.$other->slug)->assertOk()->assertJsonPath('product.id', (string) $other->id)->assertJsonPath('product.price', 200);
});
