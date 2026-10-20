<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
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
}
