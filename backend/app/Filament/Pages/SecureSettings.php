<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Services\Settings;
use App\Support\Permissions;
use Filament\Pages\Page;
use Illuminate\Validation\Rule;

final class SecureSettings extends Page
{
    protected string $view = 'filament.pages.secure-settings';

    public string $key = 'integration_secret';

    public ?string $newValue = '';

    public static function canAccess(): bool
    {
        return auth()->check() && Permissions::allows(auth()->user(), 'settings');
    }

    public function save(): void
    {
        abort_unless(self::canAccess(), 403);
        try {
            $this->validate(['key' => ['required', Rule::in(Settings::KEYS)], 'newValue' => ['nullable', 'string', 'max:4096']]);
            app(Settings::class)->write($this->key, $this->newValue);
        } finally {
            $this->newValue = '';
        }
    }

    public function dehydrate(): void
    {
        $this->newValue = '';
    }

    public function statuses(): array
    {
        return app(Settings::class)->statuses();
    }
}
