<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\QueuePulse;
use App\Jobs\ReviewOrders;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;

final class CronTick extends Command
{
    protected $signature = 'shopnext:tick';

    protected $description = 'Record cron heartbeat and drain a bounded database queue in process';

    public function handle(): int
    {
        DB::table('scheduler_heartbeats')->updateOrInsert(['name' => 'cron'], ['started_at' => now(), 'worker_failed' => true]);
        try {
            if (config('queue.default') !== 'database') {
                throw new \RuntimeException('Database queue required.');
            }
            $failures = DB::table('failed_jobs')->count();
            Queue::connection('database')->push(new QueuePulse);
            Queue::connection('database')->push(new ReviewOrders);
            $result = Artisan::call('queue:work', ['connection' => 'database', '--queue' => 'default', '--stop-when-empty' => true, '--max-time' => 50, '--timeout' => 40, '--tries' => 3, '--sleep' => 1]);
            $failed = $result !== 0 || DB::table('failed_jobs')->count() > $failures;
            DB::table('scheduler_heartbeats')->where('name', 'cron')->update(['completed_at' => now(), 'worker_completed_at' => now(), 'worker_failed' => $failed]);

            return $failed ? self::FAILURE : self::SUCCESS;
        } catch (\Throwable) {
            $this->error('Cron worker failed; inspect private diagnostics.');

            return self::FAILURE;
        }
    }
}
