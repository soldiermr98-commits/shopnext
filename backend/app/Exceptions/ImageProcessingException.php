<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Validation\ValidationException;

final class ImageProcessingException extends ValidationException
{
    // Marks trusted Persian processing errors for upload-form presentation.
}
