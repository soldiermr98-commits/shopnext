<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Financial\CartService;
use App\Financial\Checkout;
use App\Financial\OrderLifecycle;
use App\Financial\OrderView;
use App\Financial\PricingService;
use App\Financial\Rules;
use App\Http\Requests\OrderRequest;
use App\Models\Order;
use App\Services\SafeUpload;
use App\Support\Permissions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

final class OrderController
{
    public function checkout(OrderRequest $r, Checkout $checkout)
    {
        Gate::authorize('checkout', Order::class);
        $d = $r->validated();
        $order = $checkout->create($r->user(), $d['version'], $d['address_id'], $d['shipping_method'], $d['payment_method'], $d['coupon'] ?? null, $d['idempotency_key']);

        return response()->json(['order' => OrderView::detail($order)], 201);
    }

    public function options(OrderRequest $r, Rules $rules)
    {
        Gate::authorize('checkout', Order::class);

        return response()->json(['addresses' => DB::table('addresses')->where('user_id', $r->user()->id)->orderBy('id')->get(['id', 'title', 'recipient_name', 'recipient_phone', 'province', 'city', 'postal_code', 'street_address', 'unit', 'zone_code']), 'shipping' => $rules->current()['shipping']]);
    }

    public function quote(OrderRequest $r, CartService $carts, PricingService $pricing)
    {
        Gate::authorize('checkout', Order::class);
        $d = $r->validated();
        $address = DB::table('addresses')->where('id', $d['address_id'])->where('user_id', $r->user()->id)->first();
        abort_unless($address, 404);
        $cart = $carts->view($r->user(), null);
        abort_unless($cart['version'] === $d['version'], 409, 'سبد تغییر کرده است.');

        return response()->json($pricing->quote($cart['items'], $d['coupon'] ?? null, $d['shipping_method'], $address->zone_code, $r->user()));
    }

    public function index(OrderRequest $r)
    {
        Gate::authorize('listOwn', Order::class);
        $page = DB::table('orders')->where('user_id', $r->user()->id)->orderByDesc('id')->paginate($r->integer('per_page', 20));
        $events = DB::table('order_events')->whereIn('order_id', $page->getCollection()->pluck('id'))->orderBy('id')->get(['order_id', 'action', 'actor_role', 'from_status', 'to_status', 'from_payment_state', 'to_payment_state', 'reason', 'created_at'])->groupBy('order_id');
        $page->setCollection($page->getCollection()->map(fn ($o) => OrderView::detail($o, ($events->get($o->id) ?? collect())->all())));

        return response()->json($page);
    }

    public function show(OrderRequest $r, string $order)
    {
        return response()->json(['order' => OrderView::detail($this->find($r, $order))]);
    }

    public function track(OrderRequest $r, string $code)
    {
        $o = DB::table('orders')->where('user_id', $r->user()->id)->where('tracking_code', $code)->first();
        abort_unless($o, 404);

        return response()->json(['order_number' => $o->order_number, 'status' => $o->status, 'payment_state' => $o->payment_state, 'created_at' => $o->created_at]);
    }

    public function cancel(OrderRequest $r, string $order, OrderLifecycle $service)
    {
        $o = $this->find($r, $order);
        Gate::authorize('cancel', $o);

        return response()->json(['order' => OrderView::detail($service->act($r->user(), $o->id, 'cancel', $r->validated('reason')))]);
    }

    public function action(OrderRequest $r, string $order, OrderLifecycle $service)
    {
        $o = $this->find($r, $order);
        Gate::authorize('operate', $o);

        return response()->json(['order' => OrderView::detail($service->act($r->user(), $o->id, $r->validated('action'), $r->validated('reason')))]);
    }

    public function receipt(OrderRequest $r, string $order, SafeUpload $uploads, OrderLifecycle $service)
    {
        $o = $this->find($r, $order);
        Gate::authorize('submitReceipt', $o);
        $name = $uploads->store($r->file('file'), 'receipts');
        try {
            $result = $service->act($r->user(), $o->id, 'receipt', receipt: 'receipts/'.$name);
        } catch (\Throwable $e) {
            Storage::disk('local')->delete('receipts/'.$name);
            throw $e;
        }

        return response()->json(['order' => OrderView::detail($result)]);
    }

    public function receiptFile(OrderRequest $r, string $order)
    {
        $o = $this->find($r, $order);
        Gate::authorize('readReceipt', $o);
        abort_unless($o->receipt_path && preg_match('/^receipts\/[a-f0-9]{48}\.png$/D', $o->receipt_path) && Storage::disk('local')->exists($o->receipt_path), 404);

        return response()->file(Storage::disk('local')->path($o->receipt_path), ['Content-Type' => 'image/png', 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }

    private function find(OrderRequest $r, string $id): Order
    {
        $q = Order::whereKey($id);
        if (! Permissions::allows($r->user(), 'orders')) {
            $q->where('user_id', $r->user()->id);
        }
        $o = $q->firstOrFail();
        Gate::authorize('view', $o);

        return $o;
    }
}
