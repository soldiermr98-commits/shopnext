<?php

declare(strict_types=1);

use App\Financial\CartService;
use App\Financial\Checkout;
use App\Financial\PricingService;
use App\Financial\Rules;
use App\Models\ActivityLog;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Attributes;
use App\Services\Products;
use App\Services\Variants;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\Support\FinancialFixtures;

uses(RefreshDatabase::class);

function variantMatrixFixture(User $actor): array
{
    $product = app(Products::class)->save($actor, ['title' => 'متغیر', 'slug' => 'variable', 'sku' => 'ROOT', 'type' => 'variable', 'price' => 100]);
    $attributes = app(Attributes::class);
    $color = $attributes->save($actor, ['name' => 'رنگ', 'slug' => 'color', 'type' => 'color']);
    $size = $attributes->save($actor, ['name' => 'اندازه', 'slug' => 'size', 'type' => 'select']);
    $red = $attributes->saveTerm($actor, $color->id, ['name' => 'قرمز', 'slug' => 'red', 'hex' => '#f00']);
    $blue = $attributes->saveTerm($actor, $color->id, ['name' => 'آبی', 'slug' => 'blue', 'hex' => '#00f']);
    $small = $attributes->saveTerm($actor, $size->id, ['name' => 'کوچک', 'slug' => 'small']);
    $large = $attributes->saveTerm($actor, $size->id, ['name' => 'بزرگ', 'slug' => 'large']);

    return compact('product', 'color', 'size', 'red', 'blue', 'small', 'large');
}

it('L3a variants independently gate all six roles on list save matrix delete restore and audit the actor', function (string $role, bool $allowed) {
    $actor = User::factory()->create(['role' => $role]);
    $service = app(Variants::class);
    if (! $allowed) {
        foreach ([fn () => $service->listing($actor, 999), fn () => $service->save($actor, 999, []), fn () => $service->generate($actor, 999, [], 1), fn () => $service->delete($actor, 999, 999), fn () => $service->restore($actor, 999, 999)] as $operation) {
            expect($operation)->toThrow(AuthorizationException::class);
        }
        expect(ProductVariant::withTrashed()->count())->toBe(0);

        return;
    }
    ['product' => $product, 'color' => $color, 'red' => $red] = variantMatrixFixture($actor);
    $record = $service->save($actor, $product->id, ['sku' => 'VARIANT', 'price' => '۱۲۳۴']);
    expect($record->fresh()->price)->toBe(1234);
    expect($record->fresh()->stock)->toBe(0);
    $service->save($actor, $product->id, ['price' => 2000], $record->id);
    $service->delete($actor, $product->id, $record->id);
    expect($service->listing($actor, $product->id)->total())->toBe(0);
    expect($service->listing($actor, $product->id, true)->total())->toBe(1);
    $service->restore($actor, $product->id, $record->id);
    expect($record->fresh()->price)->toBe(2000);
    $logs = ActivityLog::where('module', 'product_variants')->orderBy('id')->get();
    expect($logs->pluck('action')->all())->toBe(['create', 'update', 'delete', 'restore']);
    expect($logs->pluck('user_id')->unique()->all())->toBe([$actor->id]);
    expect($logs[2]->changed_fields)->toContain('deleted_at');
    expect($service->generate($actor, $product->id, [$color->id => [$red->id]], 100))->toBe(1);
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a Cartesian matrix canonicalizes dimensions and never overwrites existing prices SKUs stock or trash on rerun', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    extract(variantMatrixFixture($actor));
    $service = app(Variants::class);
    $dimensions = [$size->id => [$large->id, $small->id], $color->id => [$blue->id, $red->id]];
    expect($service->generate($actor, $product->id, $dimensions, '۲۵۰۰'))->toBe(4);
    expect(ProductVariant::count())->toBe(4);
    expect(DB::table('variant_attribute_terms')->count())->toBe(8);
    expect(DB::table('product_attribute_terms')->count())->toBe(4);
    $record = ProductVariant::firstOrFail();
    expect($record->color_name)->toBe('قرمز');
    expect($record->color_hex)->toBe('#FF0000');
    expect($record->size)->toBe('کوچک');
    $service->save($actor, $product->id, ['price' => 3000, 'sku' => 'CUSTOM'], $record->id);
    // Direct SQL below is fixture setup, never a production stock mutation.
    DB::table('product_variants')->where('id', $record->id)->update(['stock' => 7]);
    expect($service->generate($actor, $product->id, array_reverse($dimensions, true), 9999, 'OTHER'))->toBe(0);
    expect($record->fresh()->only(['price', 'sku', 'stock']))->toBe(['price' => 3000, 'sku' => 'CUSTOM', 'stock' => 7]);
    $other = ProductVariant::where('id', '<>', $record->id)->firstOrFail();
    $service->delete($actor, $product->id, $other->id);
    expect($service->generate($actor, $product->id, $dimensions, 9999))->toBe(0);
    expect(ProductVariant::count())->toBe(3);
    expect(ProductVariant::onlyTrashed()->count())->toBe(1);
    expect(ActivityLog::where('module', 'product_variants')->where('action', 'create')->count())->toBe(4);
});

