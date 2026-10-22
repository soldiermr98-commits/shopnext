<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\User;

final class Permissions
{
    public const MATRIX = [
        'dashboard' => ['super_admin', 'admin', 'shop_manager'],
        'products' => ['super_admin', 'admin', 'shop_manager'],
        'orders' => ['super_admin', 'admin', 'shop_manager'],
        'customers' => ['super_admin', 'admin', 'shop_manager'],
        'settings' => ['super_admin', 'admin'],
        'logs' => ['super_admin', 'admin'],
    ];

    public static function allows(User $user, string $resource): bool
    {
        return $user->is_active && ! $user->must_change_password
            && in_array($user->role, self::MATRIX[$resource] ?? [], true);
    }
}
