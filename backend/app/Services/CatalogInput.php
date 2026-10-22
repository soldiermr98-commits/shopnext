<?php

declare(strict_types=1);

namespace App\Services;

use App\Financial\Money;
use App\Support\Persian;
use Illuminate\Validation\ValidationException;

/** Canonical unsigned integers; never accept floats, exponents or decimal coercion. */
final class CatalogInput
{
    public static function integer(mixed $value, string $field, int $min = 0, int $max = Money::MAX): int
    {
        $digits = is_string($value) ? Persian::ascii(trim($value)) : (is_int($value) ? (string) $value : '');
        if (! preg_match('/^[0-9]+$/D', $digits) || bccomp($digits, (string) $min, 0) < 0 || bccomp($digits, (string) $max, 0) > 0) {
            throw ValidationException::withMessages([$field => 'عدد صحیح در محدوده مجاز وارد کنید.']);
        }

        return Money::bounded($digits);
    }
}
