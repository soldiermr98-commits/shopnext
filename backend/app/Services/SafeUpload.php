<?php

declare(strict_types=1);

namespace App\Services;

use App\Http\Requests\MediaRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

final class SafeUpload
{
    public function store(UploadedFile $file, string $directory = 'media'): string
    {
        if (! in_array($directory, ['media', 'receipts'], true)) {
            throw new \LogicException('Unsupported image directory.');
        }
        app(ImageBudget::class)->inspect($file->getRealPath());
        Validator::make(['file' => $file], ['file' => MediaRequest::FILE_RULES])->validate();
        $source = file_get_contents($file->getRealPath());
        if ($source === false) {
            throw ValidationException::withMessages(['file' => 'خواندن تصویر امکان‌پذیر نیست.']);
        }
        if (extension_loaded('gd') && config('security.image_driver', 'auto') !== 'imagick') {
            $image = @imagecreatefromstring($source);
            if (! $image) {
                throw ValidationException::withMessages(['file' => 'تصویر خراب است یا پردازش آن در این هاست پشتیبانی نمی‌شود.']);
            }
            ob_start();
            try {
                imagesavealpha($image, true);
                if (! imagepng($image)) {
                    throw ValidationException::withMessages(['file' => 'ساخت تصویر امن امکان‌پذیر نیست.']);
                }
                $bytes = ob_get_contents();
            } finally {
                ob_end_clean();
                imagedestroy($image);
            }
        } else {
            \Imagick::setResourceLimit(\Imagick::RESOURCETYPE_MEMORY, 64 * 1024 * 1024);
            \Imagick::setResourceLimit(\Imagick::RESOURCETYPE_MAP, 128 * 1024 * 1024);
            \Imagick::setResourceLimit(\Imagick::RESOURCETYPE_DISK, 0);
            $image = new \Imagick;
            try {
                // Read only frame zero; animated WebP must not expand all frames.
                $image->readImage($file->getRealPath().'[0]');
                $image->setIteratorIndex(0);
                $image->stripImage();
                $image->setImageFormat('png');
                $bytes = $image->getImageBlob();
            } catch (\ImagickException) {
                throw ValidationException::withMessages(['file' => 'تصویر خراب است یا منابع پردازش تصویر کافی نیست.']);
            } finally {
                $image->clear();
                $image->destroy();
            }
        }
        unset($source);
        if (! is_string($bytes)) {
            throw ValidationException::withMessages(['file' => 'ساخت تصویر امن امکان‌پذیر نیست.']);
        }
        if (strlen($bytes) > 8 * 1024 * 1024) {
            throw ValidationException::withMessages(['file' => 'حجم خروجی تصویر بیش از حد مجاز است.']);
        }
        $name = bin2hex(random_bytes(24)).'.png';
        if (! Storage::disk('local')->put($directory.'/'.$name, $bytes)) {
            throw new \RuntimeException('Unable to store image.');
        }

        return $name;
    }
}
