<?php

declare(strict_types=1);

namespace App\Providers\Filament;

use App\Filament\Auth\StaffLogin;
use App\Filament\Auth\StaffProfile;
use App\Filament\Pages\AttributeEditor;
use App\Filament\Pages\AttributeTermEditor;
use App\Filament\Pages\BrandEditor;
use App\Filament\Pages\CategoryEditor;
use App\Filament\Pages\ProductContentEditor;
use App\Filament\Pages\SecureSettings;
use App\Filament\Pages\StaffDashboard;
use App\Filament\Widgets\CronHeartbeat;
use App\Http\Middleware\AdminLocale;
use Filament\FontProviders\LocalFontProvider;
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
            ->brandName('Shopnext')->font('Vazirmatn', url: fn (): string => asset('fonts/vazirmatn.css'), provider: LocalFontProvider::class)->login(StaffLogin::class)->profile(StaffProfile::class, isSimple: true)
            ->pages([StaffDashboard::class, SecureSettings::class, CategoryEditor::class, BrandEditor::class, AttributeEditor::class, AttributeTermEditor::class, ProductContentEditor::class])->widgets([CronHeartbeat::class])
            // Only the locale middleware persists onto Livewire; no remote font provider.
            ->middleware([AdminLocale::class], isPersistent: true)
            ->middleware([
                EncryptCookies::class, AddQueuedCookiesToResponse::class, StartSession::class,
                AuthenticateSession::class, ShareErrorsFromSession::class, ValidateCsrfToken::class,
                SubstituteBindings::class, DisableBladeIconComponents::class, DispatchServingFilamentEvent::class,
            ])->authMiddleware([Authenticate::class]);
    }
}
