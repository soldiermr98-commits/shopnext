<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ImageProcessingException;
use App\Http\Requests\MediaRequest;
use App\Models\MediaAsset;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

final class SafeUpload
{
    public function store(UploadedFile $file, string $directory = 'media'): string
    {
        if (! in_array($directory, ['media', 'receipts'], true)) {
            throw new \LogicException('Unsupported image directory.');
        }
        app(ImageBudget::class)->inspect($file->getRealPath());
        Validator::make(['file' => $file], ['file' => MediaRequest::FILE_RULES], [
            'required' => 'تصویر انتخاب کنید.', 'file' => 'فایل معتبر انتخاب کنید.',
            'image' => 'تصویر سالم انتخاب کنید.', 'max' => 'حجم تصویر بیش از ۲ مگابایت است.',
            'mimes' => 'تصویر PNG، JPEG یا WebP انتخاب کنید.', 'extensions' => 'پسوند تصویر معتبر نیست.',
            'dimensions' => 'ابعاد تصویر بیش از ۲۰۴۸ پیکسل است.',
        ])->validate();
        $driver = (string) config('security.image_driver', 'auto');
        if (! in_array($driver, ['auto', 'gd', 'imagick'], true)) {
            throw ImageProcessingException::withMessages(['file' => 'تنظیم پردازش تصویر در هاست معتبر نیست.']);
        }
        $useGd = extension_loaded('gd') && $driver !== 'imagick';
        if (! $useGd && ($driver === 'gd' || ! extension_loaded('imagick'))) {
            throw ImageProcessingException::withMessages(['file' => 'افزونه پردازش تصویر در هاست فعال نیست.']);
        }
        if ($useGd) {
            $source = file_get_contents($file->getRealPath());
            if ($source === false) {
                throw ImageProcessingException::withMessages(['file' => 'خواندن تصویر امکان‌پذیر نیست.']);
            }
            $image = @imagecreatefromstring($source);
            if (! $image) {
                throw ImageProcessingException::withMessages(['file' => 'تصویر خراب است یا پردازش آن در این هاست پشتیبانی نمی‌شود.']);
            }
            ob_start();
            try {
                imagesavealpha($image, true);
                if (! imagepng($image)) {
                    throw ImageProcessingException::withMessages(['file' => 'ساخت تصویر امن امکان‌پذیر نیست.']);
                }
                $bytes = ob_get_contents();
            } finally {
                ob_end_clean();
                imagedestroy($image);
                unset($image);
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
                throw ImageProcessingException::withMessages(['file' => 'تصویر خراب است یا منابع پردازش تصویر کافی نیست.']);
            } finally {
                $image->clear();
                $image->destroy();
                unset($image);
            }
        }
        unset($source);
        if (! is_string($bytes)) {
            throw ImageProcessingException::withMessages(['file' => 'ساخت تصویر امن امکان‌پذیر نیست.']);
        }
        if (strlen($bytes) > 8 * 1024 * 1024) {
            throw ImageProcessingException::withMessages(['file' => 'حجم خروجی تصویر بیش از حد مجاز است.']);
        }
        $name = bin2hex(random_bytes(24)).'.png';
        if (! Storage::disk('local')->put($directory.'/'.$name, $bytes)) {
            throw new \RuntimeException('Unable to store image.');
        }

        if ($directory === 'media') {
            try {
                (new MediaAsset)->forceFill(['filename' => $name, 'sha256' => hash('sha256', $bytes)])->save();
            } catch (\Throwable $exception) {
                Storage::disk('local')->delete('media/'.$name);
                throw $exception;
            }
        }

        return $name;
    }
}
