<?php

declare(strict_types=1);

namespace App\Filament\Concerns;

use App\Exceptions\ImageProcessingException;
use App\Models\User;
use App\Services\SafeUpload;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Throwable;

trait HandlesCatalogImage
{
    private const IMAGE_ERROR = 'تصویر PNG، JPEG یا WebP حداکثر ۲ مگابایت و ۲۰۴۸ پیکسل انتخاب کنید.';

    public ?TemporaryUploadedFile $imageUpload = null;

    abstract protected function actor(): User;

    protected function assertImageReady(): void
    {
        // Run BEFORE schema validation, which clears non-schema upload errors.
        if ($this->getErrorBag()->has('imageUpload')) {
            throw ValidationException::withMessages(['imageUpload' => self::IMAGE_ERROR]);
        }
    }

    protected function persistCatalogImage(array $state, string $field, Closure $persist): Model
    {
        $newImage = null;
        try {
            if ($this->imageUpload !== null) {
                $newImage = app(SafeUpload::class)->store($this->imageUpload);
                $state[$field] = '/media/'.$newImage;
            }

            return $persist($state);
        } catch (Throwable $exception) {
            if ($newImage !== null) {
                Storage::disk('local')->delete('media/'.$newImage);
            }
            if ($exception instanceof ValidationException) {
                $messages = [];
                foreach ($exception->errors() as $key => $errors) {
                    $messages[$key === 'file' ? 'imageUpload' : 'data.'.($key === 'content' ? 'description' : $key)] = match ($key) {
                        'file' => $exception instanceof ImageProcessingException ? $errors : [self::IMAGE_ERROR],
                        'content' => ['متن توضیحات بیش از حد مجاز است.'],
                        default => $errors,
                    };
                }
                throw ValidationException::withMessages($messages);
            }
            throw $exception;
        }
    }

    public function updatedImageUpload(): void
    {
        $this->actor();
        if ($this->imageUpload !== null) {
            $this->resetValidation('imageUpload');
        }
    }

    // Match the mixed signature inherited through Filament InteractsWithSchemas.
    public function _uploadErrored(mixed $name, mixed $errorsInJson, mixed $isMultiple): void
    {
        $this->actor();
        abort_unless($name === 'imageUpload', 422);
        $this->dispatch('upload:errored', name: $name)->self();
        throw ValidationException::withMessages(['imageUpload' => self::IMAGE_ERROR]);
    }
}
