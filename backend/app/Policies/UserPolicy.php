<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

final class UserPolicy extends FoundationPolicy
{
    protected string $resource = 'customers';

    public function view(User $user, Model $record): bool
    {
        return $this->viewAny($user) || ((int) $record->id === (int) $user->id);
    }
}
