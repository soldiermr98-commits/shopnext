<?php

declare(strict_types=1);

use App\Financial\Ledger;
use App\Financial\OrderLifecycle;
use App\Jobs\ReviewOrders;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Support\FinancialFixtures as F;

uses(RefreshDatabase::class);

it('H07 C03 COD shipment delivery and repeated paid stay separate with no duplicate stock quota points or events', function () {
    $admin = F::rules();
    $user = User::factory()->create();
    $p = F::product();
    $order = F::order($user, 'cod', $p);
    $s = app(OrderLifecycle::class);
    expect(fn () => $s->act($admin, $order->id, 'delivered'))->toThrow(ValidationException::class);
    $s->act($admin, $order->id, 'processing');
    $s->act($admin, $order->id, 'shipped');
    $delivered = $s->act($admin, $order->id, 'delivered');
    expect($delivered->payment_state)->toBe('unpaid')->and($delivered->is_paid)->toBe(0);
    $paid = $s->act($admin, $order->id, 'paid');
    expect($paid->status)->toBe('delivered')->and($paid->total_paid)->toBe(100);
    $count = DB::table('order_events')->count();
    $s->act($admin, $order->id, 'paid');
    expect(DB::table('order_events')->count())->toBe($count)->and(DB::table('wallet_entries')->count())->toBe(0)->and(DB::table('products')->where('id', $p)->value('stock'))->toBe(999)->and($user->fresh()->club_points)->toBe(0);
});

it('C03 H07 unpaid cancellation releases quota and stock exactly once but paid refund retains consumed coupon', function () {
    $admin = F::rules();
    $user = User::factory()->create();
    $p = F::product();
    DB::table('coupons')->insert(['code' => 'ONE', 'type' => 'fixed', 'value' => 1, 'usage_limit' => 1, 'is_active' => true]);
    $a = F::order($user, 'cod', $p, 'ONE');
    $s = app(OrderLifecycle::class);
    $s->act($user, $a->id, 'cancel');
    $s->act($user, $a->id, 'cancel');
    expect(DB::table('products')->where('id', $p)->value('stock'))->toBe(1000)->and(DB::table('coupons')->value('used_count'))->toBe(0);
    $b = F::order($user, 'cod', $p, 'ONE');
    $s->act($admin, $b->id, 'paid');
    $s->act($admin, $b->id, 'shipped');
    expect(fn () => $s->act($admin, $b->id, 'cancel', 'Cannot cancel shipped'))->toThrow(ValidationException::class);
    $s->act($admin, $b->id, 'refund', 'Approved return');
    $s->act($admin, $b->id, 'refund', 'Repeated return');
    expect(app(Ledger::class)->balance($user->id))->toBe(99)->and(DB::table('products')->where('id', $p)->value('stock'))->toBe(1000)->and(DB::table('coupons')->value('used_count'))->toBe(1)->and(DB::table('coupon_usages')->where('order_id', $b->id)->value('state'))->toBe('redeemed');
});

it('C01 H07 only owner can cancel early and only administrator can cancel processing or approve payment', function () {
    $admin = F::rules();
    $user = User::factory()->create();
    $other = User::factory()->create();
    $manager = User::factory()->create(['role' => 'shop_manager']);
    $order = F::order($user);
    $s = app(OrderLifecycle::class);
    foreach ([$other, $manager] as $actor) {
        expect(fn () => $s->act($actor, $order->id, 'cancel', 'Wrong actor'))->toThrow(HttpException::class);
    }
    expect(fn () => $s->act($user, $order->id, 'paid'))->toThrow(HttpException::class);
    $s->act($admin, $order->id, 'processing');
    expect(fn () => $s->act($user, $order->id, 'cancel'))->toThrow(ValidationException::class);
    $s->act($admin, $order->id, 'cancel', 'Admin explicit cancellation');
    expect(fn () => $s->act($admin, $order->id, 'paid'))->toThrow(ValidationException::class);
    expect(fn () => $s->act($admin, $order->id, 'nonsense'))->toThrow(ValidationException::class);
});