it('L3a matrix rejects wrong owners duplicates excessive expansion and rolls back earlier rows on SKU collision', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    extract(variantMatrixFixture($actor));
    $service = app(Variants::class);
    foreach ([[], [$color->id => []], [$color->id => [$small->id]], [$color->id => [$red->id, $red->id]], [99999 => [$red->id]]] as $dimensions) {
        expect(fn () => $service->generate($actor, $product->id, $dimensions, 100))->toThrow(ValidationException::class);
    }
    $extra = [];
    for ($i = 0; $i < 11; $i++) {
        $extra[] = app(Attributes::class)->saveTerm($actor, $size->id, ['name' => 'اندازه '.$i, 'slug' => 'extra-'.$i])->id;
    }
    $manyColors = [$red->id, $blue->id];
    for ($i = 0; $i < 8; $i++) {
        $manyColors[] = app(Attributes::class)->saveTerm($actor, $color->id, ['name' => 'رنگ '.$i, 'slug' => 'extra-'.$i, 'hex' => '#123456'])->id;
    }
    expect(fn () => $service->generate($actor, $product->id, [$color->id => $manyColors, $size->id => $extra], 100))->toThrow(ValidationException::class);
    // Collision is deliberately on the SECOND generated row, proving outer rollback.
    $key = hash('sha256', json_encode([[$color->id, $blue->id]], JSON_THROW_ON_ERROR));
    app(Products::class)->save($actor, ['title' => 'تعارض', 'slug' => 'collision', 'sku' => 'ROOT-'.substr($key, 0, 16), 'price' => 1]);
    expect(fn () => $service->generate($actor, $product->id, [$color->id => [$red->id, $blue->id]], 100))->toThrow(ValidationException::class);
    expect(ProductVariant::withTrashed()->count())->toBe(0);
    expect(DB::table('variant_attribute_terms')->count())->toBe(0);
    expect(DB::table('product_attribute_terms')->count())->toBe(0);
    expect(ActivityLog::where('module', 'product_variants')->count())->toBe(0);
});

it('L3a variant validation rejects direct inventory floats duplicate SKU combinations invalid sales and unsafe images in Persian', function () {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'admin']);
    extract(variantMatrixFixture($actor));
    $service = app(Variants::class);
    $record = $service->save($actor, $product->id, ['sku' => 'CHILD', 'price' => 100], termIds: [$red->id, $small->id]);
    foreach ([['stock' => 0], ['stock' => null], ['price' => 1.0], ['price' => '1e2'], ['price' => '-1'], ['price' => '9007199254740992'], ['sku' => 'ROOT'], ['sale_price' => 101], ['flash_price' => 50], ['max_quantity' => 0], ['sale_starts_at' => '2026-10-23T00:00:00+03:30'], ['sale_price' => 50, 'sale_starts_at' => '2026-10-24 00:00:00', 'sale_ends_at' => '2026-10-23 00:00:00'], ['image' => '/media/evil.svg'], ['image' => '/media/'.str_repeat('a', 48).'.png']] as $input) {
        try {
            $service->save($actor, $product->id, $input, $record->id);
            $this->fail('Invalid variant metadata unexpectedly succeeded.');
        } catch (ValidationException $exception) {
            expect(json_encode($exception->errors(), JSON_UNESCAPED_UNICODE))->toMatch('/[آ-ی]/u');
        }
    }
    expect(fn () => $service->save($actor, $product->id, ['sku' => 'CHILD', 'price' => 100]))->toThrow(ValidationException::class);
    expect(fn () => $service->save($actor, $product->id, ['sku' => 'DUP', 'price' => 100], termIds: [$small->id, $red->id]))->toThrow(ValidationException::class);
    expect(fn () => $service->save($actor, $product->id, ['sku' => 'BAD', 'price' => 100], termIds: [$red->id, $blue->id]))->toThrow(ValidationException::class);
    $image = str_repeat('b', 48).'.png';
    Storage::disk('local')->put('media/'.$image, 'fixture-only');
    $service->save($actor, $product->id, ['image' => '/media/'.$image, 'sale_price' => '۸۰', 'flash_price' => 70, 'flash_starts_at' => '2026-10-23 00:00:00', 'flash_ends_at' => '2026-10-24 00:00:00'], $record->id);
    expect($record->fresh()->image)->toBe('/media/'.$image);
    expect(app(PricingService::class)->unitPrice((object) $record->fresh()->getAttributes(), CarbonImmutable::parse('2026-10-23 10:00:00', 'UTC')))->toBe(70);
});

