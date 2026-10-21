<?php

declare(strict_types=1);

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class Heartbeat
{
    public function status(): array
    {
        $cron = DB::table('scheduler_heartbeats')->where('name', 'cron')->first();
        $queue = DB::table('scheduler_heartbeats')->where('name', 'queue')->first();
        $age = $cron?->completed_at ? (int) CarbonImmutable::parse($cron->completed_at, 'UTC')->diffInSeconds(now(), false) : null;
        $queueAge = $queue?->completed_at ? (int) CarbonImmutable::parse($queue->completed_at, 'UTC')->diffInSeconds(now(), false) : null;

        return [
            'minutes' => $age === null ? null : (int) floor(max(0, $age) / 60),
            'stale' => $age === null || $age < -60 || $age > 180,
            'workerHealthy' => $queueAge !== null && $queueAge >= -60 && $queueAge <= 180 && ! ($cron?->worker_failed ?? true),
        ];
    }
}
