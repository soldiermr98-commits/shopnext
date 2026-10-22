<?php

declare(strict_types=1);

namespace App\Financial;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class Checkout
{
    public function __construct(private readonly PricingService $pricing, private readonly CartService $carts, private readonly Ledger $ledger, private readonly Rules $rules) {}

    public function create(User $actor, int $version, int $addressId, string $shipping, string $payment, ?string $coupon, string $key): object
    {
        if (! preg_match('/^[A-Za-z0-9_-]{16,64}$/D', $key) || ! in_array($payment, ['wallet', 'cod', 'card_to_card'], true) || $version < 0 || $version >= 4294967295) {
            $this->fail('درخواست ثبت سفارش نامعتبر است.');
        }
        $coupon = $coupon === null ? null : mb_strtoupper(trim($coupon), 'UTF-8');
        $hash = hash('sha256', json_encode([$version, $addressId, $shipping, $payment, $coupon], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($actor, $version, $addressId, $shipping, $payment, $coupon, $key, $hash): object {
            $owner = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            abort_unless($owner->is_active && $owner->role === 'customer' && ! $owner->must_change_password, 403);
            $cart = DB::table('carts')->where('user_id', $owner->id)->lockForUpdate()->first();
            // User row already serializes this owner's keys. This FIRST consistent read
            // occurs after that mutex; locking a MISSING unique-key range would
            // hold insertion gaps across buyers while waiting on the shared SKU.
            $existing = DB::table('orders')->where('user_id', $owner->id)->where('idempotency_key', $key)->first();
            if ($existing) {
                abort_unless($existing->idempotency_key === $key && hash_equals($existing->intent_hash, $hash), 409, 'شناسه تکرار درخواست با سفارش قبلی مطابقت ندارد.');

                return $existing;
            }
            abort_unless($cart && $cart->version === $version, 409, 'سبد تغییر کرده است؛ دوباره دریافت کنید.');
            $address = DB::table('addresses')->where('id', $addressId)->where('user_id', $owner->id)->sharedLock()->first();
            abort_unless($address, 404);
            $items = $this->carts->items($cart->id, true);
            if ($items === []) {
                $this->fail('سبد خرید خالی است.');
            }
            $quote = $this->pricing->quote($items, $coupon, $shipping, $address->zone_code, $owner, true);
            if (! $quote['checkout_ready'] || ($payment === 'cod' && ! $quote['shipping']['cod_allowed'])) {
                $this->fail('روش پرداخت یا ارسال برای این سفارش فعال نیست.');
            }
            $now = now('UTC');
            $rules = $this->rules->current(true);
            $addressSnapshot = array_intersect_key((array) $address, array_flip(['title', 'recipient_name', 'recipient_phone', 'province', 'city', 'postal_code', 'street_address', 'unit', 'zone_code']));
            $id = DB::table('orders')->insertGetId([
                'user_id' => $owner->id, 'idempotency_key' => $key, 'intent_hash' => $hash,
                'order_number' => 'SN-'.strtoupper(bin2hex(random_bytes(12))), 'tracking_code' => bin2hex(random_bytes(24)),
                'customer_name' => $owner->name, 'customer_phone' => $owner->phone, 'shipping_address' => json_encode($addressSnapshot, JSON_THROW_ON_ERROR),
                'status' => $payment === 'cod' ? 'pending' : 'awaiting_payment', 'payment_method' => $payment,
                'coupon_id' => $quote['coupon_id'], 'coupon_code' => $quote['coupon_code'],
                ...array_intersect_key($quote['totals'], array_flip(['subtotal', 'items_discount', 'coupon_discount', 'shipping_fee', 'vat_amount', 'payable_total', 'rounding_adjustment'])),
                'shipping_method_id' => $shipping, 'shipping_method_name' => $shipping,
                'pricing_snapshot' => json_encode($quote, JSON_THROW_ON_ERROR), 'items_count' => array_sum(array_column($quote['lines'], 'quantity')),
                'expires_at' => $payment === 'cod' ? null : $now->copy()->addMinutes($rules['expiry_minutes']),
                'cod_review_at' => $payment === 'cod' ? $now->copy()->addDays($rules['cod_review_days']) : null,
                'created_at' => $now, 'updated_at' => $now,
            ]);
            foreach ($quote['lines'] as $line) {
                DB::table('order_items')->insert([
                    'order_id' => $id, 'product_id' => $line['product_id'], 'product_variant_id' => $line['variant_id'],
                    'title' => $line['title'], 'sku' => $line['sku'], 'quantity' => $line['quantity'], 'unit_price' => $line['unit_price'],
                    'line_total' => $line['line_total'], 'tax_amount' => $line['tax_amount'], 'snapshot' => json_encode($line, JSON_THROW_ON_ERROR),
                    'created_at' => $now, 'updated_at' => $now,
                ]);
                $table = $line['variant_id'] === null ? 'products' : 'product_variants';
                $skuId = $line['variant_id'] ?? $line['product_id'];
                if (DB::table($table)->where('id', $skuId)->where('stock', '>=', $line['quantity'])->decrement('stock', $line['quantity']) !== 1) {
                    $this->fail('موجودی کالا کافی نیست.');
                }
            }
            if ($quote['coupon_id'] !== null) {
                $capacity = DB::table('coupons')->where('id', $quote['coupon_id']);
                if ($capacity->where(fn ($q) => $q->whereNull('usage_limit')->orWhereColumn('used_count', '<', 'usage_limit'))->increment('used_count') !== 1) {
                    $this->fail('سقف استفاده از کوپن تکمیل شده است.');
                }
                DB::table('coupon_usages')->insert(['coupon_id' => $quote['coupon_id'], 'user_id' => $owner->id, 'order_id' => $id, 'state' => 'reserved', 'created_at' => $now, 'updated_at' => $now]);
            }
            $order = DB::table('orders')->where('id', $id)->first();
            OrderJournal::record($owner, $order, 'created');
            $method = $payment === 'wallet' ? new WalletPayment : new ManualPayment;
            if ($method->beginLocked($order, $this->ledger)) {
                $before = clone $order;
                DB::table('orders')->where('id', $id)->update(['payment_state' => 'paid', 'status' => 'processing', 'is_paid' => true, 'total_paid' => $order->payable_total, 'paid_at' => $now, 'updated_at' => $now]);
                DB::table('coupon_usages')->where('order_id', $id)->update(['state' => 'redeemed', 'updated_at' => $now]);
                $order = DB::table('orders')->where('id', $id)->first();
                OrderJournal::record($owner, $order, 'paid', $before);
            }
            DB::table('cart_items')->where('cart_id', $cart->id)->delete();
            DB::table('carts')->where('id', $cart->id)->update(['version' => $version + 1, 'updated_at' => $now]);

            return $order;
        }, 5);
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['checkout' => $message]);
    }
}
