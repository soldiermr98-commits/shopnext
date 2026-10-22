<x-filament-panels::page>
    @if ($errors->any())
        <ul role="alert">
            @foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach
        </ul>
    @endif
    @if ($notice)<p role="status">{{ $notice }}</p>@endif

    <section aria-label="ویرایش دسته‌بندی">
        <x-filament::button type="button" wire:click="newCategory">دسته جدید</x-filament::button>
        <form wire:submit="save">
            {{ $this->form }}
            <label for="category-image">تصویر دسته (حداکثر ۲ مگابایت؛ PNG، JPEG یا WebP)</label>
            <input id="category-image" type="file" wire:model="imageUpload" accept="image/png,image/jpeg,image/webp" />
            <x-filament::button type="submit" wire:loading.attr="disabled">ذخیره دسته‌بندی</x-filament::button>
        </form>
    </section>

    <section aria-label="درخت دسته‌بندی">
        <x-filament::button type="button" wire:click="openChildren(null)">نمایش ریشه درخت</x-filament::button>
        @if ($parentId)
            <p>زیرمجموعه دسته شماره {{ \App\Support\Persian::digits($parentId) }}</p>
        @endif
        <p>هر صفحه ۳۰ دسته؛ جابجایی هم‌سطح برای سطوح حداکثر ۵۰۰ دسته.</p>
        <table>
            <caption>دسته‌های این سطح درخت</caption>
            <thead><tr><th scope="col">عنوان</th><th scope="col">نامک</th><th scope="col">تصویر</th><th scope="col">عملیات</th></tr></thead>
            <tbody>
                @forelse ($this->records as $category)
                    <tr wire:key="category-{{ $category->id }}">
                        <td>{{ $category->title }}</td>
                        <td>{{ $category->slug }}</td>
                        <td>@if ($category->image && preg_match('#^/media/[a-f0-9]{48}\.png$#D', $category->image))<img src="{{ $category->image }}" alt="{{ $category->title }}" width="48" height="48" loading="lazy" />@endif</td>
                        <td>
                            <x-filament::button type="button" wire:click="edit({{ $category->id }})" aria-label="ویرایش {{ $category->title }}">ویرایش</x-filament::button>
                            <x-filament::button type="button" wire:click="openChildren({{ $category->id }})" aria-label="زیرمجموعه‌های {{ $category->title }}">زیرمجموعه‌ها</x-filament::button>
                            <x-filament::button type="button" wire:click="move({{ $category->id }}, -1)" aria-label="بالابردن {{ $category->title }}">بالا</x-filament::button>
                            <x-filament::button type="button" wire:click="move({{ $category->id }}, 1)" aria-label="پایین‌بردن {{ $category->title }}">پایین</x-filament::button>
                            <x-filament::button type="button" color="danger" wire:click="delete({{ $category->id }})" wire:confirm="این دسته حذف شود؟" aria-label="حذف {{ $category->title }}">حذف</x-filament::button>
                        </td>
                    </tr>
                @empty
                    <tr><td colspan="4">در این سطح دسته‌ای ثبت نشده است.</td></tr>
                @endforelse
            </tbody>
        </table>
        <nav aria-label="صفحه‌بندی دسته‌ها">
            @if ($this->records->currentPage() > 1)
                <x-filament::button type="button" wire:click="previousPage">صفحه قبل</x-filament::button>
            @endif
            <span>صفحه {{ \App\Support\Persian::digits($this->records->currentPage()) }} از {{ \App\Support\Persian::digits($this->records->lastPage()) }}</span>
            @if ($this->records->hasMorePages())
                <x-filament::button type="button" wire:click="nextPage">صفحه بعد</x-filament::button>
            @endif
        </nav>
    </section>
</x-filament-panels::page>
