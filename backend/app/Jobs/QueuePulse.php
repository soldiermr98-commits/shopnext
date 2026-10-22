<?php

declare(strict_types=1);

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

final class QueuePulse implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 10;

    public function handle(): void
    {
        DB::table('scheduler_heartbeats')->updateOrInsert(['name' => 'queue'], ['completed_at' => now(), 'worker_failed' => false]);
    }
}