it('L3a variant parent identity term ownership stock and publication protections survive soft deletion', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    extract(variantMatrixFixture($actor));
    $service = app(Variants::class);
    $record = $service->save($actor, $product->id, ['sku' => 'CHILD', 'price' => 100], termIds: [$red->id, $small->id]);
    $other = app(Products::class)->save($actor, ['title' => 'دیگر', 'slug' => 'other', 'sku' => 'OTHER', 'type' => 'variable', 'price' => 100]);
    expect(fn () => $service->save($actor, $other->id, ['price' => 2], $record->id))->toThrow(ModelNotFoundException::class);
    expect(fn () => $service->delete($actor, $other->id, $record->id))->toThrow(ModelNotFoundException::class);
    expect(fn () => app(Attributes::class)->deleteTerm($actor, $color->id, $red->id))->toThrow(ValidationException::class);
    DB::table('product_variants')->where('id', $record->id)->update(['stock' => 1]);
    expect(fn () => $service->delete($actor, $product->id, $record->id))->toThrow(ValidationException::class);
    expect(fn () => $service->save($actor, $product->id, [], $record->id, [$blue->id, $small->id]))->toThrow(ValidationException::class);
    DB::table('product_variants')->where('id', $record->id)->update(['stock' => 0]);
    app(Products::class)->save($actor, ['status' => 'published'], $product->id);
    expect(fn () => $service->delete($actor, $product->id, $record->id))->toThrow(ValidationException::class);
    app(Products::class)->save($actor, ['status' => 'draft'], $product->id);
    $service->delete($actor, $product->id, $record->id);
    expect(fn () => app(Products::class)->save($actor, ['status' => 'published'], $product->id))->toThrow(ValidationException::class);
    expect(fn () => app(Products::class)->save($actor, ['title' => 'رزرو', 'slug' => 'reserved', 'sku' => 'CHILD', 'price' => 100]))->toThrow(ValidationException::class);
    expect(fn () => $service->restore($actor, $other->id, $record->id))->toThrow(ModelNotFoundException::class);
    $service->restore($actor, $product->id, $record->id);
    expect($record->fresh()->terms()->count())->toBe(2);
    $actor->forceFill(['role' => 'support'])->save();
    expect(fn () => $service->save($actor, $product->id, ['price' => 99], $record->id))->toThrow(AuthorizationException::class);
});

it('L3a variant thousand row lists eagerly load bounded option labels in six queries', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    extract(variantMatrixFixture($actor));
    // Legacy-sized fixtures deliberately exceed the new editor creation cap.
    $rows = [];
    for ($i = 0; $i < 1000; $i++) {
        $rows[] = ['product_id' => $product->id, 'sku' => 'VAR-'.$i, 'price' => 100];
    }
    DB::table('product_variants')->insert($rows);
    DB::table('product_attribute_terms')->insert(['product_id' => $product->id, 'term_id' => $red->id, 'attribute_id' => $color->id]);
    $options = ProductVariant::all()->map(fn ($variant): array => ['variant_id' => $variant->id, 'product_id' => $product->id, 'term_id' => $red->id, 'attribute_id' => $color->id])->all();
    DB::table('variant_attribute_terms')->insert($options);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $page = app(Variants::class)->listing($actor, $product->id);
    foreach ($page as $variant) {
        expect($variant->terms[0]->attribute->name)->toBe('رنگ');
    }
    $queries = DB::getQueryLog();
    DB::disableQueryLog();
    expect($page->total())->toBe(1000);
    expect($page->count())->toBe(30);
    expect($queries)->toHaveCount(6);
    expect(fn () => app(Variants::class)->save($actor, $product->id, ['sku' => 'TOO-MANY', 'price' => 1]))->toThrow(ValidationException::class);
});

