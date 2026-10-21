<?php

declare(strict_types=1);

namespace App\Financial;

final class WalletPayment implements PaymentMethod
{
    public function beginLocked(object $order, Ledger $ledger): bool
    {
        $ledger->payLocked($order->user_id, $order->id);

        return true;
    }
}
