<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Support\Permissions;
use Illuminate\Database\Eloquent\Model;

final class OrderPolicy extends FoundationPolicy
{
    protected string $resource = 'orders';

    public function view(User $user, Model $record): bool
    {
        return $this->viewAny($user) || ((int) $record->user_id === (int) $user->id);
    }

    public function updateStatus(User $user, Model $record): bool
    {
        return $this->viewAny($user);
    }

    public function checkout(User $user): bool
    {
        return $user->role === 'customer';
    }

    public function listOwn(User $user): bool
    {
        return $this->checkout($user);
    }

    public function cancel(User $user, Model $record): bool
    {
        return $user->role === 'customer' && (int) $record->user_id === $user->id && in_array($record->status, ['pending', 'awaiting_payment'], true);
    }

    public function operate(User $user, Model $record): bool
    {
        return $this->viewAny($user);
    }

    public function submitReceipt(User $user, Model $record): bool
    {
        return $user->role === 'customer' && (int) $record->user_id === $user->id;
    }

    public function readReceipt(User $user, Model $record): bool
    {
        return $this->submitReceipt($user, $record) || Permissions::allows($user, 'settings');
    }
}
