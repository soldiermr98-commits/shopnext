<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchedulerHeartbeat extends Model
{
    protected $table = 'scheduler_heartbeats';

    protected $primaryKey = 'name';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;
}
