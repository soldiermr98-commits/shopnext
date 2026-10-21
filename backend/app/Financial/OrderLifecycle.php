<?php

declare(strict_types=1);

namespace App\Financial;

use App\Models\User;
use App\Support\Permissions;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

final class OrderLifecycle
{
    public function __construct(private readonly Ledger $ledger) {}

    public function act(User $actor, int $id, string $action, ?string $reason = null, ?string $receipt = null): object
    {
        return $this->change($actor, $id, $action, $reason, $receipt);
    }

    public function scheduled(int $id, string $action): object
    {
        if (! in_array($action, ['expire', 'flag_cod'], true)) {
            throw new \LogicException('Invalid scheduler action.');
        }

        return $this->change(null, $id, $action, null, null);
    }

    private function change(?User $actor, int $id, string $action, ?string $reason, ?string $receipt): object
    {
        if ($reason !== null && (trim($reason) === '' || mb_strlen($reason) > 200)) {
            $this->fail('دلیل عملیات باید بین یک تا ۲۰۰ نویسه باشد.');
        }

        return DB::transaction(function () use ($actor, $id, $action, $reason, $receipt): object {
            $ownerId = DB::table('orders')->where('id', $id)->value('user_id');
            abort_unless($ownerId, 404);
            $users = User::whereIn('id', array_filter([$ownerId, $actor?->id]))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            if ($actor) {
                abort_unless($users->has($actor->id), 403);
            }
            $actor = $actor ? $users->get($actor->id) : null;
            if ($actor) {
                abort_unless($actor->is_active && ! $actor->must_change_password, 403);
            }
            $order = DB::table('orders')->where('id', $id)->lockForUpdate()->first();
            abort_unless($order, 404);
            if ($order->idempotency_key === null) {
                $this->fail('سفارش قدیمی نیاز به بررسی مدیر دارد.');
            }
            $admin = $actor && Permissions::allows($actor, 'settings');
            $staff = $actor && Permissions::allows($actor, 'orders');
            $customer = $actor && $actor->role === 'customer' && $actor->id === $ownerId;
            $before = clone $order;
            $update = [];
            if ($action === 'cancel') {
                abort_unless($admin || $customer, 403);
                if ($order->status === 'cancelled') {
                    return $order;
                }
                if (! in_array($order->status, $admin ? ['pending', 'awaiting_payment', 'processing'] : ['pending', 'awaiting_payment'], true)) {
                    $this->fail('لغو در وضعیت فعلی مجاز نیست.');
                }
                if ($admin && $reason === null) {
                    $this->fail('دلیل لغو را ثبت کنید.');
                }
                if ($order->payment_state === 'paid') {
                    $this->ledger->refundLocked($ownerId, $id);
                    $update['payment_state'] = 'refunded';
                    $update['refunded_at'] = now('UTC');
                    $update['is_paid'] = false;
                }
                $this->release($order);
                $update['status'] = 'cancelled';
            } elseif ($action === 'refund') {
                abort_unless($admin, 403);
                if ($order->payment_state === 'refunded') {
                    return $order;
                }
                if ($reason === null || $order->payment_state !== 'paid' || ! in_array($order->status, ['processing', 'shipped', 'delivered'], true)) {
                    $this->fail('بازپرداخت در این وضعیت مجاز نیست؛ دلیل تأیید لازم است.');
                }
                $this->ledger->refundLocked($ownerId, $id);
                $this->release($order);
                $update = ['status' => 'refunded', 'payment_state' => 'refunded', 'is_paid' => false, 'refunded_at' => now('UTC')];
            } elseif ($action === 'paid') {
                abort_unless($admin, 403);
                if ($order->payment_state === 'paid') {
                    return $order;
                } // strict no-op, including shipped/delivered
                $this->live($order);
                if (in_array($order->status, ['cancelled', 'failed', 'refunded'], true) || $order->payment_state === 'refunded') {
                    $this->fail('این سفارش قابل پرداخت نیست.');
                }
                if ($order->payment_method === 'wallet') {
                    $this->ledger->payLocked($ownerId, $id);
                } elseif ($order->payment_method === 'card_to_card') {
                    if ($order->payment_state !== 'pending_verification' || $order->receipt_path === null || ! Storage::disk('local')->exists($order->receipt_path)) {
                        $this->fail('رسید معتبر در انتظار تأیید وجود ندارد.');
                    }
                } elseif ($order->payment_method !== 'cod') {
                    $this->fail('روش پرداخت قابل تأیید نیست.');
                }
                if ($order->coupon_id !== null) {
                    DB::table('coupons')->where('id', $order->coupon_id)->lockForUpdate()->first();
                    $usage = DB::table('coupon_usages')->where('order_id', $id)->lockForUpdate()->first();
                    if (! $usage || $usage->state !== 'reserved') {
                        $this->fail('رزرو کوپن معتبر نیست.');
                    }
                    DB::table('coupon_usages')->where('id', $usage->id)->update(['state' => 'redeemed', 'updated_at' => now('UTC')]);
                }
                $update = ['payment_state' => 'paid', 'is_paid' => true, 'total_paid' => $order->payable_total, 'paid_at' => now('UTC')];
                if (in_array($order->status, ['pending', 'awaiting_payment'], true)) {
                    $update['status'] = 'processing';
                }
            } elseif ($action === 'fail') {
                abort_unless($admin, 403);
                if ($order->status === 'failed') {
                    return $order;
                }
                if ($reason === null || ! in_array($order->status, ['pending', 'awaiting_payment'], true) || in_array($order->payment_state, ['paid', 'refunded'], true)) {
                    $this->fail('ثبت شکست پرداخت در این وضعیت مجاز نیست.');
                }
                $this->release($order);
                $update = ['status' => 'failed', 'payment_state' => 'failed'];
            } elseif ($action === 'receipt') {
                abort_unless($customer, 403);
                $this->live($order);
                if ($order->payment_method !== 'card_to_card' || $order->status !== 'awaiting_payment' || ! in_array($order->payment_state, ['unpaid', 'failed'], true) || $receipt === null || ! preg_match('/^receipts\/[a-f0-9]{48}\.png$/D', $receipt)) {
                    $this->fail('ارسال رسید در وضعیت فعلی مجاز نیست.');
                }
                if (! Storage::disk('local')->exists($receipt)) {
                    $this->fail('فایل رسید ذخیره نشده است.');
                }
                $update = ['receipt_path' => $receipt, 'payment_state' => 'pending_verification'];
            } elseif ($action === 'reject_receipt') {
                abort_unless($admin, 403);
                $this->live($order);
                if ($reason === null || $order->payment_state !== 'pending_verification') {
                    $this->fail('رسید قابل رد با دلیل معتبر وجود ندارد.');
                }
                $update['payment_state'] = 'failed';
            } elseif ($action === 'expire') {
                abort_unless($actor === null, 403);
                if ($order->payment_method === 'cod' || ! in_array($order->payment_state, ['unpaid', 'pending_verification', 'failed'], true) || ! in_array($order->status, ['pending', 'awaiting_payment'], true) || $order->expires_at === null || CarbonImmutable::parse($order->expires_at, 'UTC')->greaterThan(now('UTC'))) {
                    return $order;
                }
                $this->release($order);
                $update = ['status' => 'cancelled', 'payment_state' => 'failed'];
            } elseif ($action === 'flag_cod') {
                abort_unless($actor === null, 403);
                if ($order->payment_method !== 'cod' || ! in_array($order->status, ['pending', 'processing'], true) || $order->cod_flagged_at !== null || $order->cod_review_at === null || CarbonImmutable::parse($order->cod_review_at, 'UTC')->greaterThan(now('UTC'))) {
                    return $order;
                }
                $update['cod_flagged_at'] = now('UTC');
            } elseif (in_array($action, ['processing', 'shipped', 'delivered'], true)) {
                abort_unless($staff, 403);
                if ($order->status === $action) {
                    return $order;
                }
                $valid = match ($action) {
                    'processing' => $admin && $order->status === 'pending' && $order->payment_method === 'cod',
                    'shipped' => $order->status === 'processing' && ($order->payment_state === 'paid' || $order->payment_method === 'cod'),
                    'delivered' => $order->status === 'shipped',
                };
                if (! $valid) {
                    $this->fail('تغییر وضعیت سفارش مجاز نیست.');
                }
                $update['status'] = $action;
            } else {
                $this->fail('عملیات سفارش نامعتبر است.');
            }
            DB::table('orders')->where('id', $id)->update([...$update, 'updated_at' => now('UTC')]);
            $result = DB::table('orders')->where('id', $id)->first();
            OrderJournal::record($actor, $result, $action, $before, $reason);

            return $result;
        }, 5);
    }

