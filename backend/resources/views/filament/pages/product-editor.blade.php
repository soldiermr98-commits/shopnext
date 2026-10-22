<x-filament-panels::page>
    @if ($errors->any())<ul role="alert">@foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul>@endif
    @if ($notice)<p role="status">{{ $notice }}</p>@endif
    <a href="{{ \App\Filament\Pages\ProductBulkEditor::getUrl() }}">عملیات گروهی محصول‌ها</a>
    <x-filament::button type="button" wire:click="newProduct">محصول جدید</x-filament::button>
    <form wire:submit="save">
        {{ $this->form }}
        <p>موجودی از این فرم قابل تغییر نیست. توضیحات، گالری و روابط در صفحه محتوا ویرایش می‌شوند.</p>
        <x-filament::button type="submit" wire:loading.attr="disabled">ذخیره محصول</x-filament::button>
    </form>
    <x-filament::button type="button" color="gray" wire:click="toggleTrash">{{ $trashed ? 'نمایش محصول‌های فعال' : 'نمایش سطل زباله' }}</x-filament::button>
    <table>
        <caption>{{ $trashed ? 'محصول‌های حذف‌شده' : 'فهرست محصول‌ها' }}</caption>
        <thead><tr><th scope="col">عنوان</th><th scope="col">شناسه</th><th scope="col">برند</th><th scope="col">نوع / انتشار</th><th scope="col">قیمت (تومان)</th><th scope="col">موجودی</th><th scope="col">انتشار زمان‌بندی‌شده</th><th scope="col">عملیات</th></tr></thead>
        <tbody>
        @forelse ($this->records as $product)
            <tr wire:key="product-{{ $product->id }}">
                <td>{{ $product->title }}</td><td>{{ $product->sku }}</td><td>{{ $product->brandRecord?->name ?: '—' }}</td>
                <td>{{ ['simple'=>'ساده','variable'=>'متغیر','digital'=>'دیجیتال','bundle'=>'بسته'][$product->type] }} / {{ ['draft'=>'پیش‌نویس','published'=>'منتشرشده','scheduled'=>'زمان‌بندی‌شده'][$product->status] }}</td>
                <td>{{ \App\Support\Persian::digits(number_format($product->price)) }}</td><td>{{ \App\Support\Persian::digits($product->stock) }}</td><td>{{ \App\Filament\Support\AdminDate::display($product->published_at) }}</td>
                <td>
                @if ($trashed)
                    <x-filament::button type="button" wire:click="restore({{ $product->id }})" wire:confirm="این محصول بازیابی شود؟">بازیابی</x-filament::button>
                @else
                    <x-filament::button type="button" wire:click="edit({{ $product->id }})">ویرایش {{ $product->title }}</x-filament::button>
                    <a href="{{ \App\Filament\Pages\ProductContentEditor::getUrl(['product' => $product->id]) }}">محتوا و گالری {{ $product->title }}</a>
                    @if ($product->type === 'variable')<a href="{{ \App\Filament\Pages\VariantEditor::getUrl(['product' => $product->id]) }}">تنوع‌های {{ $product->title }}</a>@endif
                    <x-filament::button type="button" color="danger" wire:click="delete({{ $product->id }})" wire:confirm="محصول به سطل زباله منتقل شود؟">حذف {{ $product->title }}</x-filament::button>
                @endif
                </td>
            </tr>
        @empty
            <tr><td colspan="8">محصولی یافت نشد.</td></tr>
        @endforelse
        </tbody>
    </table>
    <nav aria-label="صفحه‌بندی محصول‌ها">
        @if ($this->records->currentPage() > 1)<x-filament::button type="button" wire:click="previousPage">صفحه قبل</x-filament::button>@endif
        <span>صفحه {{ \App\Support\Persian::digits($this->records->currentPage()) }} از {{ \App\Support\Persian::digits($this->records->lastPage()) }}</span>
        @if ($this->records->hasMorePages())<x-filament::button type="button" wire:click="nextPage">صفحه بعد</x-filament::button>@endif
    </nav>
</x-filament-panels::page>
