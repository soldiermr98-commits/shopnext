<?php

declare(strict_types=1);

use App\Financial\Money;
use Illuminate\Validation\ValidationException;

it('C02 rejects fractional negative overflow and noninteger money instead of silently casting', function () {
    foreach ([-1, '1', '0.5', true, null, Money::MAX + 1] as $value) {
        expect(fn () => Money::integer($value))->toThrow(ValidationException::class);
    }
    expect(fn () => Money::multiply(Money::MAX, 2))->toThrow(ValidationException::class);
    expect(fn () => Money::add(Money::MAX, 1))->toThrow(ValidationException::class);
});

it('H06 rounds exact rational line totals half up without unit rounding or floats', function () {
    expect(Money::round('5', '2'))->toBe(3);
    expect(Money::round('4', '2'))->toBe(2);
    // Three units each costing one half Toman: round line1.5 ->2, NOT three rounded units ->3.
    expect(Money::round('3', '2'))->toBe(2);
    expect(Money::round((string) Money::MAX, '1'))->toBe(Money::MAX);
    expect(fn () => Money::round('1', '0'))->toThrow(ValidationException::class);
});

it('H06 property style allocation preserves every Toman and deterministic remainder ties', function () {
    expect(Money::allocate(2, ['a' => '1', 'b' => '1', 'c' => '1']))->toBe(['a' => 1, 'b' => 1, 'c' => 0]);
    for ($seed = 1; $seed <= 200; $seed++) {
        $weights = ['a' => (string) ($seed * 7), 'b' => (string) ($seed % 13), 'c' => '9007199254740991'];
        $amount = $seed * 123;
        $parts = Money::allocate($amount, $weights);
        expect(array_sum($parts))->toBe($amount);
        foreach ($parts as $part) {
            expect($part)->toBeInt()->toBeGreaterThanOrEqual(0);
        }
        expect(Money::allocate($amount, $weights))->toBe($parts);
    }
});