it('L3a deleted variants are absent from catalog and rejected by authoritative pricing even with stale stock', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    ['product' => $product] = variantMatrixFixture($actor);
    $service = app(Variants::class);
    $deleted = $service->save($actor, $product->id, ['sku' => 'TRASH', 'price' => 100]);
    $active = $service->save($actor, $product->id, ['sku' => 'ACTIVE', 'price' => 100]);
    app(Products::class)->save($actor, ['status' => 'published'], $product->id);
    $service->delete($actor, $product->id, $deleted->id);
    // Fixture: stale replenishment must never make a trashed SKU buyable.
    DB::table('product_variants')->where('id', $deleted->id)->update(['stock' => 5]);
    $this->getJson('/api/products/'.$product->slug)->assertOk()->assertJsonCount(1, 'product.variants')->assertJsonPath('product.variants.0.id', (string) $active->id);
    expect(fn () => app(PricingService::class)->quote([['product_id' => $product->id, 'variant_id' => $deleted->id, 'quantity' => 1]]))->toThrow(ValidationException::class);
});

it('L3a variant audit failures atomically roll back metadata option membership deletion and restoration', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    extract(variantMatrixFixture($actor));
    $service = app(Variants::class);
    $active = $service->save($actor, $product->id, ['sku' => 'ACTIVE', 'price' => 100]);
    $trashed = $service->save($actor, $product->id, ['sku' => 'TRASH', 'price' => 100]);
    $service->delete($actor, $product->id, $trashed->id);
    ActivityLog::creating(function (): void {
        throw new RuntimeException('Injected variant audit failure.');
    });
    try {
        expect(fn () => $service->save($actor, $product->id, ['sku' => 'NEW', 'price' => 100], termIds: [$red->id, $small->id]))->toThrow(RuntimeException::class);
        expect(fn () => $service->save($actor, $product->id, ['price' => 200], $active->id, [$red->id]))->toThrow(RuntimeException::class);
        expect(fn () => $service->delete($actor, $product->id, $active->id))->toThrow(RuntimeException::class);
        expect(fn () => $service->restore($actor, $product->id, $trashed->id))->toThrow(RuntimeException::class);
        expect($active->fresh()->price)->toBe(100);
        expect(ProductVariant::onlyTrashed()->find($trashed->id))->not->toBeNull();
        expect(ProductVariant::withTrashed()->count())->toBe(2);
        expect(DB::table('variant_attribute_terms')->count())->toBe(0);
        expect(DB::table('product_attribute_terms')->count())->toBe(0);
    } finally {
        ActivityLog::flushEventListeners();
    }
});

it('L3a variant migration refuses lossy rollback of persisted combinations or trash', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    extract(variantMatrixFixture($actor));
    app(Variants::class)->save($actor, $product->id, ['sku' => 'CHILD', 'price' => 100], termIds: [$red->id]);
    $migration = require database_path('migrations/2026_10_22_000004_add_variant_matrix.php');
    expect(fn () => $migration->down())->toThrow(RuntimeException::class);
    expect(ProductVariant::count())->toBe(1);
    expect(DB::table('variant_attribute_terms')->count())->toBe(1);
});

it('L3a variant actions reauthorize stale actors after either safety flag changes', function (string $field, bool $value) {
    $actor = User::factory()->create(['role' => 'admin']);
    ['product' => $product] = variantMatrixFixture($actor);
    $service = app(Variants::class);
    $active = $service->save($actor, $product->id, ['sku' => 'ACTIVE', 'price' => 100]);
    $trashed = $service->save($actor, $product->id, ['sku' => 'TRASH', 'price' => 100]);
    $service->delete($actor, $product->id, $trashed->id);
    DB::table('users')->where('id', $actor->id)->update([$field => $value]);
    foreach ([fn () => $service->listing($actor, $product->id), fn () => $service->save($actor, $product->id, ['price' => 2], $active->id), fn () => $service->generate($actor, $product->id, [], 1), fn () => $service->delete($actor, $product->id, $active->id), fn () => $service->restore($actor, $product->id, $trashed->id)] as $operation) {
        expect($operation)->toThrow(AuthorizationException::class);
    }
})->with([['is_active', false], ['must_change_password', true]]);

