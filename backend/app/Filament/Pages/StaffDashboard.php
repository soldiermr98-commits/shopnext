<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use Filament\Pages\Dashboard;
use Illuminate\Support\Facades\Gate;

final class StaffDashboard extends Dashboard
{
    public function getTitle(): string
    {
        return 'پیشخوان مدیریت';
    }

    public static function canAccess(): bool
    {
        return Gate::allows('dashboard');
    }
}
