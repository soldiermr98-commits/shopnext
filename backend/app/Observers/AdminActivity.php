<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\ActivityLog;
use App\Support\Permissions;
use Illuminate\Database\Eloquent\Model;

final class AdminActivity
{
    // Default redact: adding a model attribute cannot accidentally opt it into logging.
    private const SAFE = ['id', 'key', 'title', 'slug', 'status', 'is_active', 'role', 'must_change_password'];

    public function created(Model $model): void
    {
        $this->record($model, 'create', [], $model->getAttributes());
    }

    public function updated(Model $model): void
    {
        $this->record($model, 'update', $model->getRawOriginal(), $model->getAttributes());
    }

    public function deleted(Model $model): void
    {
        $this->record($model, 'delete', $model->getAttributes(), []);
    }

    private function redact(array $attributes): array
    {
        $result = [];
        foreach ($attributes as $key => $value) {
            $result[$key] = in_array($key, self::SAFE, true) ? $value : '[REDACTED]';
        }

        return $result;
    }

    private function record(Model $model, string $action, array $before, array $after): void
    {
        $actor = auth('web')->user();
        if (! $actor || ! Permissions::allows($actor, 'dashboard')) {
            return;
        }
        (new ActivityLog)->forceFill([
            'user_id' => $actor->id, 'actor_role' => $actor->role,
            'action' => $action, 'module' => $model->getTable(), 'subject_id' => (string) $model->getKey(),
            'changed_fields' => array_keys($model->getChanges()),
            'before' => $this->redact($before), 'after' => $this->redact($after),
            'ip_address' => request()->ip(),
        ])->save();
    }
}
