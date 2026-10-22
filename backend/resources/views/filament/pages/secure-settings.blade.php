<x-filament-panels::page>
    <p>مقادیر محرمانه نمایش داده نمی‌شوند. خالی گذاشتن مقدار جدید، مقدار قبلی را حفظ می‌کند.</p>
    @foreach ($this->statuses() as $status)
        <p>{{ $status->key }}: {{ $status->isSet ? '•••••••• (تنظیم شده)' : '(تنظیم نشده)' }}</p>
    @endforeach
    <form wire:submit="save">
        <label>کلید تنظیمات <select wire:model="key">@foreach (\App\Services\Settings::KEYS as $name)<option value="{{ $name }}">{{ $name }}</option>@endforeach</select></label>
        <label>مقدار جدید <input type="password" wire:model="newValue" autocomplete="new-password"></label>
        @error('newValue')<p>{{ $message }}</p>@enderror
        @error('key')<p>{{ $message }}</p>@enderror
        <button type="submit">ذخیره مقدار جدید</button>
    </form>
</x-filament-panels::page>
