<x-filament-panels::page>
    @if ($errors->any())<ul role="alert">@foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul>@endif
    @if ($notice)<p role="status">{{ $notice }}</p>@endif
    <p>ترتیب گالری را با کشیدن یا دکمه‌های جابه‌جایی تغییر دهید. تمام تغییرات با دکمه ذخیره ثبت می‌شوند.</p>
    <form wire:submit="save">
        {{ $this->form }}
        <label for="product-gallery-upload">افزودن یک تصویر امن به گالری (PNG، JPEG یا WebP؛ حداکثر ۲ مگابایت)</label>
        <input id="product-gallery-upload" type="file" wire:model="imageUpload" accept="image/png,image/jpeg,image/webp" />
        <p>تصویر انتخاب‌شده همراه محتوا ذخیره می‌شود. حذف از گالری، فایل مشترک را حذف نمی‌کند.</p>
        <x-filament::button type="submit" wire:loading.attr="disabled">ذخیره محتوا و تصویر انتخاب‌شده</x-filament::button>
        <x-filament::button type="button" color="gray" wire:click="reloadContent" wire:confirm="تغییرات ذخیره‌نشده کنار گذاشته شوند؟">بازخوانی از پایگاه داده</x-filament::button>
    </form>
</x-filament-panels::page>
