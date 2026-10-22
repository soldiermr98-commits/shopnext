<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

final class ProductVariantPolicy extends FoundationPolicy
{
    protected string $resource = 'products';

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, Model $record): bool
    {
        return $this->viewAny($user);
    }

    public function delete(User $user, Model $record): bool
    {
        return $this->viewAny($user);
    }

    public function restore(User $user, Model $record): bool
    {
        return $this->viewAny($user);
    }
}
