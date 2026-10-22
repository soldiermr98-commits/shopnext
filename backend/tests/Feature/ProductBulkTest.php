<?php

declare(strict_types=1);

use App\Financial\Money;
use App\Models\ActivityLog;
use App\Models\User;
use App\Services\Categories;
use App\Services\ProductBulk;
use App\Services\Products;
use App\Services\Variants;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

it('L3a bulk price and category services independently gate all six roles and persist scoped actor audits', function (string $role, bool $allowed) {
    $actor = User::factory()->create(['role' => $role]);
    $service = app(ProductBulk::class);
    if (! $allowed) {
        expect(fn () => $service->prices($actor, [999], 10, 'increase'))->toThrow(AuthorizationException::class);
        expect(fn () => $service->categories($actor, [999], []))->toThrow(AuthorizationException::class);

        return;
    }
    $product = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'product', 'sku' => 'PRODUCT', 'price' => 105]);
    $unselected = app(Products::class)->save($actor, ['title' => 'دیگر', 'slug' => 'other', 'sku' => 'OTHER', 'price' => 200]);
    $category = app(Categories::class)->save($actor, ['title' => 'دسته', 'slug' => 'category']);
    expect($service->prices($actor, [$product->id], '۱۰', 'increase'))->toBe(1);
    expect($product->fresh()->price)->toBe(116);
    expect($product->fresh()->stock)->toBe(0);
    expect($unselected->fresh()->price)->toBe(200);
    expect($service->categories($actor, [$product->id], [$category->id]))->toBe(1);
    expect(DB::table('category_product')->where('product_id', $product->id)->pluck('category_id')->all())->toBe([$category->id]);
    $logs = ActivityLog::whereIn('action', ['bulk.price', 'bulk.categories'])->orderBy('id')->get();
    expect($logs->pluck('action')->all())->toBe(['bulk.price', 'bulk.categories']);
    expect($logs->pluck('user_id')->unique()->all())->toBe([$actor->id]);
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a bulk prices use exact half up integer ratios on roots and active variants without touching stock dates or trash', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $product = app(Products::class)->save($actor, ['title' => 'متغیر', 'slug' => 'variable', 'sku' => 'ROOT', 'type' => 'variable', 'price' => 105, 'sale_price' => 95]);
    $variant = app(Variants::class)->save($actor, $product->id, ['sku' => 'CHILD', 'price' => 105, 'sale_price' => 95, 'flash_price' => 85, 'flash_starts_at' => '2026-10-23 00:00:00', 'flash_ends_at' => '2026-10-24 00:00:00']);
    $trashed = app(Variants::class)->save($actor, $product->id, ['sku' => 'TRASH', 'price' => 105]);
    app(Variants::class)->delete($actor, $product->id, $trashed->id);
    DB::table('product_variants')->where('id', $variant->id)->update(['stock' => 7]);
    expect(app(ProductBulk::class)->prices($actor, [$product->id], 10, 'increase'))->toBe(2);
    expect($product->fresh()->only(['price', 'sale_price', 'stock']))->toBe(['price' => 116, 'sale_price' => 105, 'stock' => 0]);
    expect($variant->fresh()->only(['price', 'sale_price', 'flash_price', 'stock']))->toBe(['price' => 116, 'sale_price' => 105, 'flash_price' => 94, 'stock' => 7]);
    expect($variant->fresh()->flash_starts_at)->toBe('2026-10-23 00:00:00');
    expect($trashed->fresh()->price)->toBe(105);
    expect(app(ProductBulk::class)->prices($actor, [$product->id], 100, 'decrease'))->toBe(2);
    expect($variant->fresh()->only(['price', 'sale_price', 'flash_price', 'stock']))->toBe(['price' => 0, 'sale_price' => 0, 'flash_price' => 0, 'stock' => 7]);
});

