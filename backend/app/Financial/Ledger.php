<?php

declare(strict_types=1);

namespace App\Financial;

use App\Models\ActivityLog;
use App\Models\User;
use App\Support\Permissions;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** The ledger is authoritative. All mutations serialize on the user's row. */
final class Ledger
{
    public function balance(int $userId, bool $locked = false): int
    {
        if ($locked) {
            $this->requireTransaction();
            User::whereKey($userId)->lockForUpdate()->firstOrFail();
        }
        $row = DB::table('wallet_entries')->where('user_id', $userId)->selectRaw('COALESCE(SUM(delta), 0) AS balance')->when($locked, fn ($q) => $q->lockForUpdate())->first();

        return Money::bounded((string) $row->balance);
    }

    public function credit(User $actor, int $userId, int $amount, string $key, string $reason): ?int
    {
        Money::integer($amount);
        if ($amount === 0 || ! preg_match('/^[A-Za-z0-9_-]{1,64}$/D', $key) || trim($reason) === '' || mb_strlen($reason) > 200) {
            $this->fail('درخواست اعتبار کیف پول نامعتبر است.');
        }
        abort_unless(Permissions::allows($actor, 'settings'), 403);

        return DB::transaction(function () use ($actor, $userId, $amount, $key, $reason): int {
            // Sorted actor/owner locks also prevent staff-credit cross-account deadlocks.
            $users = User::whereIn('id', [$actor->id, $userId])->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            abort_unless(isset($users[$actor->id]) && Permissions::allows($users[$actor->id], 'settings'), 403);
            abort_unless(isset($users[$userId]), 404);
            $entryKey = 'credit:'.$actor->id.':'.$key;
            $existing = $this->existing($entryKey, $userId, $amount, 'credit', null, $reason);
            if ($existing !== null) {
                return $existing;
            }
            $before = $this->balance($userId, true);
            $after = Money::add($before, $amount);
            $id = $this->append($userId, $amount, 'credit', null, $entryKey, $reason);
            (new ActivityLog)->forceFill([
                'user_id' => $actor->id, 'user_name' => $users[$actor->id]->name, 'user_role' => $users[$actor->id]->role,
                'action' => 'wallet_credit', 'module' => 'wallet_entries', 'subject_id' => (string) $id,
                'changed_fields' => ['delta'], 'before' => ['balance' => $before], 'after' => ['balance' => $after, 'delta' => $amount],
                'ip_address' => request()->ip(),
            ])->save();

            return $id;
        }, 5);
    }

    /** Called only inside the order transaction; does not itself mark an order paid. */
    public function payLocked(int $userId, int $orderId): ?int
    {
        $order = $this->order($userId, $orderId);
        $amount = Money::integer((int) $order->payable_total);
        if ($order->payment_method !== 'wallet') {
            $this->fail('روش پرداخت این سفارش کیف پول نیست.');
        }
        $key = 'wallet:payment:'.$orderId;
        $existing = $this->existing($key, $userId, -$amount, 'payment', $orderId, 'Order payment');
        if ($existing !== null) {
            return $existing;
        }
        if ($order->payment_state !== 'unpaid' || ! in_array($order->status, ['pending', 'awaiting_payment'], true) || ($order->expires_at !== null && CarbonImmutable::parse($order->expires_at, 'UTC')->lessThanOrEqualTo(now('UTC')))) {
            $this->fail('این سفارش قابل پرداخت نیست.');
        }
        if ($this->balance($userId, true) < $amount) {
            $this->fail('موجودی کیف پول برای پرداخت کامل کافی نیست.');
        }

        return $amount === 0 ? null : $this->append($userId, -$amount, 'payment', $orderId, $key, 'Order payment');
    }

    /** Credits actual recorded payment, including manually paid COD/card orders. */
    public function refundLocked(int $userId, int $orderId): ?int
    {
        $order = $this->order($userId, $orderId);
        $amount = Money::integer((int) $order->total_paid);
        if (! in_array($order->payment_state, ['paid', 'refunded'], true)) {
            $this->fail('سفارش پرداخت‌شده‌ای برای بازپرداخت وجود ندارد.');
        }
        $key = 'wallet:refund:'.$orderId;
        $existing = $this->existing($key, $userId, $amount, 'refund', $orderId, 'Order refund');
        if ($existing !== null) {
            return $existing;
        }
        if ($order->payment_state === 'refunded' && $amount !== 0) {
            $this->fail('سند بازپرداخت سفارش یافت نشد.');
        }
        Money::add($this->balance($userId, true), $amount);

        return $amount === 0 ? null : $this->append($userId, $amount, 'refund', $orderId, $key, 'Order refund');
    }

    private function order(int $userId, int $orderId): object
    {
        $this->requireTransaction();
        User::whereKey($userId)->lockForUpdate()->firstOrFail();
        $order = DB::table('orders')->where('id', $orderId)->where('user_id', $userId)->lockForUpdate()->first();
        abort_unless($order, 404);

        return $order;
    }

    private function existing(string $key, int $userId, int $delta, string $kind, ?int $orderId, string $reason): ?int
    {
        $row = DB::table('wallet_entries')->where('idempotency_key', $key)->lockForUpdate()->first();
        if (! $row) {
            return null;
        }
        if ($row->idempotency_key !== $key || $row->user_id !== $userId || $row->delta !== $delta || $row->kind !== $kind || $row->order_id !== $orderId || $row->reason !== $reason) {
            $this->fail('شناسه تکرار درخواست با اطلاعات قبلی مطابقت ندارد.');
        }

        return $row->id;
    }

    private function append(int $userId, int $delta, string $kind, ?int $orderId, string $key, string $reason): int
    {
        return DB::table('wallet_entries')->insertGetId(['user_id' => $userId, 'order_id' => $orderId, 'delta' => $delta, 'kind' => $kind, 'idempotency_key' => $key, 'reason' => $reason, 'created_at' => now('UTC')]);
    }

    private function requireTransaction(): void
    {
        if (DB::transactionLevel() < 1) {
            throw new \LogicException('Wallet mutation requires an enclosing transaction.');
        }
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['wallet' => $message]);
    }
}
