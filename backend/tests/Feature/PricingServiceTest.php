<?php

declare(strict_types=1);

use App\Financial\Money;
use App\Financial\PricingService;
use App\Financial\Rules;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(RefreshDatabase::class);

function financialProduct(array $attributes = []): int
{
    $sku = 'sku-'.bin2hex(random_bytes(8));

    return DB::table('products')->insertGetId(array_replace(['title' => 'کالا', 'slug' => $sku, 'sku' => $sku, 'status' => 'published', 'price' => 100, 'stock' => 1000, 'weight_grams' => 100], $attributes));
}

function financialRules(array $attributes = []): void
{
    $admin = User::factory()->create(['role' => 'admin', 'must_change_password' => false]);
    app(Rules::class)->replace($admin, array_replace(['shipping' => [['method' => 'post', 'zone' => 'z1', 'type' => 'flat', 'amount' => 10, 'cod' => true]]], $attributes));
}

function financialCoupon(array $attributes = []): int
{
    return DB::table('coupons')->insertGetId(array_replace(['code' => 'CODE', 'type' => 'fixed', 'value' => 10, 'is_active' => true], $attributes));
}

it('C02 ignores every client monetary field and rejects nonpositive noninteger duplicate and aggregate quantities', function () {
    financialRules(['max_order_quantity' => 100]);
    $id = financialProduct();
    $service = app(PricingService::class);
    $line = ['product_id' => $id, 'quantity' => 2];
    $good = $service->quote([$line], null, 'post', 'z1');
    $bad = $service->quote([[...$line, 'price' => 1, 'line_total' => 0, 'discount' => Money::MAX, 'vat' => -1, 'wallet' => Money::MAX]], null, 'post', 'z1');
    expect($bad)->toBe($good)->and($good['totals']['payable_total'])->toBe(210);
    foreach ([0, -1, 0.5, '2', true, null, 100, Money::MAX] as $quantity) {
        expect(fn () => $service->quote([['product_id' => $id, 'quantity' => $quantity]]))->toThrow(ValidationException::class);
    }
    expect(fn () => $service->quote([['product_id' => $id, 'quantity' => 60], ['product_id' => $id, 'quantity' => 60]]))->toThrow(ValidationException::class);
    $other = financialProduct();
    expect(fn () => $service->quote([['product_id' => $id, 'quantity' => 60], ['product_id' => $other, 'quantity' => 60]]))->toThrow(ValidationException::class);
    expect(fn () => $service->quote([['product_id' => (string) $id, 'quantity' => 1]]))->toThrow(ValidationException::class);
    expect(fn () => $service->quote([['product_id' => $id, 'variant_id' => 0, 'quantity' => 1]]))->toThrow(ValidationException::class);
    expect(fn () => $service->quote([['product_id' => financialProduct(['price' => Money::MAX]), 'quantity' => 2]]))->toThrow(ValidationException::class);
});

it('H06 preserves exact fixed coupon allocation through automatic fractions and rounds final lines once', function () {
    financialRules(['shipping' => [['method' => 'pickup', 'zone' => 'z1', 'type' => 'pickup', 'cod' => false]], 'automatic' => [['type' => 'percentage', 'value' => 5000, 'min_quantity' => 1]]]);
    $a = financialProduct(['price' => 1]);
    $b = financialProduct(['price' => 1]);
    financialCoupon(['value' => 1, 'allow_stacking' => true]);
    $quote = app(PricingService::class)->quote([['product_id' => $b, 'quantity' => 1], ['product_id' => $a, 'quantity' => 1]], 'code', 'pickup', 'z1');
    expect($quote['totals']['payable_total'])->toBe(0)->and(array_column($quote['lines'], 'line_total'))->toBe([0, 0]);
    // Display allocation is NOT fed back into economic coupon allocation.
    expect(array_sum(array_column($quote['lines'], 'automatic_discount')))->toBe(2)->and(array_sum(array_column($quote['lines'], 'coupon_discount')))->toBe(1);
    expect($quote['totals']['rounding_adjustment'])->toBe(1);
    $single = app(PricingService::class)->quote([['product_id' => $a, 'quantity' => 3]], null, 'pickup', 'z1');
    expect($single['totals']['payable_total'])->toBe(2);
});

