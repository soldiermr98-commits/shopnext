<?php

declare(strict_types=1);

use App\Filament\Auth\StaffLogin;
use App\Filament\Auth\StaffProfile;
use App\Models\User;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Livewire\Livewire;

uses(RefreshDatabase::class);

beforeEach(function () {
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    Filament::bootCurrentPanel();
});

it('uses a local-assets Filament login and no commercial resources', function () {
    $response = $this->get('/admin/login');
    $response->assertOk();
    expect($response->getContent())->not->toContain('fonts.bunny.net', 'fonts.googleapis.com', 'ui-avatars.com');
    expect(Filament::getPanel('admin')->getResources())->toBeEmpty();
    Livewire::test(StaffLogin::class)->assertFormFieldIsHidden('remember');
    expect(is_file(public_path('images/staff-avatar.svg')))->toBeTrue();
});

it('accepts only authorized active staff at the Filament credential boundary', function (string $role, bool $allowed) {
    $password = bin2hex(random_bytes(16));
    $user = User::factory()->create(['role' => $role, 'password' => $password]);
    $component = Livewire::test(StaffLogin::class)->fillForm(['email' => $user->email, 'password' => $password])->call('authenticate');
    if ($allowed) {
        $component->assertHasNoFormErrors();
        $this->assertAuthenticatedAs($user, 'web');
    } else {
        $component->assertHasFormErrors(['email']);
        $this->assertGuest('web');
    }
})->with([['super_admin', true], ['admin', true], ['shop_manager', true], ['content_editor', false], ['support', false], ['customer', false]]);

it('denies inactive staff and direct customer panel access', function () {
    $inactive = User::factory()->create(['role' => 'admin', 'is_active' => false]);
    expect($inactive->canAccessPanel(Filament::getPanel('admin')))->toBeFalse();
    $this->actingAs(User::factory()->create())->get('/admin')->assertForbidden();
});

it('forces initial staff to the password profile and denies dashboard until current-password proof', function () {
    $old = bin2hex(random_bytes(16));
    $new = bin2hex(random_bytes(16));
    $user = User::factory()->create(['role' => 'admin', 'password' => $old, 'must_change_password' => true]);
    Livewire::test(StaffLogin::class)->fillForm(['email' => $user->email, 'password' => $old])->call('authenticate')->assertRedirect(StaffProfile::getUrl());
    $this->get('/admin')->assertForbidden();
    Livewire::test(StaffProfile::class)->fillForm(['password' => $new, 'passwordConfirmation' => $new, 'currentPassword' => 'wrong'])->call('save')->assertHasFormErrors(['currentPassword']);
    expect($user->fresh()->must_change_password)->toBeTrue();
    DB::table('sessions')->insert(['id' => 'other-staff-device', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);
    Livewire::test(StaffProfile::class)->fillForm(['password' => $new, 'passwordConfirmation' => $new, 'currentPassword' => $old])->call('save')->assertHasNoFormErrors();
    expect($user->fresh()->must_change_password)->toBeFalse();
    expect(Hash::check($new, $user->fresh()->password))->toBeTrue();
    expect(DB::table('sessions')->where('id', 'other-staff-device')->exists())->toBeFalse();
    $this->get('/admin')->assertOk();
});

it('provisions once from private environment configuration with no default reset', function () {
    $this->artisan('shopnext:provision-admin')->assertExitCode(1);
    $password = bin2hex(random_bytes(16));
    config(['security.admin_name' => 'Fixture admin', 'security.admin_phone' => '09100000009', 'security.admin_email' => 'admin@example.invalid', 'security.admin_initial_password' => $password]);
    $this->artisan('shopnext:provision-admin')->assertExitCode(0);
    $user = User::sole();
    expect($user->role)->toBe('super_admin');
    expect($user->must_change_password)->toBeTrue();
    expect(Hash::check($password, $user->password))->toBeTrue();
    $this->artisan('shopnext:provision-admin')->assertExitCode(1);
    expect(User::count())->toBe(1);
});