    private function release(object $order): void
    {
        if ($order->stock_released_at !== null) {
            return;
        }
        if ($order->coupon_id !== null) {
            DB::table('coupons')->where('id', $order->coupon_id)->lockForUpdate()->first();
            $usage = DB::table('coupon_usages')->where('order_id', $order->id)->lockForUpdate()->first();
            if ($usage && $usage->state === 'reserved') {
                if (DB::table('coupons')->where('id', $order->coupon_id)->where('used_count', '>', 0)->decrement('used_count') !== 1) {
                    $this->fail('رزرو کوپن نیاز به بررسی دارد.');
                }
                DB::table('coupon_usages')->where('id', $usage->id)->update(['state' => 'released', 'updated_at' => now('UTC')]);
            }
        }
        $items = DB::table('order_items')->where('order_id', $order->id)->orderBy('product_id')->orderBy('product_variant_id')->get();
        DB::table('products')->whereIn('id', $items->pluck('product_id'))->orderBy('id')->lockForUpdate()->get();
        DB::table('product_variants')->whereIn('id', $items->pluck('product_variant_id')->filter())->orderBy('id')->lockForUpdate()->get();
        foreach ($items as $item) {
            $q = DB::table($item->product_variant_id === null ? 'products' : 'product_variants')->where('id', $item->product_variant_id ?? $item->product_id);
            if ($q->where('stock', '<=', 4294967295 - $item->quantity)->increment('stock', $item->quantity) !== 1) {
                $this->fail('بازگردانی موجودی نیاز به بررسی دارد.');
            }
        }
        DB::table('orders')->where('id', $order->id)->update(['stock_released_at' => now('UTC')]);
    }

    private function live(object $order): void
    {
        if ($order->expires_at !== null && CarbonImmutable::parse($order->expires_at, 'UTC')->lessThanOrEqualTo(now('UTC'))) {
            $this->fail('مهلت پرداخت سفارش به پایان رسیده است.');
        }
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['order' => $message]);
    }
}
