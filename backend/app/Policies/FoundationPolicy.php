<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Support\Permissions;
use Illuminate\Database\Eloquent\Model;

class FoundationPolicy
{
    protected string $resource = 'denied';

    public function before(User $user, string $ability): ?bool
    {
        return (! $user->is_active || $user->must_change_password) ? false : null;
    }

    public function viewAny(User $user): bool
    {
        return Permissions::allows($user, $this->resource);
    }

    public function view(User $user, Model $record): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, Model $record): bool
    {
        return false;
    }

    public function delete(User $user, Model $record): bool
    {
        return false;
    }

    public function restore(User $user, Model $record): bool
    {
        return false;
    }

    public function forceDelete(User $user, Model $record): bool
    {
        return false;
    }
}
