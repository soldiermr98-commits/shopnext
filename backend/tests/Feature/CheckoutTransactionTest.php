<?php

declare(strict_types=1);

use App\Financial\CartService;
use App\Financial\Checkout;
use App\Financial\Ledger;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Support\FinancialFixtures as F;

uses(RefreshDatabase::class);

it('C02 H06 H08 checkout reserves stock quota and immutable exact pricing title tax discount and adjustment snapshots', function () {
    F::rules(['vat_bps' => 10000, 'automatic' => [['type' => 'percentage', 'value' => 2500, 'min_quantity' => 1]]]);
    $user = User::factory()->create();
    $product = F::product(['price' => 3]);
    $order = F::order($user, 'card_to_card', $product);
    $snapshot = json_decode($order->pricing_snapshot, true);
    expect($order->payable_total)->toBe(5)->and($order->rounding_adjustment)->toBe(1)->and($order->payment_state)->toBe('unpaid');
    $item = DB::table('order_items')->where('order_id', $order->id)->first();
    expect(json_decode($item->snapshot, true))->toBe($snapshot['lines'][0]);
    expect($item->line_total)->toBe(5)->and($item->tax_amount)->toBe(2);
    DB::table('products')->where('id', $product)->update(['price' => 500, 'title' => 'ویرایش بعدی']);
    expect(DB::table('order_items')->where('id', $item->id)->value('title'))->toBe('کالای آزمون');
    expect(fn () => DB::table('order_items')->where('id', $item->id)->update(['unit_price' => 1]))->toThrow(QueryException::class);
    expect(fn () => DB::table('order_items')->where('id', $item->id)->delete())->toThrow(QueryException::class);
    expect(fn () => DB::table('orders')->where('id', $order->id)->update(['payable_total' => 0]))->toThrow(QueryException::class);
    expect(DB::table('products')->where('id', $product)->value('stock'))->toBe(999);
    expect(DB::table('order_events')->where('order_id', $order->id)->value('actor_user_id'))->toBe($user->id);
});

it('C02 H06 reserves unpaid coupon capacity and rejects its global and per-user exhaustion before stock changes', function () {
    F::rules();
    $id = DB::table('coupons')->insertGetId(['code' => 'LIMIT', 'type' => 'fixed', 'value' => 1, 'is_active' => true, 'usage_limit' => 2, 'per_user_limit' => 1]);
    $a = User::factory()->create();
    $b = User::factory()->create();
    $p = F::product();
    $first = F::order($a, 'cod', $p, 'LIMIT');
    expect(DB::table('coupon_usages')->where('order_id', $first->id)->value('state'))->toBe('reserved');
    expect(fn () => F::order($a, 'cod', $p, 'LIMIT'))->toThrow(ValidationException::class);
    F::order($b, 'cod', $p, 'LIMIT');
    expect(fn () => F::order(User::factory()->create(), 'cod', $p, 'LIMIT'))->toThrow(ValidationException::class);
    expect(DB::table('coupons')->where('id', $id)->value('used_count'))->toBe(2)->and(DB::table('products')->where('id', $p)->value('stock'))->toBe(998);
});

it('C04 rolls back order items stock quota ledger timeline and cart on injected final audit failure', function () {
    $admin = F::rules();
    $user = User::factory()->create();
    app(Ledger::class)->credit($admin, $user->id, 100, 'fund', 'Fixture');
    $p = F::product();
    DB::table('coupons')->insert(['code' => 'ONE', 'type' => 'fixed', 'value' => 1, 'is_active' => true, 'usage_limit' => 1]);
    app(CartService::class)->replace($user, null, [['product_id' => $p, 'quantity' => 1]], 0);
    $address = F::address($user);
    ActivityLog::creating(function (ActivityLog $log): void {
        if ($log->action === 'paid') {
            throw new RuntimeException('Injected paid audit failure');
        }
    });
    try {
        expect(fn () => app(Checkout::class)->create($user, 1, $address, 'post', 'wallet', 'ONE', str_repeat('a', 32)))->toThrow(RuntimeException::class);
    } finally {
        ActivityLog::flushEventListeners();
    }
    foreach (['orders', 'order_items', 'order_events', 'coupon_usages'] as $table) {
        expect(DB::table($table)->count())->toBe(0);
    }
    expect(DB::table('products')->where('id', $p)->value('stock'))->toBe(1000)->and(DB::table('coupons')->value('used_count'))->toBe(0);
    expect(app(Ledger::class)->balance($user->id))->toBe(100)->and(app(CartService::class)->view($user, null)['version'])->toBe(1)->and(DB::table('cart_items')->count())->toBe(1);
});

it('C03 wallet checkout fully pays once and idempotent retry returns same order without consuming cart again', function () {
    $admin = F::rules();
    $user = User::factory()->create();
    app(Ledger::class)->credit($admin, $user->id, 100, 'fund', 'Fixture');
    $p = F::product();
    app(CartService::class)->replace($user, null, [['product_id' => $p, 'quantity' => 1]], 0);
    $address = F::address($user);
    $args = [$user, 1, $address, 'post', 'wallet', null, str_repeat('x', 32)];
    $a = app(Checkout::class)->create(...$args);
    $b = app(Checkout::class)->create(...$args);
    expect($b->id)->toBe($a->id)->and($a->payment_state)->toBe('paid')->and($a->status)->toBe('processing')->and($a->total_paid)->toBe(100);
    expect(app(Ledger::class)->balance($user->id))->toBe(0)->and(DB::table('wallet_entries')->where('kind', 'payment')->count())->toBe(1)->and(DB::table('orders')->count())->toBe(1);
    $args[1] = 2;
    expect(fn () => app(Checkout::class)->create(...$args))->toThrow(HttpException::class);
});

it('C01 C02 C03 fails closed for foreign address empty stale cart unsupported payment insufficient wallet and unconfigured shipping', function () {
    F::rules();
    $user = User::factory()->create();
    $address = F::address($user);
    expect(fn () => app(Checkout::class)->create($user, 0, $address, 'post', 'cod', null, str_repeat('a', 32)))->toThrow(HttpException::class);
    $p = F::product();
    app(CartService::class)->replace($user, null, [['product_id' => $p, 'quantity' => 1]], 0);
    foreach ([['wallet', $address, 'post'], ['gateway', $address, 'post'], ['cod', F::address(User::factory()->create()), 'post'], ['cod', $address, 'unknown']] as [$method, $aid, $shipping]) {
        try {
            app(Checkout::class)->create($user, 1, $aid, $shipping, $method, null, bin2hex(random_bytes(16)));
            test()->fail('Invalid checkout accepted');
        } catch (ValidationException|HttpException) {
        }
    }
    expect(DB::table('orders')->count())->toBe(0)->and(DB::table('products')->where('id', $p)->value('stock'))->toBe(1000);
});

it('H07 COD is exempt from minute expiry with configured seven-day review deadline and card has thirty-minute deadline', function () {
    $this->freezeTime();
    F::rules();
    $user = User::factory()->create();
    $cod = F::order($user);
    $card = F::order($user, 'card_to_card');
    expect($cod->expires_at)->toBeNull()->and($cod->cod_review_at)->toBe(now('UTC')->addDays(7)->format('Y-m-d H:i:s'));
    expect($card->expires_at)->toBe(now('UTC')->addMinutes(30)->format('Y-m-d H:i:s'))->and($card->cod_review_at)->toBeNull();
    expect(fn () => DB::table('order_events')->where('order_id', $cod->id)->update(['action' => 'edited']))->toThrow(QueryException::class);
});
