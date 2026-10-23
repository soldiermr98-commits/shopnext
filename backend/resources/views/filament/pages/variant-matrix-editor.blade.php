<x-filament-panels::page>
    @if ($errors->any())<ul role="alert">@foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul>@endif
    @if ($notice)<p role="status">{{ $notice }}</p>@endif
    <p>یک تا چهار ویژگی؛ حداکثر ۱۰۰ ترکیب در هر بار و ۵۰۰ تنوع نگه‌داری‌شده برای محصول. ترکیب‌های موجود، حتی حذف‌شده، دوباره ساخته یا بازنویسی نمی‌شوند. موجودی اولیه صفر است.</p>
    <form wire:submit="generate">
        {{ $this->form }}
        <x-filament::button type="submit" wire:loading.attr="disabled" wire:confirm="ترکیب‌های جدید با قیمت واردشده و موجودی صفر ساخته شوند؟">تولید ماتریس</x-filament::button>
    </form>
    <a href="{{ \App\Filament\Pages\VariantEditor::getUrl(['product' => $productId]) }}">بازگشت به ویرایش تنوع‌ها</a>
</x-filament-panels::page>
