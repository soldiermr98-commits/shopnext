<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Financial\OrderLifecycle;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

/** Bounded work; every selected row is revalidated while locked by the lifecycle. */
final class ReviewOrders implements ShouldQueue
{
    use Queueable;

    public int $timeout = 35;

    public int $tries = 3;

    public function handle(OrderLifecycle $orders): void
    {
        DB::table('orders')->whereNotNull('idempotency_key')->whereIn('status', ['pending', 'awaiting_payment'])->where('payment_method', '<>', 'cod')->whereIn('payment_state', ['unpaid', 'pending_verification', 'failed'])->where('expires_at', '<=', now('UTC'))->orderBy('id')->limit(100)->pluck('id')->each(fn (int $id) => $orders->scheduled($id, 'expire'));
        DB::table('orders')->whereNotNull('idempotency_key')->where('payment_method', 'cod')->whereIn('status', ['pending', 'processing'])->whereNull('cod_flagged_at')->where('cod_review_at', '<=', now('UTC'))->orderBy('id')->limit(100)->pluck('id')->each(fn (int $id) => $orders->scheduled($id, 'flag_cod'));
    }
}
