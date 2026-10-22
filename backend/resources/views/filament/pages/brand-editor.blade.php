<x-filament-panels::page>
    @if ($errors->any())
        <ul role="alert">@foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul>
    @endif
    @if ($notice)<p role="status">{{ $notice }}</p>@endif
    <section aria-label="ویرایش برند">
        <x-filament::button type="button" wire:click="newBrand">برند جدید</x-filament::button>
        <form wire:submit="save">
            {{ $this->form }}
            <label for="brand-logo">نشان برند (حداکثر ۲ مگابایت؛ PNG، JPEG یا WebP)</label>
            <input id="brand-logo" type="file" wire:model="imageUpload" accept="image/png,image/jpeg,image/webp" />
            <x-filament::button type="submit" wire:loading.attr="disabled">ذخیره برند</x-filament::button>
        </form>
    </section>
    <table>
        <caption>فهرست برندها</caption>
        <thead><tr><th scope="col">نام</th><th scope="col">نامک</th><th scope="col">کشور مبدأ</th><th scope="col">نمایندگی رسمی</th><th scope="col">نشان</th><th scope="col">عملیات</th></tr></thead>
        <tbody>
            @forelse ($this->records as $brand)
                <tr wire:key="brand-{{ $brand->id }}">
                    <td>{{ $brand->name }}</td><td>{{ $brand->slug }}</td><td>{{ $brand->origin_country ?: '—' }}</td><td>{{ $brand->is_official ? 'بله' : 'خیر' }}</td>
                    <td>@if ($brand->logo && preg_match('#^/media/[a-f0-9]{48}\.png$#D', $brand->logo))<img src="{{ $brand->logo }}" alt="{{ $brand->name }}" width="48" height="48" loading="lazy" />@endif</td>
                    <td>
                        <x-filament::button type="button" wire:click="edit({{ $brand->id }})" aria-label="ویرایش {{ $brand->name }}">ویرایش</x-filament::button>
                        <x-filament::button type="button" color="danger" wire:click="delete({{ $brand->id }})" wire:confirm="این برند حذف شود؟" aria-label="حذف {{ $brand->name }}">حذف</x-filament::button>
                    </td>
                </tr>
            @empty
                <tr><td colspan="6">برندی ثبت نشده است.</td></tr>
            @endforelse
        </tbody>
    </table>
    <nav aria-label="صفحه‌بندی برندها">
        @if ($this->records->currentPage() > 1)<x-filament::button type="button" wire:click="previousPage">صفحه قبل</x-filament::button>@endif
        <span>صفحه {{ \App\Support\Persian::digits($this->records->currentPage()) }} از {{ \App\Support\Persian::digits($this->records->lastPage()) }}</span>
        @if ($this->records->hasMorePages())<x-filament::button type="button" wire:click="nextPage">صفحه بعد</x-filament::button>@endif
    </nav>
</x-filament-panels::page>
