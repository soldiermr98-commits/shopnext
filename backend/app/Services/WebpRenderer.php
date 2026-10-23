<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ImageProcessingException;

/** One source and one destination at a time; no upscale or animation expansion. */
class WebpRenderer
{
    public function available(): bool
    {
        return $this->driver() !== null;
    }

    private function driver(): ?string
    {
        $health = app(ImageHostHealth::class)->report();
        $driver = config('security.image_driver', 'auto');
        if (in_array($driver, ['auto', 'gd'], true) && $health['gd_webp']) {
            return 'gd';
        }

        return in_array($driver, ['auto', 'imagick'], true) && $health['imagick_webp'] ? 'imagick' : null;
    }

    public function render(string $path, int $edge): string
    {
        $header = app(ImageBudget::class)->inspect($path);
        $width = $header['width'];
        $height = $header['height'];
        $longest = max($width, $height);
        $w = $longest > $edge ? max(1, intdiv($width * $edge, $longest)) : $width;
        $h = $longest > $edge ? max(1, intdiv($height * $edge, $longest)) : $height;
        if ($this->driver() === 'gd') {
            $source = @imagecreatefrompng($path);
            if (! $source) {
                throw ImageProcessingException::withMessages(['file' => 'تصویر اصلی قابل پردازش نیست.']);
            }
            $target = null;
            ob_start();
            try {
                $target = imagecreatetruecolor($w, $h);
                imagealphablending($target, false);
                imagesavealpha($target, true);
                imagecopyresampled($target, $source, 0, 0, 0, 0, $w, $h, $width, $height);
                if (! imagewebp($target, null, 80)) {
                    throw ImageProcessingException::withMessages(['file' => 'ساخت WebP امکان‌پذیر نیست.']);
                }
                $bytes = ob_get_contents();
            } finally {
                ob_end_clean();
                if ($target !== null) {
                    imagedestroy($target);
                }
                imagedestroy($source);
                unset($target, $source);
            }
        } elseif ($this->driver() === 'imagick') {
            \Imagick::setResourceLimit(\Imagick::RESOURCETYPE_MEMORY, 64 * 1024 * 1024);
            \Imagick::setResourceLimit(\Imagick::RESOURCETYPE_MAP, 128 * 1024 * 1024);
            \Imagick::setResourceLimit(\Imagick::RESOURCETYPE_DISK, 0);
            $image = new \Imagick;
            try {
                $image->readImage($path.'[0]');
                $image->stripImage();
                $image->thumbnailImage($w, $h);
                $image->setImageFormat('webp');
                $image->setImageCompressionQuality(80);
                $bytes = $image->getImageBlob();
            } finally {
                $image->clear();
                $image->destroy();
                unset($image);
            }
        } else {
            throw ImageProcessingException::withMessages(['file' => 'WebP در هاست پشتیبانی نمی‌شود؛ اصل امن حفظ شد.']);
        }
        if (! is_string($bytes) || strlen($bytes) < 1 || strlen($bytes) > 8 * 1024 * 1024) {
            throw ImageProcessingException::withMessages(['file' => 'حجم خروجی تصویر معتبر نیست.']);
        }

        return $bytes;
    }
}