it('H06 returns explicit signed rounding reconciliation without rounding economics or taxing shipping', function () {
    financialRules(['vat_bps' => 10000, 'automatic' => [['type' => 'percentage', 'value' => 2500, 'min_quantity' => 1]]]);
    $id = financialProduct(['price' => 3]);
    $quote = app(PricingService::class)->quote([['product_id' => $id, 'quantity' => 1]], null, 'post', 'z1');
    expect($quote['totals']['merchandise_total'])->toBe(5)->and($quote['totals']['vat_amount'])->toBe(2)->and($quote['totals']['rounding_adjustment'])->toBe(1)->and($quote['totals']['payable_total'])->toBe(15);
    financialRules(['vat_bps' => 8000, 'automatic' => [['type' => 'percentage', 'value' => 2500, 'min_quantity' => 1]]]);
    $small = financialProduct(['price' => 1]);
    $negative = app(PricingService::class)->quote([['product_id' => $small, 'quantity' => 1]], null, 'post', 'z1');
    expect($negative['totals']['rounding_adjustment'])->toBe(-1)->and($negative['totals']['merchandise_total'])->toBe(1);
    financialRules(['prices_include_tax' => true, 'vat_bps' => 10000]);
    $inclusive = app(PricingService::class)->quote([['product_id' => $id, 'quantity' => 1]], null, 'post', 'z1');
    expect($inclusive['totals']['payable_total'])->toBe(13)->and($inclusive['totals']['vat_amount'])->toBe(0)->and($inclusive['totals']['included_vat'])->toBe(2)->and($inclusive['totals']['net_total'])->toBe(1);
});

it('H06 validates coupon dates scopes exclusions eligible minimum cap capacity and stacking', function () {
    financialRules();
    $id = financialProduct(['price' => 100]);
    $other = financialProduct(['price' => 1000]);
    $cid = financialCoupon(['type' => 'percentage', 'value' => 50, 'min_order_amount' => 100, 'max_discount_amount' => 25, 'include_products' => json_encode([$id])]);
    $service = app(PricingService::class);
    $lines = [['product_id' => $id, 'quantity' => 1], ['product_id' => $other, 'quantity' => 1]];
    expect($service->quote($lines, 'CODE', 'post', 'z1')['totals']['payable_total'])->toBe(1085);
    foreach ([['min_order_amount' => 101], ['expires_at' => now()->subHour()], ['starts_at' => now()->addHour()], ['usage_limit' => 1, 'used_count' => 1], ['exclude_products' => json_encode([$id])], ['is_active' => false]] as $change) {
        DB::table('coupons')->where('id', $cid)->update($change);
        expect(fn () => $service->quote($lines, 'CODE'))->toThrow(ValidationException::class);
        DB::table('coupons')->where('id', $cid)->update(['min_order_amount' => 100, 'expires_at' => null, 'starts_at' => null, 'usage_limit' => null, 'used_count' => 0, 'exclude_products' => null, 'is_active' => true]);
    }
    DB::table('coupons')->where('id', $cid)->update(['per_user_limit' => 1]);
    expect(fn () => $service->quote($lines, 'CODE'))->toThrow(ValidationException::class);
    $user = User::factory()->create();
    expect($service->quote($lines, 'CODE', null, null, $user)['totals']['coupon_discount'])->toBe(25);
    financialRules(['automatic' => [['type' => 'fixed', 'value' => 5, 'min_quantity' => 1]]]);
    expect(fn () => $service->quote($lines, 'CODE', null, null, $user))->toThrow(ValidationException::class);
    DB::table('coupons')->where('id', $cid)->update(['allow_stacking' => true]);
    expect(fn () => $service->quote($lines, 'CODE', null, null, $user))->toThrow(ValidationException::class); // eligible95 is below minimum100
});

it('H06 quotes lowest active price and owns variant stock weight price and parent quantity cap', function () {
    financialRules();
    $id = financialProduct(['type' => 'variable', 'price' => 200]);
    $variant = DB::table('product_variants')->insertGetId(['product_id' => $id, 'sku' => 'v1', 'price' => 100, 'sale_price' => 80, 'sale_starts_at' => now()->subHour(), 'sale_ends_at' => now()->addHour(), 'flash_price' => 70, 'flash_starts_at' => now()->addHour(), 'flash_ends_at' => now()->addHours(2), 'stock' => 5]);
    $service = app(PricingService::class);
    $items = [['product_id' => $id, 'variant_id' => $variant, 'quantity' => 2]];
    expect($service->quote($items, null, 'post', 'z1')['totals']['payable_total'])->toBe(170);
    DB::table('product_variants')->where('id', $variant)->update(['flash_starts_at' => now()->subHour()]);
    expect($service->quote($items)['totals']['merchandise_total'])->toBe(140);
    DB::table('products')->where('id', $id)->update(['max_quantity' => 1]);
    expect(fn () => $service->quote($items))->toThrow(ValidationException::class);
    expect(fn () => $service->quote([['product_id' => $id, 'quantity' => 1]]))->toThrow(ValidationException::class);
    expect(fn () => $service->quote([['product_id' => financialProduct(), 'variant_id' => $variant, 'quantity' => 1]]))->toThrow(ValidationException::class);
});

