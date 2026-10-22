<x-filament-panels::page>
    <a href="{{ url('/admin/attributes') }}">بازگشت به ویژگی‌ها</a>
    <p>گزینه‌های {{ $this->attributeRecord->name }} — نوع: {{ ['select' => 'متنی', 'color' => 'رنگ', 'image' => 'تصویر'][$this->attributeRecord->type] }}</p>
    @if ($errors->any())<ul role="alert">@foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul>@endif
    @if ($notice)<p role="status">{{ $notice }}</p>@endif
    <section aria-label="ویرایش گزینه">
        <x-filament::button type="button" wire:click="newTerm">گزینه جدید</x-filament::button>
        <form wire:submit="save">
            {{ $this->form }}
            <p>رنگ برای ویژگی رنگی و تصویر برای ویژگی تصویری الزامی است. رنگ سه یا شش رقم هگز مانند #ABC یا #AABBCC است.</p>
            <label for="term-image">تصویر گزینه (PNG، JPEG یا WebP؛ حداکثر ۲ مگابایت و ۲۰۴۸ پیکسل)</label>
            <input id="term-image" type="file" wire:model="imageUpload" accept="image/png,image/jpeg,image/webp" />
            <x-filament::button type="submit" wire:loading.attr="disabled">ذخیره گزینه</x-filament::button>
        </form>
    </section>
    <table>
        <caption>فهرست گزینه‌ها</caption>
        <thead><tr><th scope="col">نام</th><th scope="col">نامک</th><th scope="col">رنگ</th><th scope="col">تصویر</th><th scope="col">ترتیب</th><th scope="col">عملیات</th></tr></thead>
        <tbody>
            @forelse ($this->records as $term)
                <tr wire:key="term-{{ $term->id }}">
                    <td>{{ $term->name }}</td><td>{{ $term->slug }}</td>
                    <td>@if ($term->hex && preg_match('/^#[0-9A-F]{6}$/iD', $term->hex))<span style="display:inline-block;width:1.5rem;height:1.5rem;border:1px solid currentColor;background-color:{{ $term->hex }}" role="img" aria-label="رنگ {{ $term->name }} {{ $term->hex }}"></span> <bdi dir="ltr">{{ $term->hex }}</bdi>@else — @endif</td>
                    <td>@if ($term->image && preg_match('#^/media/[a-f0-9]{48}\.png$#D', $term->image))<img src="{{ $term->image }}" alt="{{ $term->name }}" width="48" height="48" loading="lazy" />@endif</td>
                    <td>{{ \App\Support\Persian::digits($term->order_index) }}</td>
                    <td>
                        <x-filament::button type="button" wire:click="edit({{ $term->id }})" aria-label="ویرایش {{ $term->name }}">ویرایش</x-filament::button>
                        <x-filament::button type="button" color="danger" wire:click="delete({{ $term->id }})" wire:confirm="این گزینه حذف شود؟" aria-label="حذف {{ $term->name }}">حذف</x-filament::button>
                    </td>
                </tr>
            @empty
                <tr><td colspan="6">گزینه‌ای ثبت نشده است.</td></tr>
            @endforelse
        </tbody>
    </table>
    <nav aria-label="صفحه‌بندی گزینه‌ها">
        @if ($this->records->currentPage() > 1)<x-filament::button type="button" wire:click="previousPage">صفحه قبل</x-filament::button>@endif
        <span>صفحه {{ \App\Support\Persian::digits($this->records->currentPage()) }} از {{ \App\Support\Persian::digits($this->records->lastPage()) }}</span>
        @if ($this->records->hasMorePages())<x-filament::button type="button" wire:click="nextPage">صفحه بعد</x-filament::button>@endif
    </nav>
</x-filament-panels::page>
