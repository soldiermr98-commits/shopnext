<?php

declare(strict_types=1);

use App\Filament\Pages\SecureSettings;
use App\Filament\Pages\StaffDashboard;
use App\Filament\Widgets\CronHeartbeat;
use App\Http\Middleware\AdminLocale;
use App\Models\User;
use App\Services\Heartbeat;
use App\Support\Persian;
use Filament\Facades\Filament;
use Filament\FontProviders\LocalFontProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Livewire\Livewire;
use Livewire\Mechanisms\PersistentMiddleware\PersistentMiddleware;

uses(RefreshDatabase::class);

it('L3a renders a Persian RTL panel with only the local Vazirmatn font and scoped locale', function () {
    app()->setLocale('en');
    $this->get('https://localhost/admin/login')->assertOk()->assertSee('lang="fa"', false)->assertSee('dir="rtl"', false)->assertSee('/fonts/vazirmatn.css', false)->assertDontSee('fonts.bunny.net')->assertDontSee('fonts.googleapis.com');
    expect(app()->getLocale())->toBe('en');
    $panel = Filament::getPanel('admin');
    expect($panel->getFontFamily())->toBe('Vazirmatn');
    expect($panel->getFontProvider())->toBe(LocalFontProvider::class);
    expect(app(PersistentMiddleware::class)->getPersistentMiddleware())->toContain(AdminLocale::class);
});

it('L3a authorizes dashboard widget and secret page independently for each legacy role', function (string $role, bool $dashboard, bool $settings) {
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    Filament::bootCurrentPanel();
    $this->actingAs(User::factory()->create(['role' => $role]), 'web');
    expect(StaffDashboard::canAccess())->toBe($dashboard);
    expect(CronHeartbeat::canView())->toBe($dashboard);
    expect(SecureSettings::canAccess())->toBe($settings);
    expect(CronHeartbeat::isLazy())->toBeTrue();
    if ($dashboard) {
        $this->get('https://localhost/admin')->assertOk()->assertSee('پیشخوان مدیریت');
        Livewire::test(CronHeartbeat::class)->assertSee('هنوز اجرا نشده')->assertSee('هشدار:');
    } else {
        $this->get('https://localhost/admin')->assertForbidden();
        Livewire::test(CronHeartbeat::class)->assertForbidden();
    }
})->with([
    ['super_admin', true, true], ['admin', true, true], ['shop_manager', true, false],
    ['content_editor', false, false], ['support', false, false], ['customer', false, false],
]);

it('L3a reads heartbeat with two bounded queries and formats Persian integers without altering values', function () {
    DB::enableQueryLog();
    DB::flushQueryLog();
    app(Heartbeat::class)->status();
    $queries = DB::getQueryLog();
    DB::disableQueryLog();
    expect($queries)->toHaveCount(2);
    expect(Persian::digits('0123456789 -12'))->toBe('۰۱۲۳۴۵۶۷۸۹ -۱۲');
    expect(Persian::digits(0))->toBe('۰');
});
