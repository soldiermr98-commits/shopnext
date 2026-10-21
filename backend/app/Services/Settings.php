<?php

declare(strict_types=1);

namespace App\Services;

use App\Data\SettingStatus;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class Settings
{
    // Configuration only: no SMS, payments, or provider integration is enabled.
    public const KEYS = ['integration_secret', 'mail_password', 'sms_api_key', 'payment_api_key'];

    public function statuses(): array
    {
        return array_map(fn (string $key): SettingStatus => new SettingStatus($key, Setting::where('key', $key)->exists()), self::KEYS);
    }

    public function write(string $key, #[\SensitiveParameter] ?string $newValue = null): void
    {
        if (! in_array($key, self::KEYS, true) || ($newValue !== null && strlen($newValue) > 4096)) {
            throw ValidationException::withMessages(['request' => 'Invalid setting input.']);
        }
        if ($newValue === null || $newValue === '') {
            return;
        }
        DB::transaction(function () use ($key, $newValue): void {
            $setting = Setting::where('key', $key)->first() ?? new Setting;
            $setting->forceFill(['key' => $key, 'value' => $newValue])->save();
        });
    }
}
