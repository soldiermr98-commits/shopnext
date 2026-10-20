<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

final class AddressPolicy extends FoundationPolicy
{
    protected string $resource = 'denied';

    public function view(User $user, Model $record): bool
    {
        return (int) $record->user_id === (int) $user->id;
    }

    public function update(User $user, Model $record): bool
    {
        return $this->view($user, $record);
    }

    public function delete(User $user, Model $record): bool
    {
        return $this->view($user, $record);
    }
}
