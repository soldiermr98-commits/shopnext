<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

final class CatalogAccess
{
    public function lock(User $actor, string $model): User
    {
        if (DB::transactionLevel() === 0) {
            throw new \LogicException('Catalog locks require a transaction.');
        }
        $actor = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
        Gate::forUser($actor)->authorize('viewAny', $model);
        if (DB::table('catalog_locks')->where('name', 'taxonomy')->lockForUpdate()->first() === null) {
            throw new \RuntimeException('Catalog serialization lock is missing.');
        }

        return $actor;
    }
}
