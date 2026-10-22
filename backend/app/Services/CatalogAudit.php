<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

final class CatalogAudit
{
    private const SAFE = ['id', 'name', 'title', 'slug', 'origin_country', 'is_official', 'image', 'logo', 'parent_id', 'order_index', 'status', 'type', 'price', 'sale_price', 'brand_id', 'hex', 'attribute_id', 'sku', 'published_at', 'deleted_at'];

    public function write(User $actor, Model $record, string $action, array $before, array $after): void
    {
        if (DB::transactionLevel() === 0) {
            throw new \LogicException('Catalog audit requires the mutation transaction.');
        }
        $changed = [];
        foreach (array_unique([...array_keys($before), ...array_keys($after)]) as $key) {
            if (($before[$key] ?? null) !== ($after[$key] ?? null)) {
                $changed[] = $key;
            }
        }
        (new ActivityLog)->forceFill([
            'user_id' => $actor->id, 'user_name' => $actor->name, 'user_role' => $actor->role,
            'action' => $action, 'module' => $record->getTable(), 'subject_id' => (string) $record->getKey(),
            'changed_fields' => $changed, 'before' => $this->redact($before), 'after' => $this->redact($after),
            'ip_address' => request()->ip(),
        ])->save();
    }

    private function redact(array $attributes): array
    {
        foreach ($attributes as $key => $value) {
            if (! in_array($key, self::SAFE, true)) {
                $attributes[$key] = '[REDACTED]';
            }
        }

        return $attributes;
    }
}
