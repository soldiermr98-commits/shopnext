<?php

declare(strict_types=1);

namespace App\Financial;

interface PaymentMethod
{
    /** True only when the full persisted amount has been paid in this transaction. */
    public function beginLocked(object $order, Ledger $ledger): bool;
}
