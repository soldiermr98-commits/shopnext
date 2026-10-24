<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\User;

/** Panel-only permissions; never widen the customer API or financial services. */
final class AdminCapabilities
{
    public const MATRIX = [
        'orders.view' => ['super_admin', 'admin', 'shop_manager', 'support'],
        'orders.status' => ['super_admin', 'admin', 'shop_manager'],
        'orders.cancel' => ['super_admin', 'admin'],
        'orders.refund' => ['super_admin', 'admin'],
        'orders.receipt' => ['super_admin', 'admin'],
        'orders.collected' => ['super_admin', 'admin'],
        'orders.manual' => ['super_admin', 'admin'],
        'orders.tracking' => ['super_admin', 'admin', 'shop_manager'],
        'orders.notes' => ['super_admin', 'admin', 'shop_manager'],
        'orders.export' => ['super_admin', 'admin'],
        'orders.print' => ['super_admin', 'admin', 'shop_manager'],
        'orders.labels' => ['super_admin', 'admin'],
        'customers.view' => ['super_admin', 'admin', 'shop_manager', 'support'],
        'customers.notes' => ['super_admin', 'admin', 'shop_manager'],
        'customers.block' => ['super_admin', 'admin'],
        'customers.wallet' => ['super_admin', 'admin'],
        'customers.export' => ['super_admin', 'admin'],
        'pii.full' => ['super_admin', 'admin', 'shop_manager'],
    ];

    public static function allows(User $user, string $ability): bool
    {
        return $user->is_active && ! $user->must_change_password
            && in_array($user->role, self::MATRIX[$ability] ?? [], true);
    }
}
