<x-filament-panels::page>
    @if ($errors->any())<ul role="alert">@foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul>@endif
    <form wire:submit="applyFilters">{{ $this->form }}<x-filament::button type="submit">جستجو و فیلتر</x-filament::button></form>
    @php($orders = $this->orders())
    <table><thead><tr><th>سفارش</th><th>مشتری</th><th>تلفن</th><th>وضعیت</th><th>پرداخت</th><th>ارسال</th><th>مبلغ (تومان)</th><th>تاریخ جلالی</th></tr></thead><tbody>
    @foreach ($orders as $order)
        <tr wire:key="order-{{ $order->id }}"><td><x-filament::button wire:click="select({{ $order->id }})">{{ $order->order_number }}</x-filament::button></td><td>{{ $order->customer_name }}</td><td>{{ \App\Support\Persian::digits($order->customer_phone) }}</td><td>{{ $order->status }}</td><td>{{ $order->payment_state }}</td><td>{{ $order->shipping_method_name }}</td><td>{{ \App\Support\Persian::digits($order->payable_total) }}</td><td>{{ \App\Filament\Support\AdminDate::display($order->created_at) }}</td></tr>
    @endforeach
    </tbody></table>{{ $orders->links() }}
    @php($detail = $this->detail())
    @if ($detail)
        <section aria-label="جزئیات سفارش">
            <x-filament::button wire:click="closeDetail">بستن جزئیات</x-filament::button>
            <h2>{{ $detail['order']->order_number }}</h2>
            <dl>@foreach (['subtotal'=>'جمع کالا', 'items_discount'=>'تخفیف کالا', 'coupon_discount'=>'تخفیف کوپن', 'shipping_fee'=>'ارسال', 'vat_amount'=>'مالیات', 'rounding_adjustment'=>'تعدیل گردکردن', 'payable_total'=>'قابل پرداخت', 'total_paid'=>'پرداخت واقعی'] as $field=>$label)<dt>{{ $label }}</dt><dd>{{ \App\Support\Persian::digits($detail['order']->{$field}) }} تومان</dd>@endforeach</dl>
            <h3>نشانی ثبت‌شده در سفارش</h3><dl>@foreach ($detail['address'] as $field=>$value)<dt>{{ $field }}</dt><dd>{{ $value }}</dd>@endforeach</dl>
            <h3>اقلام و تصویر ثابت قیمت در زمان خرید</h3>
            <table><thead><tr><th>کالا</th><th>شناسه</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead><tbody>@foreach ($detail['items'] as $item)<tr><td>{{ $item->title }}</td><td>{{ $item->sku }}</td><td>{{ \App\Support\Persian::digits($item->quantity) }}</td><td>{{ \App\Support\Persian::digits($item->unit_price) }}</td><td>{{ \App\Support\Persian::digits($item->line_total) }}</td></tr><tr><td colspan="5"><dl>@foreach ($item->snapshot as $field=>$value)<dt>{{ $field }}</dt><dd>{{ is_int($value) ? \App\Support\Persian::digits($value) : $value }}</dd>@endforeach</dl></td></tr>@endforeach</tbody></table>{{ $detail['items']->links() }}
            <h3>رویدادهای سفارش و عامل</h3><ol>@foreach ($detail['timeline'] as $event)<li>{{ $event->action }} — {{ $event->actor_name ?? $event->actor_role }} — {{ \App\Filament\Support\AdminDate::display($event->created_at) }} {{ $event->reason ?? '' }}</li>@endforeach</ol>{{ $detail['timeline']->links() }}
        </section>
    @endif
</x-filament-panels::page>