it('C03 H07 card receipt must be verified by fresh administrator and rejection permits resubmission not fake success', function () {
    $admin = F::rules();
    $user = User::factory()->create();
    $order = F::order($user, 'card_to_card');
    $s = app(OrderLifecycle::class);
    expect(fn () => $s->act($admin, $order->id, 'paid'))->toThrow(ValidationException::class);
    $receipt = 'receipts/'.str_repeat('a', 48).'.png';
    $pending = $s->act($user, $order->id, 'receipt', receipt: $receipt);
    expect($pending->payment_state)->toBe('pending_verification');
    $s->act($admin, $order->id, 'reject_receipt', 'Not matching transfer');
    $s->act($user, $order->id, 'receipt', receipt: $receipt);
    $admin->forceFill(['is_active' => false])->save();
    expect(fn () => $s->act($admin, $order->id, 'paid'))->toThrow(HttpException::class);
    $admin->forceFill(['is_active' => true])->save();
    expect($s->act($admin, $order->id, 'paid')->payment_state)->toBe('paid');
});

it('H07 scheduled expiry releases unpaid including verification failed receipts but never paid or COD and flags COD after configured days once', function () {
    $this->freezeTime();
    $admin = F::rules(['expiry_minutes' => 5, 'cod_review_days' => 2]);
    $user = User::factory()->create();
    $p = F::product();
    $card = F::order($user, 'card_to_card', $p);
    $pending = F::order($user, 'card_to_card', $p);
    app(OrderLifecycle::class)->act($user, $pending->id, 'receipt', receipt: 'receipts/'.str_repeat('a', 48).'.png');
    $paid = F::order($user, 'cod', $p);
    app(OrderLifecycle::class)->act($admin, $paid->id, 'paid');
    $cod = F::order($user, 'cod', $p);
    $this->travel(6)->minutes();
    app(ReviewOrders::class)->handle(app(OrderLifecycle::class));
    expect(DB::table('orders')->where('id', $card->id)->value('status'))->toBe('cancelled')->and(DB::table('orders')->where('id', $pending->id)->value('status'))->toBe('cancelled')->and(DB::table('orders')->where('id', $paid->id)->value('payment_state'))->toBe('paid')->and(DB::table('orders')->where('id', $cod->id)->value('cod_flagged_at'))->toBeNull();
    $this->travel(3)->days();
    app(ReviewOrders::class)->handle(app(OrderLifecycle::class));
    $count = DB::table('order_events')->count();
    app(ReviewOrders::class)->handle(app(OrderLifecycle::class));
    expect(DB::table('order_events')->count())->toBe($count)->and(DB::table('orders')->where('id', $cod->id)->value('status'))->toBe('pending')->and(DB::table('orders')->where('id', $cod->id)->value('cod_flagged_at'))->not->toBeNull()->and(DB::table('products')->where('id', $p)->value('stock'))->toBe(998);
    app(OrderLifecycle::class)->act($admin, $cod->id, 'cancel', 'Unshipped COD reviewed');
    expect(DB::table('products')->where('id', $p)->value('stock'))->toBe(999);
});

it('C04 H07 transition failure rolls back refunded wallet stock state and timeline together', function () {
    $admin = F::rules();
    $user = User::factory()->create();
    $p = F::product();
    $order = F::order($user, 'cod', $p);
    $s = app(OrderLifecycle::class);
    $s->act($admin, $order->id, 'paid');
    $count = DB::table('order_events')->count();
    ActivityLog::creating(function (ActivityLog $log): void {
        if ($log->action === 'refund') {
            throw new RuntimeException('Injected refund audit failure');
        }
    });
    try {
        expect(fn () => $s->act($admin, $order->id, 'refund', 'Approved return'))->toThrow(RuntimeException::class);
    } finally {
        ActivityLog::flushEventListeners();
    }
    expect(DB::table('orders')->where('id', $order->id)->value('payment_state'))->toBe('paid')->and(DB::table('products')->where('id', $p)->value('stock'))->toBe(999)->and(app(Ledger::class)->balance($user->id))->toBe(0)->and(DB::table('order_events')->count())->toBe($count);
});
