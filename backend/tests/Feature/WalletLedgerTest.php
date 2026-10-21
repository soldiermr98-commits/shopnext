<?php

declare(strict_types=1);

use App\Financial\Ledger;
use App\Financial\Money;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(RefreshDatabase::class);

function walletOrder(User $user, array $attributes = []): int
{
    $key = bin2hex(random_bytes(16));

    return DB::table('orders')->insertGetId(array_replace(['user_id' => $user->id, 'order_number' => $key, 'tracking_code' => $key, 'customer_name' => 'Fixture', 'customer_phone' => $user->phone, 'shipping_address' => '{}', 'payment_method' => 'wallet', 'payable_total' => 100, 'status' => 'awaiting_payment', 'expires_at' => now()->addMinutes(30)], $attributes));
}

it('C03 reads authoritative append-only balance through User and authenticated identity not legacy snapshot', function () {
    $user = User::factory()->create();
    $admin = User::factory()->create(['role' => 'admin']);
    $ledger = app(Ledger::class);
    $ledger->credit($admin, $user->id, 123, 'initial', 'Approved fixture credit');
    expect(DB::table('users')->where('id', $user->id)->value('wallet_balance'))->toBe(0);
    expect($user->wallet_balance)->toBe(123)->and($ledger->balance($user->id))->toBe(123);
    $this->actingAs($user, 'web')->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.walletBalance', 123);
});

it('C01 C03 credit requires administrator authorization strict amounts replay identity and one transactional audit', function () {
    $user = User::factory()->create();
    $admin = User::factory()->create(['role' => 'admin']);
    $manager = User::factory()->create(['role' => 'shop_manager']);
    $ledger = app(Ledger::class);
    foreach ([$user, $manager, User::factory()->create(['role' => 'admin', 'is_active' => false]), User::factory()->create(['role' => 'super_admin', 'must_change_password' => true])] as $actor) {
        expect(fn () => $ledger->credit($actor, $user->id, 100, 'one', 'Fixture'))->toThrow(HttpException::class);
    }
    $id = $ledger->credit($admin, $user->id, 100, 'one', 'Fixture');
    expect($ledger->credit($admin, $user->id, 100, 'one', 'Fixture'))->toBe($id);
    expect(fn () => $ledger->credit($admin, $user->id, 101, 'one', 'Fixture'))->toThrow(ValidationException::class);
    expect(fn () => $ledger->credit($admin, $user->id, 100, 'one', 'Changed reason'))->toThrow(ValidationException::class);
    expect(fn () => $ledger->credit($admin, $user->id, 0, 'zero', 'Fixture'))->toThrow(ValidationException::class);
    expect(fn () => $ledger->credit($admin, $user->id, -1, 'negative', 'Fixture'))->toThrow(ValidationException::class);
    expect($ledger->balance($user->id))->toBe(100);
    expect(DB::table('activity_logs')->where('action', 'wallet_credit')->count())->toBe(1);
});

it('C03 wallet payment requires full balance and records an idempotent exact debit inside the caller transaction', function () {
    $user = User::factory()->create();
    $admin = User::factory()->create(['role' => 'admin']);
    $ledger = app(Ledger::class);
    $ledger->credit($admin, $user->id, 100, 'initial', 'Fixture');
    $order = walletOrder($user, ['payable_total' => 101]);
    expect(fn () => DB::transaction(fn () => $ledger->payLocked($user->id, $order)))->toThrow(ValidationException::class);
    expect($ledger->balance($user->id))->toBe(100)->and(DB::table('wallet_entries')->where('kind', 'payment')->count())->toBe(0);
    DB::table('orders')->where('id', $order)->update(['payable_total' => 100]);
    $id = DB::transaction(fn () => $ledger->payLocked($user->id, $order));
    expect(DB::transaction(fn () => $ledger->payLocked($user->id, $order)))->toBe($id);
    expect($ledger->balance($user->id))->toBe(0)->and(DB::table('wallet_entries')->where('kind', 'payment')->count())->toBe(1);
    // Primitive only: the order orchestrator, not Ledger, must atomically mark paid.
    expect(DB::table('orders')->where('id', $order)->value('payment_state'))->toBe('unpaid');
    expect(DB::table('wallet_entries')->where('id', $id)->value('delta'))->toBe(-100);
});

