<x-filament-panels::page>
    @if ($errors->any())<ul role="alert">@foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul>@endif
    @if ($notice)<p role="status">{{ $notice }}</p>@endif
    <section aria-label="ویرایش ویژگی">
        <x-filament::button type="button" wire:click="newAttribute">ویژگی جدید</x-filament::button>
        <form wire:submit="save">
            {{ $this->form }}
            <p>نوع ویژگی دارای گزینه قابل تغییر نیست. رنگ و تصویر هر گزینه در صفحه گزینه‌ها ثبت می‌شود.</p>
            <x-filament::button type="submit" wire:loading.attr="disabled">ذخیره ویژگی</x-filament::button>
        </form>
    </section>
    <table>
        <caption>فهرست ویژگی‌ها</caption>
        <thead><tr><th scope="col">نام</th><th scope="col">نامک</th><th scope="col">نوع</th><th scope="col">تعداد گزینه</th><th scope="col">عملیات</th></tr></thead>
        <tbody>
            @forelse ($this->records as $attribute)
                <tr wire:key="attribute-{{ $attribute->id }}">
                    <td>{{ $attribute->name }}</td><td>{{ $attribute->slug }}</td><td>{{ ['select' => 'متنی', 'color' => 'رنگ', 'image' => 'تصویر'][$attribute->type] }}</td><td>{{ \App\Support\Persian::digits($attribute->terms_count) }}</td>
                    <td>
                        <x-filament::button type="button" wire:click="edit({{ $attribute->id }})" aria-label="ویرایش {{ $attribute->name }}">ویرایش</x-filament::button>
                        <a href="{{ url('/admin/attributes/'.$attribute->id.'/terms') }}" aria-label="گزینه‌های {{ $attribute->name }}">گزینه‌ها</a>
                        <x-filament::button type="button" color="danger" wire:click="delete({{ $attribute->id }})" wire:confirm="این ویژگی حذف شود؟" aria-label="حذف {{ $attribute->name }}">حذف</x-filament::button>
                    </td>
                </tr>
            @empty
                <tr><td colspan="5">ویژگی ثبت نشده است.</td></tr>
            @endforelse
        </tbody>
    </table>
    <nav aria-label="صفحه‌بندی ویژگی‌ها">
        @if ($this->records->currentPage() > 1)<x-filament::button type="button" wire:click="previousPage">صفحه قبل</x-filament::button>@endif
        <span>صفحه {{ \App\Support\Persian::digits($this->records->currentPage()) }} از {{ \App\Support\Persian::digits($this->records->lastPage()) }}</span>
        @if ($this->records->hasMorePages())<x-filament::button type="button" wire:click="nextPage">صفحه بعد</x-filament::button>@endif
    </nav>
</x-filament-panels::page>
