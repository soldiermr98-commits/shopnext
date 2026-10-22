<x-filament-widgets::widget>
    <x-filament::section>
        @php($status = $this->status())
        <h2>وضعیت زمان‌بند و صف</h2>
        <p>آخرین اجرای زمان‌بند: {{ $status['minutes'] === null ? 'هنوز اجرا نشده' : \App\Support\Persian::digits($status['minutes']).' دقیقه پیش' }}</p>
        @if ($status['stale'] || ! $status['workerHealthy'])
            <p role="alert">هشدار: زمان‌بند یا پردازش صف پایگاه‌داده به‌روز و سالم نیست.</p>
        @else
            <p>پردازش صف پایگاه‌داده سالم است.</p>
        @endif
    </x-filament::section>
</x-filament-widgets::widget>
