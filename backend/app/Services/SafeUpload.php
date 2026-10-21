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
    public function store(UploadedFile $file): string
    {
        Validator::make(['file' => $file], ['file' => MediaRequest::FILE_RULES])->validate();
        $source = file_get_contents($file->getRealPath());
        if (extension_loaded('gd') && config('security.image_driver', 'auto') !== 'imagick') {
            $image = @imagecreatefromstring($source);
            if (! $image) {
                throw ValidationException::withMessages(['file' => 'Invalid image.']);
            }
            imagesavealpha($image, true);
            ob_start();
            try {
                imagepng($image);
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
                $image->readImageBlob($source);
                $image->setIteratorIndex(0);
                $image->stripImage();
                $image->setImageFormat('png');
                $bytes = $image->getImageBlob();
            } finally {
                $image->clear();
            }
        }
        if (strlen($bytes) > 8 * 1024 * 1024) {
            throw ValidationException::withMessages(['file' => 'Image output is too large.']);
        }
        $name = bin2hex(random_bytes(24)).'.png';
        if (! Storage::disk('local')->put('media/'.$name, $bytes)) {
            throw new \RuntimeException('Unable to store image.');
        }

        return $name;
    }
}
