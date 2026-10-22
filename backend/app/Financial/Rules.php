<?php

declare(strict_types=1);

namespace App\Financial;

use App\Models\ActivityLog;
use App\Models\Setting;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class Rules
{
    public const KEY = '_financial_rules';

    public const DEFAULTS = ['expiry_minutes' => 30, 'cod_review_days' => 7, 'vat_bps' => 0, 'prices_include_tax' => false, 'max_per_line' => 99, 'max_lines' => 100, 'max_order_quantity' => 1000, 'shipping' => [], 'automatic' => []];

    public function current(bool $lock = false): array
    {
        $row = Setting::where('key', self::KEY)->when($lock, fn ($q) => $q->sharedLock())->first();

        return $this->validate($row ? json_decode($row->value, true, 512, JSON_THROW_ON_ERROR) : []);
    }

    public function replace(User $actor, array $data): void
    {
        abort_unless(Permissions::allows($actor, 'settings'), 403);
        $data = $this->validate($data);
        DB::transaction(function () use ($data, $actor): void {
            $currentActor = User::whereKey($actor->id)->lockForUpdate()->first();
            abort_unless($currentActor && Permissions::allows($currentActor, 'settings'), 403);
            $setting = Setting::where('key', self::KEY)->lockForUpdate()->first() ?? new Setting;
            $created = ! $setting->exists;
            Setting::withoutEvents(fn () => $setting->forceFill(['key' => self::KEY, 'value' => json_encode($data, JSON_THROW_ON_ERROR)])->save());
            (new ActivityLog)->forceFill([
                'user_id' => $actor->id, 'user_name' => $currentActor->name, 'user_role' => $currentActor->role,
                'action' => $created ? 'create' : 'update', 'module' => 'settings', 'subject_id' => (string) $setting->id,
                'changed_fields' => ['value'], 'before' => $created ? [] : ['value' => '[REDACTED]'],
                'after' => ['key' => self::KEY, 'value' => '[REDACTED]'], 'ip_address' => request()->ip(),
            ])->save();
        }, 5);
    }

    public function validate(array $data): array
    {
        if (array_diff(array_keys($data), array_keys(self::DEFAULTS))) {
            throw ValidationException::withMessages(['settings' => 'گزینه تنظیمات مالی نامعتبر است.']);
        }
        $data = array_replace(self::DEFAULTS, $data);
        try {
            $size = strlen(json_encode($data, JSON_THROW_ON_ERROR));
        } catch (\JsonException) {
            throw ValidationException::withMessages(['settings' => 'ساختار تنظیمات مالی نامعتبر است.']);
        }
        // Encrypted base64 payload must fit the existing 65,535-byte TEXT column.
        if ($size > 30000) {
            throw ValidationException::withMessages(['settings' => 'حجم تنظیمات مالی از سقف مجاز بیشتر است.']);
        }
        $int = function (string $attribute, mixed $value, \Closure $fail): void {
            if (! is_int($value)) {
                $fail('مقدار باید عدد صحیح باشد.');
            }
        };
        $money = ['required', 'integer', $int, 'min:0', 'max:'.Money::MAX];
        Validator::make($data, [
            'expiry_minutes' => ['required', 'integer', $int, 'min:1', 'max:10080'],
            'cod_review_days' => ['required', 'integer', $int, 'between:1,365'],
            'vat_bps' => ['required', 'integer', $int, 'between:0,10000'],
            'prices_include_tax' => ['required', function ($a, $v, $f): void {
                if (! is_bool($v)) {
                    $f('مقدار باید boolean باشد.');
                }
            }],
            'max_per_line' => ['required', 'integer', $int, 'between:1,1000000'],
            'max_lines' => ['required', 'integer', $int, 'between:1,100'],
            'max_order_quantity' => ['required', 'integer', $int, 'between:1,1000000'],
            'shipping' => ['array', 'max:1000'],
            'shipping.*' => ['array:method,zone,type,amount,tiers,free_over,cod'],
            'shipping.*.method' => ['required', 'regex:/^[a-z0-9_-]{1,64}$/D'],
            'shipping.*.zone' => ['required', 'regex:/^[A-Za-z0-9_-]{1,64}$/D'],
            'shipping.*.type' => ['required', Rule::in(['flat', 'weight', 'price', 'pickup'])],
            'shipping.*.amount' => ['sometimes', ...$money],
            'shipping.*.free_over' => ['sometimes', 'nullable', 'integer', $int, 'min:0', 'max:'.Money::MAX],
            'shipping.*.cod' => ['required', function ($a, $v, $f): void {
                if (! is_bool($v)) {
                    $f('مقدار باید boolean باشد.');
                }
            }],
            'shipping.*.tiers' => ['sometimes', 'array', 'max:100'],
            'shipping.*.tiers.*' => ['array:up_to,amount'],
            'shipping.*.tiers.*.up_to' => ['required', 'integer', $int, 'min:1', 'max:'.Money::MAX],
            'shipping.*.tiers.*.amount' => $money,
            'automatic' => ['array', 'max:100'],
            'automatic.*' => ['array:type,value,min_quantity,products,categories,exclude_products,exclude_categories,starts_at,ends_at'],
            'automatic.*.type' => ['required', Rule::in(['percentage', 'fixed'])],
            'automatic.*.value' => $money,
            'automatic.*.min_quantity' => ['required', 'integer', $int, 'between:1,1000000'],
            'automatic.*.starts_at' => ['sometimes', 'nullable', 'date_format:Y-m-d\TH:i:s\Z'],
            'automatic.*.ends_at' => ['sometimes', 'nullable', 'date_format:Y-m-d\TH:i:s\Z'],
            ...collect(['products', 'categories', 'exclude_products', 'exclude_categories'])->flatMap(fn ($key) => ["automatic.*.{$key}" => ['sometimes', 'array', 'max:1000'], "automatic.*.{$key}.*" => ['integer', $int, 'min:1', 'max:'.Money::MAX]])->all(),
        ])->validate();
        $seen = [];
        foreach ($data['shipping'] as $row) {
            $key = $row['zone'].':'.$row['method'];
            if (isset($seen[$key]) || ($row['type'] === 'flat' && ! isset($row['amount'])) || (in_array($row['type'], ['weight', 'price'], true) && empty($row['tiers']))) {
                throw ValidationException::withMessages(['shipping' => 'تعرفه ارسال نامعتبر یا تکراری است.']);
            }
            $seen[$key] = true;
            $last = 0;
            foreach ($row['tiers'] ?? [] as $tier) {
                if ($tier['up_to'] <= $last) {
                    throw ValidationException::withMessages(['shipping' => 'پله‌های ارسال باید صعودی باشند.']);
                }
                $last = $tier['up_to'];
            }
        }
        foreach ($data['automatic'] as $row) {
            if (($row['type'] === 'percentage' && $row['value'] > 10000) || (! empty($row['starts_at']) && ! empty($row['ends_at']) && $row['ends_at'] <= $row['starts_at'])) {
                throw ValidationException::withMessages(['automatic' => 'قانون تخفیف نامعتبر است.']);
            }
        }

        return $data;
    }
}
