<?php

declare(strict_types=1);

namespace App\Providers\Filament;

use App\Filament\Auth\StaffLogin;
use App\Filament\Auth\StaffProfile;
use App\Filament\Pages\SecureSettings;
use App\Filament\Pages\StaffDashboard;
use App\Filament\Widgets\CronHeartbeat;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Panel;
use Filament\PanelProvider;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\AuthenticateSession;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

final class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel->default()->id('admin')->path('admin')->authGuard('web')
            ->brandName('Shopnext')->login(StaffLogin::class)->profile(StaffProfile::class, isSimple: true)
            ->pages([StaffDashboard::class, SecureSettings::class])->widgets([CronHeartbeat::class])
            // Default Filament font provider uses locally published bundled fonts, not a CDN.
            ->middleware([
                EncryptCookies::class, AddQueuedCookiesToResponse::class, StartSession::class,
                AuthenticateSession::class, ShareErrorsFromSession::class, ValidateCsrfToken::class,
                SubstituteBindings::class, DisableBladeIconComponents::class, DispatchServingFilamentEvent::class,
            ])->authMiddleware([Authenticate::class]);
    }
}
