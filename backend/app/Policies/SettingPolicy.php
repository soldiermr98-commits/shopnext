<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

final class SettingPolicy extends FoundationPolicy
{
    protected string $resource = 'settings';

    public function update(User $user, Model $record): bool
    {
        return $this->viewAny($user);
    }
}