it('H06 fails closed for missing shipping tariff weight and zone and uses exact net free-over and tier boundaries', function () {
    $id = financialProduct(['price' => 100, 'weight_grams' => null]);
    $service = app(PricingService::class);
    $items = [['product_id' => $id, 'quantity' => 1]];
    expect($service->quote($items)['totals']['payable_total'])->toBeNull();
    expect(fn () => $service->quote($items, null, 'post', 'z1'))->toThrow(ValidationException::class);
    financialRules(['vat_bps' => 1000, 'automatic' => [['type' => 'percentage', 'value' => 50, 'min_quantity' => 1]], 'shipping' => [['method' => 'post', 'zone' => 'z1', 'type' => 'price', 'tiers' => [['up_to' => 100, 'amount' => 10]], 'free_over' => 100, 'cod' => false]]]);
    // net99.5 must NOT be rounded to100 to grant free shipping.
    expect($service->quote($items, null, 'post', 'z1')['shipping']['amount'])->toBe(10);
    expect(fn () => $service->quote($items, null, 'post', 'unknown'))->toThrow(ValidationException::class);
    financialRules(['shipping' => [['method' => 'post', 'zone' => 'z1', 'type' => 'weight', 'tiers' => [['up_to' => 100, 'amount' => 7]], 'cod' => true]]]);
    expect(fn () => $service->quote($items, null, 'post', 'z1'))->toThrow(ValidationException::class);
    DB::table('products')->where('id', $id)->update(['weight_grams' => 100]);
    expect($service->quote($items, null, 'post', 'z1')['shipping']['amount'])->toBe(7);
    DB::table('products')->where('id', $id)->update(['weight_grams' => 101]);
    expect(fn () => $service->quote($items, null, 'post', 'z1'))->toThrow(ValidationException::class);
});

it('C02 H06 seeded pricing properties preserve exact nonnegative integer sums and deterministic line order', function () {
    financialRules(['vat_bps' => 923, 'automatic' => [['type' => 'percentage', 'value' => 1379, 'min_quantity' => 1]]]);
    $a = financialProduct(['price' => 103]);
    $b = financialProduct(['price' => 227]);
    financialCoupon(['value' => 101, 'allow_stacking' => true]);
    $service = app(PricingService::class);
    for ($seed = 1; $seed <= 80; $seed++) {
        $items = [['product_id' => $a, 'quantity' => 1 + $seed % 17], ['product_id' => $b, 'quantity' => 1 + $seed % 13]];
        $quote = $service->quote($items, 'CODE', 'post', 'z1');
        expect($service->quote(array_reverse($items), 'CODE', 'post', 'z1'))->toBe($quote);
        $t = $quote['totals'];
        expect($t['payable_total'])->toBe(array_sum(array_column($quote['lines'], 'line_total')) + $t['shipping_fee']);
        expect($t['payable_total'])->toBe($t['subtotal'] - $t['items_discount'] - $t['coupon_discount'] + $t['vat_amount'] + $t['rounding_adjustment'] + $t['shipping_fee']);
        foreach ($quote['lines'] as $line) {
            foreach (['sale_discount', 'automatic_discount', 'coupon_discount', 'tax_amount', 'line_total', 'net_total'] as $field) {
                expect($line[$field])->toBeInt()->toBeGreaterThanOrEqual(0);
            }
        }
    }
});

it('C01 financial settings enforce roles strict types validated tariffs encryption and transactional audit', function () {
    $rules = app(Rules::class);
    expect(fn () => $rules->replace(User::factory()->create(), []))->toThrow(HttpException::class);
    foreach ([['vat_bps' => 1.5], ['vat_bps' => '100'], ['vat_bps' => 10001], ['prices_include_tax' => 1], ['unknown' => true], ['shipping' => [['method' => 'post', 'zone' => 'z1', 'type' => 'flat', 'cod' => true]]], ['automatic' => [['type' => 'percentage', 'value' => 10001, 'min_quantity' => 1]]]] as $invalid) {
        expect(fn () => $rules->validate($invalid))->toThrow(ValidationException::class);
    }
    financialRules(['vat_bps' => 933]);
    expect($rules->current()['vat_bps'])->toBe(933);
    expect(DB::table('settings')->where('key', Rules::KEY)->value('value'))->not->toBe(json_encode($rules->current(), JSON_THROW_ON_ERROR));
    expect(json_decode(base64_decode(DB::table('settings')->where('key', Rules::KEY)->value('value')), true))->toHaveKeys(['iv', 'value', 'mac']);
    expect(DB::table('activity_logs')->where('module', 'settings')->count())->toBe(1);
    $log = DB::table('activity_logs')->where('module', 'settings')->first();
    expect(json_decode($log->after, true)['value'])->toBe('[REDACTED]');
});
