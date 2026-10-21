<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// One schedule:run cron entry. In-process worker avoids proc_open/Supervisor.
Schedule::call(fn () => Artisan::call('shopnext:tick'))->everyMinute()->name('shopnext-minute')->withoutOverlapping(2);
