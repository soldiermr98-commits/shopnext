<?php

declare(strict_types=1);

namespace App\Financial;

use Illuminate\Validation\ValidationException;

/** Unsigned integer Toman; all intermediate rational arithmetic is decimal-string BCMath. */
final class Money
{
    public const MAX = 9007199254740991;

    public static function integer(mixed $value): int
    {
        if (! is_int($value) || $value < 0 || $value > self::MAX) {
            throw ValidationException::withMessages(['money' => 'مبلغ نامعتبر یا خارج از محدوده است.']);
        }

        return $value;
    }

    public static function bounded(string $value): int
    {
        if (! preg_match('/^[0-9]+$/D', $value) || bccomp($value, (string) self::MAX, 0) > 0) {
            throw ValidationException::withMessages(['money' => 'مبلغ نامعتبر یا خارج از محدوده است.']);
        }

        return (int) $value;
    }

    public static function add(int ...$values): int
    {
        $result = '0';
        foreach ($values as $value) {
            $result = bcadd($result, (string) self::integer($value), 0);
        }

        return self::bounded($result);
    }

    public static function multiply(int $amount, int $quantity): int
    {
        return self::bounded(bcmul((string) self::integer($amount), (string) self::integer($quantity), 0));
    }

    /** Round nonnegative rational exactly once, half up; no float conversion. */
    public static function round(string $numerator, string $denominator): int
    {
        if (! preg_match('/^[0-9]+$/D', $numerator) || ! preg_match('/^[0-9]+$/D', $denominator) || bccomp($denominator, '0', 0) <= 0) {
            throw ValidationException::withMessages(['money' => 'کسر مالی نامعتبر است.']);
        }
        $whole = bcdiv($numerator, $denominator, 0);
        if (bccomp(bcmul(bcmod($numerator, $denominator, 0), '2', 0), $denominator, 0) >= 0) {
            $whole = bcadd($whole, '1', 0);
        }

        return self::bounded($whole);
    }

    /** Largest-remainder allocation, ties by caller's stable sorted line order. */
    public static function allocate(int $amount, array $weights): array
    {
        self::integer($amount);
        $sum = '0';
        foreach ($weights as $weight) {
            if (! is_string($weight) || ! preg_match('/^[0-9]+$/D', $weight)) {
                throw ValidationException::withMessages(['money' => 'وزن تخصیص نامعتبر است.']);
            }
            $sum = bcadd($sum, $weight, 0);
        }
        if ($sum === '0') {
            if ($amount !== 0) {
                throw ValidationException::withMessages(['money' => 'تخصیص تخفیف نامعتبر است.']);
            }

            return array_fill_keys(array_keys($weights), 0);
        }
        $result = $remainders = [];
        $allocated = 0;
        foreach ($weights as $key => $weight) {
            $product = bcmul((string) $amount, $weight, 0);
            $result[$key] = self::bounded(bcdiv($product, $sum, 0));
            $allocated += $result[$key];
            $remainders[$key] = bcmod($product, $sum, 0);
        }
        // uasort is stable in supported PHP8; input order is the deterministic tie-breaker.
        uasort($remainders, fn (string $a, string $b): int => bccomp($b, $a, 0));
        $left = $amount - $allocated;
        foreach ($remainders as $key => $remainder) {
            if ($left-- <= 0) {
                break;
            }
            $result[$key]++;
        }

        return $result;
    }
}
