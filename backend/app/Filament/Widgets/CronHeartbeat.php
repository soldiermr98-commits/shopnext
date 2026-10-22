<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Services\Heartbeat;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Gate;

final class CronHeartbeat extends Widget
{
    protected string $view = 'filament.widgets.cron-heartbeat';

    public static function canView(): bool
    {
        return Gate::allows('dashboard');
    }

    public function status(): array
    {
        abort_unless(static::canView(), 403);

        return app(Heartbeat::class)->status();
    }
}
