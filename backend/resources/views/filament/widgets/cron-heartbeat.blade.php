<x-filament-widgets::widget>
    <x-filament::section>
        @php($status = $this->status())
        @php($images = $this->imageHealth())
        <h2>وضعیت زمان‌بند و صف</h2>
        <p>آخرین اجرای زمان‌بند: {{ $status['minutes'] === null ? 'هنوز اجرا نشده' : \App\Support\Persian::digits($status['minutes']).' دقیقه پیش' }}</p>
        @if ($status['stale'] || ! $status['workerHealthy'])
            <p role="alert">هشدار: زمان‌بند یا پردازش صف پایگاه‌داده به‌روز و سالم نیست.</p>
        @else
            <p>پردازش صف پایگاه‌داده سالم است.</p>
        @endif
        <h3>محدودیت‌های پردازش تصویر هاست</h3>
        <dl>@foreach ($images['values'] as $key => $value)<dt>{{ $key }}</dt><dd>{{ $value }}</dd>@endforeach</dl>
        <p>WebP — GD: {{ $images['gd_webp'] ? 'پشتیبانی می‌شود' : 'پشتیبانی نمی‌شود' }}؛ Imagick: {{ $images['imagick_webp'] ? 'پشتیبانی می‌شود' : 'پشتیبانی نمی‌شود' }}</p>
        @foreach ($images['warnings'] as $warning)<p role="alert">{{ $warning }}</p>@endforeach
    </x-filament::section>
</x-filament-widgets::widget>
