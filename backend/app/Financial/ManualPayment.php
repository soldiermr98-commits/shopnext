<?php

declare(strict_types=1);

namespace App\Financial;

/** COD collection/card receipt must be separately verified by an administrator. */
final class ManualPayment implements PaymentMethod
{
    public function beginLocked(object $order, Ledger $ledger): bool
    {
        return false;
    }
}
