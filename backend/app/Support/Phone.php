<?php

declare(strict_types=1);

namespace App\Support;

final class Phone
{
    public static function normalize(string $value): string
    {
        $value = trim(strtr($value, array_combine(preg_split('//u', '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', -1, PREG_SPLIT_NO_EMPTY), str_split('01234567890123456789'))));
        foreach (['+98', '0098', '98'] as $prefix) {
            if (str_starts_with($value, $prefix)) {
                return '0'.substr($value, strlen($prefix));
            }
        }

        return $value;
    }
}
