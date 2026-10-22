<?php

declare(strict_types=1);

namespace App\Financial;

/** Nonnegative exact rational; never convert an intermediate value to float. */
final readonly class Fraction
{
    public string $n;

    public string $d;

    public function __construct(string $n, string $d = '1')
    {
        if (! preg_match('/^[0-9]+$/D', $n) || ! preg_match('/^[0-9]+$/D', $d) || bccomp($d, '0', 0) <= 0) {
            throw new \LogicException('Invalid rational.');
        }
        $a = $n;
        $b = $d;
        while (bccomp($b, '0', 0) !== 0) {
            [$a, $b] = [$b, bcmod($a, $b, 0)];
        }
        $this->n = bcdiv($n, $a, 0);
        $this->d = bcdiv($d, $a, 0);
    }

    public static function of(int $n): self
    {
        return new self((string) Money::integer($n));
    }

    public function compare(self $b): int
    {
        return bccomp(bcmul($this->n, $b->d, 0), bcmul($b->n, $this->d, 0), 0);
    }

    public function plus(self $b): self
    {
        return new self(bcadd(bcmul($this->n, $b->d, 0), bcmul($b->n, $this->d, 0), 0), bcmul($this->d, $b->d, 0));
    }

    public function minus(self $b): self
    {
        if ($this->compare($b) < 0) {
            throw new \LogicException('Negative rational.');
        }

        return new self(bcsub(bcmul($this->n, $b->d, 0), bcmul($b->n, $this->d, 0), 0), bcmul($this->d, $b->d, 0));
    }

    public function times(self $b): self
    {
        return new self(bcmul($this->n, $b->n, 0), bcmul($this->d, $b->d, 0));
    }

    public function dividedBy(self $b): self
    {
        return new self(bcmul($this->n, $b->d, 0), bcmul($this->d, $b->n, 0));
    }

    public function minimum(self $b): self
    {
        return $this->compare($b) <= 0 ? $this : $b;
    }

    public function rounded(): int
    {
        return Money::round($this->n, $this->d);
    }
}
