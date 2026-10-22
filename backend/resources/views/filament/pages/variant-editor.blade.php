<x-filament-panels::page>
    @if ($errors->any())<ul role="alert">@foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul>@endif
    @if ($notice)<p role="status">{{ $notice }}</p>@endif
    <a href="{{ \App\Filament\Pages\VariantMatrixEditor::getUrl(['product' => $productId]) }}">تولید ماتریس تنوع</a>
    <x-filament::button type="button" wire:click="newVariant">تنوع جدید</x-filament::button>
    <form wire:submit="save">
        {{ $this->form }}
        <label for="variant-image">تصویر تنوع (PNG، JPEG یا WebP؛ حداکثر ۲ مگابایت)</label>
        <input id="variant-image" type="file" wire:model="imageUpload" accept="image/png,image/jpeg,image/webp" />
        <p>تنوع جدید موجودی صفر دارد. موجودی و هویت گزینه‌های ماتریس از این فرم تغییر نمی‌کنند.</p>
        <x-filament::button type="submit" wire:loading.attr="disabled">ذخیره تنوع</x-filament::button>
    </form>
    <x-filament::button type="button" color="gray" wire:click="toggleTrash">{{ $trashed ? 'نمایش تنوع‌های فعال' : 'نمایش سطل زباله' }}</x-filament::button>
    <table>
        <caption>فهرست تنوع‌ها</caption>
        <thead><tr><th scope="col">شناسه</th><th scope="col">گزینه‌ها</th><th scope="col">قیمت (تومان)</th><th scope="col">موجودی</th><th scope="col">تصویر</th><th scope="col">عملیات</th></tr></thead>
        <tbody>
        @forelse ($this->records as $variant)
            <tr wire:key="variant-{{ $variant->id }}">
                <td>{{ $variant->sku }}</td><td>@foreach ($variant->terms as $term)<span>{{ $term->attribute->name }}: {{ $term->name }}</span>@endforeach</td>
                <td>{{ \App\Support\Persian::digits(number_format($variant->price)) }}</td><td>{{ \App\Support\Persian::digits($variant->stock) }}</td>
                <td>@if ($variant->image && preg_match('#^/media/[a-f0-9]{48}\.png$#D', $variant->image))<img src="{{ $variant->image }}" alt="{{ $variant->sku }}" width="48" height="48" loading="lazy" />@endif</td>
                <td>
                @if ($trashed)
                    <x-filament::button type="button" wire:click="restore({{ $variant->id }})" wire:confirm="تنوع بازیابی شود؟">بازیابی</x-filament::button>
                @else
                    <x-filament::button type="button" wire:click="edit({{ $variant->id }})">ویرایش {{ $variant->sku }}</x-filament::button>
                    <x-filament::button type="button" color="danger" wire:click="delete({{ $variant->id }})" wire:confirm="تنوع به سطل زباله منتقل شود؟">حذف {{ $variant->sku }}</x-filament::button>
                @endif
                </td>
            </tr>
        @empty
            <tr><td colspan="6">تنوعی یافت نشد.</td></tr>
        @endforelse
        </tbody>
    </table>
    <nav aria-label="صفحه‌بندی تنوع‌ها">
        @if ($this->records->currentPage() > 1)<x-filament::button type="button" wire:click="previousPage">صفحه قبل</x-filament::button>@endif
        <span>صفحه {{ \App\Support\Persian::digits($this->records->currentPage()) }} از {{ \App\Support\Persian::digits($this->records->lastPage()) }}</span>
        @if ($this->records->hasMorePages())<x-filament::button type="button" wire:click="nextPage">صفحه بعد</x-filament::button>@endif
    </nav>
</x-filament-panels::page>