it('C03 refunds actual paid COD or card amount once to wallet not to a fictional bank gateway', function () {
    $user = User::factory()->create();
    $ledger = app(Ledger::class);
    $order = walletOrder($user, ['payment_method' => 'card_to_card', 'payment_state' => 'paid', 'total_paid' => 80, 'payable_total' => 100]);
    $id = DB::transaction(fn () => $ledger->refundLocked($user->id, $order));
    expect($ledger->balance($user->id))->toBe(80);
    DB::table('orders')->where('id', $order)->update(['payment_state' => 'refunded']);
    expect(DB::transaction(fn () => $ledger->refundLocked($user->id, $order)))->toBe($id);
    expect($ledger->balance($user->id))->toBe(80)->and(DB::table('wallet_entries')->where('kind', 'refund')->count())->toBe(1);
    $unpaid = walletOrder($user);
    expect(fn () => DB::transaction(fn () => $ledger->refundLocked($user->id, $unpaid)))->toThrow(ValidationException::class);
});

it('C04 wallet entries and audit roll back together on injected failure with no success or lost funds', function () {
    $user = User::factory()->create();
    $admin = User::factory()->create(['role' => 'admin']);
    $ledger = app(Ledger::class);
    ActivityLog::creating(function (): void {
        throw new RuntimeException('Injected audit failure');
    });
    try {
        expect(fn () => $ledger->credit($admin, $user->id, 100, 'failed', 'Fixture'))->toThrow(RuntimeException::class);
    } finally {
        ActivityLog::flushEventListeners();
    }
    expect($ledger->balance($user->id))->toBe(0)->and(DB::table('wallet_entries')->count())->toBe(0);
    $ledger->credit($admin, $user->id, 100, 'fund', 'Fixture');
    $order = walletOrder($user);
    expect(fn () => DB::transaction(function () use ($ledger, $user, $order): void {
        $ledger->payLocked($user->id, $order);
        throw new RuntimeException('Injected caller failure');
    }))->toThrow(RuntimeException::class);
    expect($ledger->balance($user->id))->toBe(100)->and(DB::table('wallet_entries')->where('kind', 'payment')->count())->toBe(0);
});

it('C02 C03 bounds the aggregate balance and does not append zero-value payment or refund entries', function () {
    $user = User::factory()->create();
    $admin = User::factory()->create(['role' => 'admin']);
    $ledger = app(Ledger::class);
    $ledger->credit($admin, $user->id, Money::MAX, 'max', 'Fixture');
    expect(fn () => $ledger->credit($admin, $user->id, 1, 'overflow', 'Fixture'))->toThrow(ValidationException::class);
    expect($ledger->balance($user->id))->toBe(Money::MAX);
    $order = walletOrder($user, ['payable_total' => 0]);
    expect(DB::transaction(fn () => $ledger->payLocked($user->id, $order)))->toBeNull();
    DB::table('orders')->where('id', $order)->update(['payment_state' => 'paid']);
    expect(DB::transaction(fn () => $ledger->refundLocked($user->id, $order)))->toBeNull();
    expect(DB::table('wallet_entries')->count())->toBe(1);
});

it('C03 rejects expired cancelled foreign and nonwallet orders without a debit', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $ledger = app(Ledger::class);
    foreach ([['expires_at' => now()->subHour()], ['status' => 'cancelled'], ['payment_method' => 'cod']] as $attributes) {
        $id = walletOrder($user, $attributes);
        expect(fn () => DB::transaction(fn () => $ledger->payLocked($user->id, $id)))->toThrow(ValidationException::class);
    }
    $id = walletOrder($other);
    expect(fn () => DB::transaction(fn () => $ledger->payLocked($user->id, $id)))->toThrow(HttpException::class);
    expect(DB::table('wallet_entries')->count())->toBe(0);
});
