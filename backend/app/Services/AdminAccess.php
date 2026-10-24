<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Gate;

final class AdminAccess
{
    public function authorize(User $actor, string $ability): User
    {
        $actor = User::findOrFail($actor->id);
        Gate::forUser($actor)->authorize('admin.'.$ability);

        return $actor;
    }
}
