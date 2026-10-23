<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Support\AdminCapabilities;
use App\Support\Persian;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/** Explicit projections: private file paths, arbitrary JSON and user secrets never reach Livewire. */
final class OrderAdminReads
{
    public const STATUSES = ['pending', 'awaiting_payment', 'processing', 'shipped', 'delivered', 'cancelled', 'failed', 'refunded'];

    public const PAYMENTS = ['unpaid', 'pending_verification', 'paid', 'failed', 'refunded'];

    public const METHODS = ['cod', 'wallet', 'card_to_card'];

    private const LIST_FIELDS = ['id', 'order_number', 'customer_name', 'customer_phone', 'tracking_code', 'status', 'payment_state', 'payment_method', 'shipping_method_id', 'shipping_method_name', 'payable_total', 'created_at'];

    private const SNAPSHOT_FIELDS = ['title', 'sku', 'quantity', 'unit_price', 'listed_subtotal', 'sale_discount', 'automatic_discount', 'coupon_discount', 'tax_amount', 'tax_added', 'rounding_adjustment', 'net_total', 'line_total'];

    public function listing(User $actor, array $filters): LengthAwarePaginator
    {
        $actor = app(AdminAccess::class)->authorize($actor, 'orders.view');
        $filters = Validator::make($filters, [
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:'.implode(',', self::STATUSES)],
            'payment_state' => ['nullable', 'in:'.implode(',', self::PAYMENTS)],
            'payment_method' => ['nullable', 'in:'.implode(',', self::METHODS)],
            'shipping_method_id' => ['nullable', 'string', 'max:64'],
            'from' => ['nullable', 'date_format:Y-m-d H:i:s'],
            'until' => array_merge(['nullable', 'date_format:Y-m-d H:i:s'], empty($filters['from']) ? [] : ['after_or_equal:from']),
        ], [
            'string' => 'متن معتبر وارد کنید.', 'max' => 'متن جستجو بیش از حد مجاز است.',
            'in' => 'گزینه معتبر انتخاب کنید.', 'date_format' => 'تاریخ معتبر انتخاب کنید.',
            'after_or_equal' => 'پایان بازه باید پس از شروع باشد.',
        ])->validate();
        $query = DB::table('orders')->select(self::LIST_FIELDS)->orderByDesc('id');
        foreach (['status', 'payment_state', 'payment_method', 'shipping_method_id'] as $field) {
            if (($filters[$field] ?? '') !== '' && ($filters[$field] ?? null) !== null) {
                $query->where($field, $filters[$field]);
            }
        }
        if (($filters['search'] ?? '') !== '' && ($filters['search'] ?? null) !== null) {
            $search = '%'.Persian::ascii($filters['search']).'%';
            $query->where(function ($query) use ($search): void {
                foreach (['order_number', 'customer_phone', 'customer_name', 'tracking_code'] as $field) {
                    $query->orWhere($field, 'like', $search);
                }
            });
        }
        if (! empty($filters['from'])) {
            $query->where('created_at', '>=', $filters['from']);
        }
        if (! empty($filters['until'])) {
            $query->where('created_at', '<=', $filters['until']);
        }
        $page = $query->paginate(30);
        foreach ($page as $order) {
            $this->mask($order, $actor);
        }

        return $page;
    }

    public function detail(User $actor, int $id): array
    {
        $actor = app(AdminAccess::class)->authorize($actor, 'orders.view');
        $full = AdminCapabilities::allows($actor, 'pii.full');
        $fields = array_merge(self::LIST_FIELDS, ['user_id', 'subtotal', 'items_discount', 'coupon_discount', 'shipping_fee', 'vat_amount', 'rounding_adjustment', 'total_paid']);
        if ($full) {
            $fields[] = 'shipping_address';
        }
        $order = DB::table('orders')->where('id', $id)->first($fields);
        abort_unless($order, 404);
        $this->mask($order, $actor);
        $address = $full ? $this->safeJson($order->shipping_address, ['title', 'recipient_name', 'recipient_phone', 'province', 'city', 'postal_code', 'street_address', 'unit', 'zone_code']) : ['masked' => 'نشانی برای این نقش پنهان است.'];
        unset($order->shipping_address);
        $items = DB::table('order_items')->where('order_id', $id)->orderBy('id')->paginate(50, ['id', 'title', 'sku', 'quantity', 'unit_price', 'line_total', 'tax_amount', 'snapshot'], 'itemsPage');
        foreach ($items as $item) {
            $item->snapshot = $this->safeJson($item->snapshot, self::SNAPSHOT_FIELDS);
        }
        $eventFields = ['id', 'action', 'actor_role', 'from_status', 'to_status', 'from_payment_state', 'to_payment_state', 'created_at'];
        if ($full) {
            $eventFields = array_merge($eventFields, ['actor_name', 'reason']);
        }
        $timeline = DB::table('order_events')->where('order_id', $id)->orderByDesc('id')->paginate(30, $eventFields, 'timelinePage');

        return ['order' => $order, 'address' => $address, 'items' => $items, 'timeline' => $timeline];
    }

    private function mask(object $order, User $actor): void
    {
        if (! AdminCapabilities::allows($actor, 'pii.full')) {
            $order->customer_phone = '*******'.mb_substr((string) $order->customer_phone, -4);
        }
    }

    private function safeJson(?string $json, array $fields): array
    {
        $data = json_decode($json ?? '{}', true);
        if (! is_array($data)) {
            return [];
        }

        return array_filter(array_intersect_key($data, array_flip($fields)), fn ($value): bool => is_scalar($value) || $value === null);
    }
}
