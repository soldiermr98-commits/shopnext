<x-filament-panels::page>
    @if ($errors->any())<ul role="alert">@foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul>@endif
    @if ($notice)<p role="status">{{ $notice }}</p>@endif
    <p>حداکثر ۵۰ محصول. قیمت اصلی، تخفیف و فروش ویژهٔ محصول و تنوع‌های فعال با نسبت دقیق و گردکردن صحیح تغییر می‌کنند؛ سقف هر عملیات ۱۰۰۰ ردیف است. موجودی تغییر نمی‌کند.</p>
    <form wire:submit="applyPrices">
        {{ $this->form }}
        <x-filament::button type="submit" wire:loading.attr="disabled" wire:confirm="قیمت محصول‌ها و تنوع‌های فعال انتخاب‌شده تغییر کند؟">اعمال درصد قیمت</x-filament::button>
        <p>هشدار: جایگزینی دسته‌ها، دسته‌های قبلی محصول‌های انتخاب‌شده را حذف می‌کند. انتخاب خالی، همهٔ دسته‌های آن‌ها را پاک می‌کند.</p>
        <x-filament::button type="button" color="warning" wire:click="applyCategories" wire:loading.attr="disabled" wire:confirm="دسته‌های محصول‌های انتخاب‌شده با همین انتخاب جایگزین شوند؟ انتخاب خالی همهٔ دسته‌های آن‌ها را پاک می‌کند.">جایگزینی دسته‌ها</x-filament::button>
    </form>
</x-filament-panels::page>
