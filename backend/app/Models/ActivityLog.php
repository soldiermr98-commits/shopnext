<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $table = 'activity_logs';

    protected $hidden = ['details'];

    protected function casts(): array
    {
        return ['before' => 'array', 'after' => 'array', 'changed_fields' => 'array'];
    }
}
