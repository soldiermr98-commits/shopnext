<x-filament-panels::page>
    @if ($errors->any())<ul role="alert">@foreach ($errors->all() as $error)<li>{{ $error }}</li>@endforeach</ul>@endif
    @if ($notice)<p role="status">{{ $notice }}</p>@endif
    <p>پوشه‌ها دسته‌بندی مجازی‌اند؛ نام پوشه جدید را وارد کنید یا برای انتقال تغییر دهید. جایگزینی نشانی ثابت را حفظ می‌کند. فایل دارای ارجاع، حتی در پیش‌نویس یا زباله‌دان، حذف نمی‌شود.</p>
    <label>پوشه<input wire:model="folder" maxlength="100"></label>
    <label>متن جایگزین<input wire:model="alt" maxlength="255"></label>
    <label>تصویر PNG، JPEG یا WebP تا ۲ مگابایت و ۲۰۴۸ پیکسل<input type="file" wire:model="upload" accept="image/png,image/jpeg,image/webp"></label>
    <x-filament::button wire:click="saveUpload" wire:loading.attr="disabled">بارگذاری جدید</x-filament::button>
    @if ($selected)
        <x-filament::button wire:click="saveMetadata" wire:loading.attr="disabled">ذخیره پوشه و متن جایگزین</x-filament::button>
        <x-filament::button wire:click="replace" wire:confirm="محتوای تصویر در تمام ارجاع‌ها جایگزین شود؟" wire:loading.attr="disabled">جایگزینی تصویر</x-filament::button>
        <x-filament::button wire:click="retryConversions" wire:loading.attr="disabled">تلاش دوباره تبدیل</x-filament::button>
        <x-filament::button color="danger" wire:click="deleteSelected" wire:confirm="رسانه بدون استفاده حذف شود؟" wire:loading.attr="disabled">حذف محافظت‌شده</x-filament::button>
    @endif
    <label>فیلتر پوشه (خالی: همه)<input wire:model="filter" maxlength="100"></label>
    @php($listing = $this->assets())
    <table><thead><tr><th>تصویر</th><th>پوشه</th><th>متن جایگزین</th><th>ارجاع زنده</th><th>تبدیل</th><th>انتخاب</th></tr></thead><tbody>
    @foreach ($listing['page'] as $asset)
        <tr wire:key="media-{{ $asset->id }}"><td><a href="{{ $asset->url() }}"><img loading="lazy" width="80" height="80" src="{{ isset($asset->variants['thumb']) ? '/media/'.$asset->variants['thumb'] : $asset->url() }}" alt="{{ $asset->alt }}"></a><code>{{ $asset->url() }}</code></td><td>{{ $asset->folder }}</td><td>{{ $asset->alt }}</td><td>{{ \App\Support\Persian::digits($listing['usage'][$asset->url()]) }}</td><td>{{ ['pending'=>'در انتظار پردازش؛ اصل امن موجود است','ready'=>'WebP و بندانگشتی آماده','original'=>'اصل امن؛ تبدیل در هاست ممکن نبود'][$asset->conversion_status] ?? 'اصل امن' }}</td><td><x-filament::button wire:click="select({{ $asset->id }})">انتخاب</x-filament::button></td></tr>
    @endforeach
    </tbody></table>
    {{ $listing['page']->links() }}
</x-filament-panels::page>
