<x-filament-panels::page>
    @if ($errors->any())<ul role="alert">@foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul>@endif
    @if ($notice)<p role="status">{{ $notice }}</p>@endif
    <p>موجودی قابل فروش، نه موجودی رزروشده سفارش. هر تغییر با دلیل و عامل در دفتر افزایشی ثبت می‌شود. موجودی مستقیم تنظیم نمی‌شود. عملیات گروهی کاملاً اتمیک است؛ کاهش بیش از موجودی، همهٔ ردیف‌ها را رد می‌کند. ارسال مجدد یک درخواست دوباره اعمال نمی‌شود؛ برای تغییر بعدی درخواست جدید بسازید.</p>
    <form wire:submit="adjustOne">{{ $this->form }}
        <x-filament::button type="submit" wire:loading.attr="disabled" wire:confirm="تعدیل تکی ثبت شود؟">تعدیل تکی</x-filament::button>
        <x-filament::button type="button" wire:click="adjustMany" wire:loading.attr="disabled" wire:confirm="تمام ردیف‌های انتخاب‌شده با همین تعداد و دلیل تعدیل شوند؟">تعدیل گروهی</x-filament::button>
        <x-filament::button type="button" wire:click="newRequest" wire:loading.attr="disabled">درخواست جدید</x-filament::button>
    </form>
    @php($entries = $this->ledger())
    <table><thead><tr><th>کالا/شناسه</th><th>تغییر</th><th>قبل</th><th>بعد</th><th>دلیل</th><th>عامل</th><th>تاریخ</th></tr></thead><tbody>
    @foreach ($entries as $entry)
        <tr><td>{{ $entry->title }} / {{ $entry->variant_sku ?? $entry->product_sku }}</td><td>{{ \App\Support\Persian::digits($entry->delta) }}</td><td>{{ \App\Support\Persian::digits($entry->before_stock) }}</td><td>{{ \App\Support\Persian::digits($entry->after_stock) }}</td><td>{{ $entry->reason }}</td><td>{{ $entry->actor_name }}</td><td>{{ \App\Filament\Support\AdminDate::display($entry->created_at) }}</td></tr>
    @endforeach
    </tbody></table>{{ $entries->links() }}
</x-filament-panels::page>
