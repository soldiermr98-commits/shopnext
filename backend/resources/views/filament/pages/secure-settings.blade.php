<x-filament-panels::page>
    <p>Secret values are never displayed. Empty or omitted new values preserve the existing secret.</p>
    @foreach ($this->statuses() as $status)
        <p>{{ $status->key }}: {{ $status->isSet ? '•••••••• (set)' : '(not set)' }}</p>
    @endforeach
    <form wire:submit="save">
        <label>Setting <select wire:model="key">@foreach (\App\Services\Settings::KEYS as $name)<option value="{{ $name }}">{{ $name }}</option>@endforeach</select></label>
        <label>New value <input type="password" wire:model="newValue" autocomplete="new-password"></label>
        @error('newValue')<p>{{ $message }}</p>@enderror
        @error('key')<p>{{ $message }}</p>@enderror
        <button type="submit">Save new value</button>
    </form>
</x-filament-panels::page>