it('L3a variant identity remains protected by real cart and order history with zero stock while financial snapshots stay immutable', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    app(Rules::class)->replace($actor, ['shipping' => [['method' => 'post', 'zone' => 'z1', 'type' => 'flat', 'amount' => 0, 'cod' => true]]]);
    extract(variantMatrixFixture($actor));
    $service = app(Variants::class);
    $variant = $service->save($actor, $product->id, ['sku' => 'CHILD', 'price' => 100], termIds: [$red->id]);
    DB::table('product_variants')->where('id', $variant->id)->update(['stock' => 2]);
    app(Products::class)->save($actor, ['status' => 'published'], $product->id);
    $buyer = User::factory()->create();
    $cart = app(CartService::class)->replace($buyer, null, [['product_id' => $product->id, 'variant_id' => $variant->id, 'quantity' => 1]], 0);
    DB::table('product_variants')->where('id', $variant->id)->update(['stock' => 0]);
    app(Products::class)->save($actor, ['status' => 'draft'], $product->id);
    expect(fn () => $service->delete($actor, $product->id, $variant->id))->toThrow(ValidationException::class);
    expect(fn () => $service->save($actor, $product->id, [], $variant->id, [$blue->id]))->toThrow(ValidationException::class);
    DB::table('product_variants')->where('id', $variant->id)->update(['stock' => 2]);
    app(Products::class)->save($actor, ['status' => 'published'], $product->id);
    $order = app(Checkout::class)->create($buyer, $cart['version'], FinancialFixtures::address($buyer), 'post', 'cod', null, bin2hex(random_bytes(16)));
    expect(DB::table('cart_items')->where('product_variant_id', $variant->id)->exists())->toBeFalse();
    DB::table('product_variants')->where('id', $variant->id)->update(['stock' => 0]);
    app(Products::class)->save($actor, ['status' => 'draft'], $product->id);
    expect(fn () => $service->delete($actor, $product->id, $variant->id))->toThrow(ValidationException::class);
    expect(fn () => $service->save($actor, $product->id, [], $variant->id, [$blue->id]))->toThrow(ValidationException::class);
    $service->save($actor, $product->id, ['sku' => 'HISTORY-NEW', 'price' => 1100], $variant->id);
    expect(DB::table('orders')->where('id', $order->id)->value('pricing_snapshot'))->toBe($order->pricing_snapshot);
    expect(DB::table('order_items')->where('order_id', $order->id)->value('sku'))->toBe('CHILD');
    expect((int) DB::table('order_items')->where('order_id', $order->id)->value('unit_price'))->toBe(100);
});

it('L3a SQL rejects cross product options wrong attribute owners missing membership repeated dimensions and reserved deleted combinations', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    extract(variantMatrixFixture($actor));
    $service = app(Variants::class);
    $variant = $service->save($actor, $product->id, ['sku' => 'CHILD', 'price' => 100], termIds: [$red->id]);
    $other = app(Products::class)->save($actor, ['title' => 'دیگر', 'slug' => 'other', 'sku' => 'OTHER', 'type' => 'variable', 'price' => 100]);
    $otherVariant = $service->save($actor, $other->id, ['sku' => 'OTHER-CHILD', 'price' => 100]);
    DB::table('product_attribute_terms')->insert(['product_id' => $other->id, 'term_id' => $red->id, 'attribute_id' => $color->id]);
    foreach ([
        ['variant_id' => $otherVariant->id, 'product_id' => $product->id, 'attribute_id' => $color->id, 'term_id' => $red->id],
        ['variant_id' => $otherVariant->id, 'product_id' => $other->id, 'attribute_id' => $size->id, 'term_id' => $red->id],
        ['variant_id' => $otherVariant->id, 'product_id' => $other->id, 'attribute_id' => $color->id, 'term_id' => $blue->id],
    ] as $row) {
        expect(fn () => DB::table('variant_attribute_terms')->insert($row))->toThrow(QueryException::class);
    }
    DB::table('variant_attribute_terms')->insert(['variant_id' => $otherVariant->id, 'product_id' => $other->id, 'attribute_id' => $color->id, 'term_id' => $red->id]);
    DB::table('product_attribute_terms')->insert(['product_id' => $other->id, 'term_id' => $blue->id, 'attribute_id' => $color->id]);
    expect(fn () => DB::table('variant_attribute_terms')->insert(['variant_id' => $otherVariant->id, 'product_id' => $other->id, 'attribute_id' => $color->id, 'term_id' => $blue->id]))->toThrow(QueryException::class);
    $service->delete($actor, $product->id, $variant->id);
    expect(fn () => DB::table('product_variants')->insert(['product_id' => $product->id, 'sku' => 'DUPLICATE', 'price' => 1, 'combination_key' => $variant->combination_key]))->toThrow(QueryException::class);
    expect(DB::table('variant_attribute_terms')->count())->toBe(2);
});
