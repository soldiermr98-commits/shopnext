<?php

declare(strict_types=1);

use App\Filament\Widgets\CronHeartbeat;
use App\Models\User;
use App\Services\DeployHealth;
use App\Services\Heartbeat;
use Filament\Facades\Filament;
use Illuminate\Container\Container;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Facade;
use Illuminate\Support\Facades\Schedule;
use Livewire\Livewire;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['queue.default' => 'database', 'cache.default' => 'database']);
});

it('runs the real scheduled bounded database worker and proves a queued heartbeat was processed', function () {
    $events = collect(Schedule::events())->filter(fn ($event) => $event->description === 'shopnext-minute');
    expect($events)->toHaveCount(1);
    expect($events->first()->expression)->toBe('* * * * *');
    expect($events->first()->withoutOverlapping)->toBeTrue();
    $this->artisan('schedule:run')->assertExitCode(0);
    expect(DB::table('scheduler_heartbeats')->where('name', 'queue')->value('completed_at'))->not->toBeNull();
    expect(DB::table('jobs')->count())->toBe(0);
    expect(app(Heartbeat::class)->status())->toMatchArray(['stale' => false, 'workerHealthy' => true, 'minutes' => 0]);
});

it('warns for never-run stale clock-skewed and failed worker heartbeats', function () {
    expect(app(Heartbeat::class)->status()['stale'])->toBeTrue();
    $this->artisan('shopnext:tick')->assertExitCode(0);
    $this->travel(4)->minutes();
    expect(app(Heartbeat::class)->status())->toMatchArray(['stale' => true, 'workerHealthy' => false]);
    $this->travelBack();
    DB::table('scheduler_heartbeats')->where('name', 'cron')->update(['completed_at' => now()->addMinutes(5)]);
    expect(app(Heartbeat::class)->status()['stale'])->toBeTrue();
    config(['queue.default' => 'sync']);
    $this->artisan('shopnext:tick')->assertExitCode(1);
    expect(app(Heartbeat::class)->status()['workerHealthy'])->toBeFalse();
});

it('renders cron age and warning on the authorized Filament dashboard widget', function () {
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    Filament::bootCurrentPanel();
    $this->actingAs(User::factory()->create(['role' => 'admin']));
    Livewire::test(CronHeartbeat::class)->assertSee('هنوز اجرا نشده')->assertSee('هشدار:');
    $this->artisan('shopnext:tick')->assertExitCode(0);
    Livewire::test(CronHeartbeat::class)->assertSee('۰ دقیقه پیش')->assertDontSee('هشدار:');
    $this->actingAs(User::factory()->create());
    expect(CronHeartbeat::canView())->toBeFalse();
});

it('passes deploy-check against actual PHP extensions and each real matrix database with a fresh queue probe', function () {
    config(['app.env' => 'production', 'app.debug' => false, 'app.url' => 'https://shop.example']);
    $this->artisan('shopnext:tick')->assertExitCode(0);
    foreach (['cache.config', 'cache.routes', 'cache.filament', 'cache.icons'] as $name) {
        expect(app(DeployHealth::class)->checks()[$name][0], $name)->toBeFalse();
    }
    try {
        $this->artisan('optimize')->assertExitCode(0);
        $this->artisan('filament:optimize')->assertExitCode(0);
        // Cache commands bootstrap a fresh container; restore the test application
        // and its real transaction connection, not a second uncommitted-data reader.
        Container::setInstance($this->app);
        Facade::setFacadeApplication($this->app);
        Facade::clearResolvedInstances();
        expect(config('app.env'))->toBe('production');
        $checks = app(DeployHealth::class)->checks();
        foreach ($checks as $name => [$passed, $detail]) {
            expect($passed)->toBeTrue($name.': '.$detail);
        }
        $this->artisan('deploy-check')->assertExitCode(0);
    } finally {
        Artisan::call('optimize:clear');
        Artisan::call('filament:optimize-clear');
    }
});

it('fails deploy-check for unsafe environment invalid key stale cron non-database queue and failed queue history', function () {
    config(['app.env' => 'production', 'app.debug' => true, 'app.key' => '', 'app.url' => 'http://shop.example', 'queue.default' => 'sync']);
    $checks = app(DeployHealth::class)->checks();
    foreach (['env.debug', 'env.key', 'env.origin', 'cron', 'queue.driver', 'queue.worker'] as $name) {
        expect($checks[$name][0], $name)->toBeFalse();
    }
    $this->artisan('deploy-check')->assertExitCode(1);
    DB::table('jobs')->insert(['queue' => 'default', 'payload' => '{}', 'attempts' => 0, 'reserved_at' => null, 'available_at' => now()->timestamp - 400, 'created_at' => now()->timestamp - 400]);
    expect(app(DeployHealth::class)->checks()['queue.health'][0])->toBeFalse();
});

it('does not expose connection exception credentials in deploy-check output', function () {
    $secret = bin2hex(random_bytes(24));
    DB::shouldReceive('connection')->andThrow(new RuntimeException('Private '.$secret));
    Artisan::call('deploy-check');
    expect(Artisan::output())->toContain('database: FAIL')->not->toContain($secret);
});

it('fails readiness for stuck reserved jobs failed jobs unwritable paths and URL credentials', function () {
    DB::table('jobs')->insert(['queue' => 'default', 'payload' => '{}', 'attempts' => 1, 'reserved_at' => now()->timestamp - 130, 'available_at' => now()->timestamp, 'created_at' => now()->timestamp]);
    expect(app(DeployHealth::class)->checks()['queue.health'][0])->toBeFalse();
    DB::table('jobs')->delete();
    DB::table('failed_jobs')->insert(['uuid' => bin2hex(random_bytes(16)), 'connection' => 'database', 'queue' => 'default', 'payload' => '{}', 'exception' => 'Fixture failure', 'failed_at' => now()]);
    expect(app(DeployHealth::class)->checks()['queue.health'][0])->toBeFalse();
    config(['app.url' => 'https://operator@shop.example']);
    expect(app(DeployHealth::class)->checks()['env.origin'][0])->toBeFalse();
    $base = base_path();
    try {
        app()->setBasePath(storage_path('framework/testing/nonexistent-'.bin2hex(random_bytes(8))));
        $checks = app(DeployHealth::class)->checks();
        expect($checks['storage'][0])->toBeFalse();
        expect($checks['bootstrap.cache'][0])->toBeFalse();
        expect($checks['env.file'][0])->toBeFalse();
    } finally {
        app()->setBasePath($base);
    }
});