it('L3a bulk mutations reject floats duplicate missing trashed and excessive selections and rollback late money overflow', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $product = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'product', 'sku' => 'PRODUCT', 'price' => 100]);
    $late = app(Products::class)->save($actor, ['title' => 'کران', 'slug' => 'limit', 'sku' => 'LIMIT', 'price' => Money::MAX]);
    $service = app(ProductBulk::class);
    foreach ([[[], 10, 'increase'], [[$product->id, $product->id], 10, 'increase'], [[999999], 10, 'increase'], [[$product->id], 1.0, 'increase'], [[$product->id], '1e2', 'increase'], [[$product->id], 101, 'decrease'], [[$product->id], 0, 'increase'], [[$product->id], 10, 'invalid'], [range(1, 51), 10, 'increase']] as [$ids, $percent, $direction]) {
        expect(fn () => $service->prices($actor, $ids, $percent, $direction))->toThrow(ValidationException::class);
    }
    expect(fn () => $service->prices($actor, [$late->id, $product->id], 10, 'increase'))->toThrow(ValidationException::class);
    expect($product->fresh()->price)->toBe(100);
    expect($late->fresh()->price)->toBe(Money::MAX);
    expect(ActivityLog::where('action', 'bulk.price')->count())->toBe(0);
    app(Products::class)->delete($actor, $late->id);
    expect(fn () => $service->prices($actor, [$product->id, $late->id], 10, 'increase'))->toThrow(ValidationException::class);
    expect(fn () => $service->categories($actor, [$product->id], [999999]))->toThrow(ValidationException::class);
    expect(fn () => $service->categories($actor, [$product->id], range(1, 31)))->toThrow(ValidationException::class);
    expect(fn () => $service->categories($actor, [$late->id], []))->toThrow(ValidationException::class);
});

it('L3a bulk category replacement and clear affect only selected products and audit failure rolls back the whole batch', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $first = app(Products::class)->save($actor, ['title' => 'اول', 'slug' => 'first', 'sku' => 'FIRST', 'price' => 100]);
    $second = app(Products::class)->save($actor, ['title' => 'دوم', 'slug' => 'second', 'sku' => 'SECOND', 'price' => 200]);
    $one = app(Categories::class)->save($actor, ['title' => 'یک', 'slug' => 'one']);
    $two = app(Categories::class)->save($actor, ['title' => 'دو', 'slug' => 'two']);
    $service = app(ProductBulk::class);
    $service->categories($actor, [$first->id, $second->id], [$one->id]);
    $service->categories($actor, [$first->id], [$two->id]);
    expect(DB::table('category_product')->where('product_id', $second->id)->value('category_id'))->toBe($one->id);
    $service->categories($actor, [$first->id], []);
    expect(DB::table('category_product')->where('product_id', $first->id)->count())->toBe(0);
    $writes = 0;
    ActivityLog::creating(function (ActivityLog $log) use (&$writes): void {
        if (in_array($log->action, ['bulk.categories', 'bulk.price'], true)) {
            $writes++;
            if ($writes === 2) {
                throw new RuntimeException('Injected late bulk audit failure.');
            }
        }
    });
    try {
        expect(fn () => $service->categories($actor, [$first->id, $second->id], [$two->id]))->toThrow(RuntimeException::class);
        expect(DB::table('category_product')->where('product_id', $first->id)->count())->toBe(0);
        expect(DB::table('category_product')->where('product_id', $second->id)->value('category_id'))->toBe($one->id);
        $writes = 0;
        expect(fn () => $service->prices($actor, [$first->id, $second->id], 10, 'increase'))->toThrow(RuntimeException::class);
        expect($first->fresh()->price)->toBe(100);
        expect($second->fresh()->price)->toBe(200);
        expect(ActivityLog::where('action', 'bulk.price')->count())->toBe(0);
    } finally {
        ActivityLog::flushEventListeners();
    }
});

it('L3a bulk operations reject revoked safety flags even when called with a stale privileged actor', function (string $field, bool $value) {
    $actor = User::factory()->create(['role' => 'admin']);
    $product = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'product', 'sku' => 'PRODUCT', 'price' => 100]);
    DB::table('users')->where('id', $actor->id)->update([$field => $value]);
    expect(fn () => app(ProductBulk::class)->prices($actor, [$product->id], 10, 'increase'))->toThrow(AuthorizationException::class);
    expect(fn () => app(ProductBulk::class)->categories($actor, [$product->id], []))->toThrow(AuthorizationException::class);
})->with([['is_active', false], ['must_change_password', true]]);

it('L3a bulk price preflights the total legacy variation expansion before changing any row', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $product = app(Products::class)->save($actor, ['title' => 'بزرگ', 'slug' => 'large', 'sku' => 'ROOT', 'type' => 'variable', 'price' => 100]);
    $rows = [];
    for ($i = 0; $i < 1000; $i++) {
        $rows[] = ['product_id' => $product->id, 'sku' => 'LEGACY-'.$i, 'price' => 100];
    }
    DB::table('product_variants')->insert($rows);
    expect(fn () => app(ProductBulk::class)->prices($actor, [$product->id], 10, 'increase'))->toThrow(ValidationException::class);
    expect($product->fresh()->price)->toBe(100);
    expect(DB::table('product_variants')->where('price', '<>', 100)->count())->toBe(0);
    expect(ActivityLog::where('action', 'bulk.price')->count())->toBe(0);
});
