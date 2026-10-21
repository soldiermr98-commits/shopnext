<?php

declare(strict_types=1);

namespace App\Financial;

use Illuminate\Support\Facades\DB;

final class OrderView
{
    public static function detail(object $order, ?array $timeline = null): array
    {
        $snapshot = $order->pricing_snapshot === null ? null : json_decode($order->pricing_snapshot, true, 512, JSON_THROW_ON_ERROR);

        return [
            'id' => $order->id, 'order_number' => $order->order_number, 'tracking_code' => $order->tracking_code,
            'status' => $order->status, 'payment_state' => $order->payment_state, 'payment_method' => $order->payment_method,
            'payable_total' => $order->payable_total, 'total_paid' => $order->total_paid, 'rounding_adjustment' => $order->rounding_adjustment,
            'unit' => 'TOMAN', 'invoice' => $snapshot, 'items' => $snapshot['lines'] ?? [],
            'shipping_address' => json_decode($order->shipping_address, true), 'created_at' => $order->created_at, 'expires_at' => $order->expires_at,
            'receipt_url' => $order->receipt_path === null ? null : '/api/orders/'.$order->id.'/receipt',
            'requires_admin_review' => $order->cod_flagged_at !== null && in_array($order->status, ['pending', 'processing'], true),
            'timeline' => $timeline ?? DB::table('order_events')->where('order_id', $order->id)->orderBy('id')->get(['action', 'actor_role', 'from_status', 'to_status', 'from_payment_state', 'to_payment_state', 'reason', 'created_at'])->toArray(),
        ];
    }
}
