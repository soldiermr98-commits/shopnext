<?php

declare(strict_types=1);

use App\Financial\CartService;
use App\Financial\Ledger;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Support\Facades\DB;
use Tests\Support\FinancialFixtures as F;
use Tests\Support\FinancialRace;

// Deliberately NOT RefreshDatabase: children must see committed fixtures.
beforeEach(function () {
    if (! app()->environment('testing') || ! str_contains((string) config('database.connections.mysql.database'), '_test')) {
        throw new RuntimeException('Dedicated test database required.');
    }
    $this->artisan('migrate:fresh', ['--force' => true])->assertExitCode(0);
});
afterEach(function () {
    $this->artisan('migrate:fresh', ['--force' => true])->assertExitCode(0);
    RefreshDatabaseState::$migrated = true;
});

function checkoutRacers(int $product, int $count, ?string $coupon = null): array
{
    $inputs = [];
    for ($i = 0; $i < $count; $i++) {
        $u = User::factory()->create();
        app(CartService::class)->replace($u, null, [['product_id' => $product, 'quantity' => 1]], 0);
        $inputs[] = ['kind' => 'checkout', 'actor' => $u->id, 'gate_owner' => $u->id, 'version' => 1, 'address' => F::address($u), 'payment' => 'cod', 'coupon' => $coupon, 'key' => bin2hex(random_bytes(16))];
    }

    return $inputs;
}

it('C04 REAL parallel eight buyers of last stock yield exactly one order and no oversell', function () {
    F::rules();
    $p = F::product(['stock' => 1]);
    $r = FinancialRace::run('last_stock', checkoutRacers($p, 8));
    expect(array_count_values(array_column($r, 'status'))['success'])->toBe(1)->and(DB::table('orders')->count())->toBe(1)->and(DB::table('products')->where('id', $p)->value('stock'))->toBe(0);
});

it('H06 REAL parallel eight coupon orders with quota three yield exactly three reservations', function () {
    F::rules();
    $p = F::product();
    DB::table('coupons')->insert(['code' => 'RACE', 'type' => 'fixed', 'value' => 1, 'usage_limit' => 3, 'is_active' => true]);
    $r = FinancialRace::run('coupon_capacity', checkoutRacers($p, 8, 'RACE'));
    expect(array_count_values(array_column($r, 'status'))['success'])->toBe(3)->and(DB::table('orders')->count())->toBe(3)->and(DB::table('coupon_usages')->where('state', 'reserved')->count())->toBe(3)->and(DB::table('coupons')->value('used_count'))->toBe(3)->and(DB::table('products')->where('id', $p)->value('stock'))->toBe(997);
});

it('C03 REAL simultaneous payments of distinct pending wallet orders never spend one balance twice', function () {
    $admin = F::rules();
    $u = User::factory()->create();
    app(Ledger::class)->credit($admin, $u->id, 100, 'fund', 'Fixture');
    $inputs = [];
    for ($i = 0; $i < 6; $i++) {
        // Persisted pending-wallet fixtures isolate the payment race, not cart-version
        // rejection. Separate administrators avoid accidental actor-only serialization.
        $actor = User::factory()->create(['role' => 'admin']);
        $key = bin2hex(random_bytes(16));
        $id = DB::table('orders')->insertGetId(['user_id' => $u->id, 'idempotency_key' => $key, 'intent_hash' => hash('sha256', $key), 'order_number' => $key, 'tracking_code' => $key, 'customer_name' => 'Wallet race fixture', 'customer_phone' => $u->phone, 'shipping_address' => '{}', 'payment_method' => 'wallet', 'payable_total' => 100, 'status' => 'awaiting_payment', 'expires_at' => now()->addHour()]);
        $inputs[] = ['kind' => 'action', 'actor' => $actor->id, 'gate_owner' => $u->id, 'order' => $id, 'action' => 'paid'];
    }
    $r = FinancialRace::run('wallet_spend', $inputs);
    expect(array_count_values(array_column($r, 'status'))['success'])->toBe(1)->and(app(Ledger::class)->balance($u->id))->toBe(0)->and(DB::table('wallet_entries')->where('kind', 'payment')->count())->toBe(1)->and(DB::table('orders')->where('payment_state', 'paid')->count())->toBe(1);
});

it('C03 H07 REAL parallel double mark-paid is strict no-op after the first payment event', function () {
    $admin = F::rules();
    $u = User::factory()->create();
    $p = F::product();
    $o = F::order($u, 'cod', $p);
    $r = FinancialRace::run('mark_paid', array_fill(0, 6, ['kind' => 'action', 'actor' => $admin->id, 'gate_owner' => $u->id, 'order' => $o->id, 'action' => 'paid']));
    expect(array_count_values(array_column($r, 'status'))['success'])->toBe(6)->and(DB::table('order_events')->where('action', 'paid')->count())->toBe(1)->and(DB::table('products')->where('id', $p)->value('stock'))->toBe(999)->and(DB::table('wallet_entries')->count())->toBe(0);
});

it('C03 C04 H07 REAL concurrent customer cancel and admin pay linearize without paid cancelled or duplicate release', function () {
    $admin = F::rules();
    $u = User::factory()->create();
    $p = F::product();
    $o = F::order($u, 'cod', $p);
    $r = FinancialRace::run('cancel_pay', [['kind' => 'action', 'actor' => $u->id, 'gate_owner' => $u->id, 'order' => $o->id, 'action' => 'cancel'], ['kind' => 'action', 'actor' => $admin->id, 'gate_owner' => $u->id, 'order' => $o->id, 'action' => 'paid']]);
    $o = DB::table('orders')->where('id', $o->id)->first();
    expect(array_count_values(array_column($r, 'status'))['success'])->toBe(1);
    if ($o->status === 'cancelled') {
        expect($o->payment_state)->toBe('unpaid')->and(DB::table('products')->where('id', $p)->value('stock'))->toBe(1000);
    } else {
        expect($o->status)->toBe('processing')->and($o->payment_state)->toBe('paid')->and(DB::table('products')->where('id', $p)->value('stock'))->toBe(999);
    }
    expect(DB::table('order_events')->whereIn('action', ['paid', 'cancel'])->count())->toBe(1);
});
