<?php

declare(strict_types=1);

namespace App\Services;

final class ImageHostHealth
{
    public function report(): array
    {
        $values = [];
        foreach (['upload_max_filesize', 'post_max_size', 'memory_limit', 'max_execution_time'] as $key) {
            $values[$key] = (string) ini_get($key);
        }
        $gd = extension_loaded('gd') && function_exists('imagewebp') && (imagetypes() & IMG_WEBP) !== 0;
        try {
            $imagick = extension_loaded('imagick') && \Imagick::queryFormats('WEBP') !== [];
        } catch (\Throwable) {
            $imagick = false;
        }

        return $this->evaluate($values, $gd, $imagick);
    }

    /** Pure evaluator shared by CLI/dashboard; no database or credential reads. */
    public function evaluate(array $values, bool $gd, bool $imagick): array
    {
        $warnings = [];
        foreach (['upload_max_filesize' => 8, 'post_max_size' => 10, 'memory_limit' => 256] as $key => $megabytes) {
            $value = ImageBudget::iniBytes((string) ($values[$key] ?? '0'));
            // post_max_size=0 means unlimited; upload_max_filesize=0 does NOT.
            $unlimited = ($key === 'memory_limit' && $value === null) || ($key === 'post_max_size' && ($values[$key] ?? '') === '0');
            if (! $unlimited && ($value ?? 0) < $megabytes * 1024 * 1024) {
                $warnings[] = $key.' کمتر از مقدار پیشنهادی '.$megabytes.'M است؛ تصاویر بزرگ ممکن است رد شوند.';
            }
        }
        $seconds = (int) ($values['max_execution_time'] ?? 0);
        if ($seconds > 0 && $seconds < 60) {
            $warnings[] = 'max_execution_time کمتر از ۶۰ ثانیه است؛ اجرای همگام فقط برای تصاویر کوچک و محدود مناسب است.';
        }
        $driver = config('security.image_driver', 'auto');
        $webp = match ($driver) {
            'gd' => $gd, 'imagick' => $imagick, default => $gd || $imagick,
        };
        if (! $webp) {
            $warnings[] = 'پردازشگر انتخاب‌شده از WebP پشتیبانی نمی‌کند؛ اصل PNG امن باید نگه‌داری شود.';
        }

        return ['values' => $values, 'gd_webp' => $gd, 'imagick_webp' => $imagick, 'warnings' => $warnings];
    }
}
