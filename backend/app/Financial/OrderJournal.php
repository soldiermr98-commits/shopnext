<?php

declare(strict_types=1);

namespace App\Financial;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class OrderJournal
{
    public static function record(?User $actor, object $order, string $action, ?object $before = null, ?string $reason = null): void
    {
        if (DB::transactionLevel() < 1) {
            throw new \LogicException('Order journal requires a transaction.');
        }
        DB::table('order_events')->insert([
            'order_id' => $order->id, 'actor_user_id' => $actor?->id,
            'actor_name' => $actor?->name ?? 'Scheduler', 'actor_role' => $actor?->role ?? 'system',
            'action' => $action, 'from_status' => $before?->status, 'to_status' => $order->status,
            'from_payment_state' => $before?->payment_state, 'to_payment_state' => $order->payment_state,
            'reason' => $reason, 'created_at' => now('UTC'),
        ]);
        // Explicit audit: query-builder financial writes do not invoke model observers.
        (new ActivityLog)->forceFill([
            'user_id' => $actor?->id, 'user_name' => $actor?->name ?? 'Scheduler', 'user_role' => $actor?->role ?? 'system',
            'action' => $action, 'module' => 'orders', 'subject_id' => (string) $order->id,
            'changed_fields' => ['status', 'payment_state'],
            'before' => ['status' => $before?->status, 'payment_state' => $before?->payment_state],
            'after' => ['status' => $order->status, 'payment_state' => $order->payment_state], 'ip_address' => $actor ? request()->ip() : null,
        ])->save();
    }
}
