<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ImageProcessingException;

/** Header-only checks BEFORE reading the blob or calling either image decoder. */
final class ImageBudget
{
    public function inspect(string $path): array
    {
        $size = @filesize($path);
        if ($size === false || $size < 1 || $size > $this->maxBytes()) {
            $this->fail('حجم تصویر بیش از حد مجاز است یا فایل قابل خواندن نیست.');
        }
        $header = @getimagesize($path);
        if ($header === false || ! in_array($header[2] ?? null, [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
            $this->fail('تصویر خراب است؛ فایل سالم PNG، JPEG یا WebP انتخاب کنید.');
        }
        $this->assertFits($header[0], $header[1], $size, memory_get_usage(true), (string) ini_get('memory_limit'));

        return ['width' => $header[0], 'height' => $header[1], 'bytes' => $size];
    }

    public function assertFits(int $width, int $height, int $size, int $used, string $memoryLimit): void
    {
        $pixels = max(1, min(48000000, (int) config('media.max_pixels', 24000000)));
        if ($width < 1 || $height < 1 || $width > intdiv($pixels, $height)) {
            $this->fail('تعداد پیکسل‌های تصویر بیش از حد مجاز است؛ پیش از بارگذاری، ابعاد تصویر را کوچک کنید.');
        }
        if ($size < 1 || $size > $this->maxBytes()) {
            $this->fail('حجم تصویر بیش از حد مجاز است.');
        }
        $application = max(1, min(512 * 1024 * 1024, (int) config('media.processing_memory_bytes', 256 * 1024 * 1024)));
        $php = self::iniBytes($memoryLimit);
        $limit = $php === null ? $application : min($php, $application);
        $reserve = max(16 * 1024 * 1024, (int) config('media.memory_reserve_bytes', 32 * 1024 * 1024));
        // Two RGBA buffers + input/output strings; all products bounded above first.
        $estimated = $width * $height * 8 + $size * 2;
        if ($estimated > max(0, $limit - $used - $reserve)) {
            $this->fail('حافظه مجاز هاست برای پردازش امن این تصویر کافی نیست؛ تصویر کوچک‌تری بارگذاری کنید.');
        }
    }

    /** null means explicitly unlimited (-1); malformed limits fail closed (0). */
    public static function iniBytes(string $value): ?int
    {
        $value = trim($value);
        if ($value === '-1') {
            return null;
        }
        if (! preg_match('/^([0-9]+)\s*([KMG]?)B?$/iD', $value, $match)) {
            return 0;
        }
        $factor = match (strtoupper($match[2])) {
            'K' => 1024, 'M' => 1024 * 1024, 'G' => 1024 * 1024 * 1024, default => 1,
        };
        if (strlen($match[1]) > 18 || bccomp($match[1], (string) intdiv(PHP_INT_MAX, $factor), 0) > 0) {
            return PHP_INT_MAX;
        }

        return (int) $match[1] * $factor;
    }

    public function variants(): array
    {
        $variants = config('media.variants', []);
        if (! is_array($variants) || count($variants) > 3) {
            $this->fail('تنظیم خروجی تصویر معتبر نیست؛ حداکثر سه خروجی کوچک مجاز است.');
        }
        foreach ($variants as $name => $edge) {
            if (! is_string($name) || ! preg_match('/^[a-z]{1,16}$/D', $name) || ! is_int($edge) || $edge < 64 || $edge > 2048) {
                $this->fail('تنظیم اندازه خروجی تصویر معتبر نیست؛ اندازه باید بین ۶۴ و ۲۰۴۸ باشد.');
            }
        }

        return $variants;
    }

    private function maxBytes(): int
    {
        return max(1, min(64 * 1024 * 1024, (int) config('media.max_file_bytes', 8 * 1024 * 1024)));
    }

    private function fail(string $message): never
    {
        throw ImageProcessingException::withMessages(['file' => $message]);
    }
}
