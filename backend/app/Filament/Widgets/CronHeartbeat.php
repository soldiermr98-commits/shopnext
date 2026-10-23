<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Services\Heartbeat;
use App\Services\ImageHostHealth;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Gate;

final class CronHeartbeat extends Widget
{
    protected string $view = 'filament.widgets.cron-heartbeat';

    public static function canView(): bool
    {
        $actor = auth('web')->user()?->fresh();

        return $actor !== null && Gate::forUser($actor)->allows('dashboard');
    }

    public function imageHealth(): array
    {
        abort_unless(self::canView(), 403);

        return app(ImageHostHealth::class)->report();
    }

    public function status(): array
    {
        abort_unless(self::canView(), 403);

        return app(Heartbeat::class)->status();
    }
}
