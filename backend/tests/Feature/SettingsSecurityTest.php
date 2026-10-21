<?php

declare(strict_types=1);

use App\Filament\Pages\SecureSettings;
use App\Models\ActivityLog;
use App\Models\Brand;
use App\Models\Setting;
use App\Models\User;
use App\Services\Settings;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Livewire\Livewire;

uses(RefreshDatabase::class);

it('encrypts values at rest and returns only constant masks and presence flags', function () {
    $secret = bin2hex(random_bytes(24));
    $settings = app(Settings::class);
    $settings->write('integration_secret', $secret);
    $raw = DB::table('settings')->where('key', 'integration_secret')->value('value');
    expect($raw)->not->toContain($secret);
    expect(Setting::where('key', 'integration_secret')->first()->value)->toBe($secret);
    expect(json_encode(Setting::all()))->not->toContain($secret, $raw);
    expect(json_encode($settings->statuses()))->not->toContain($secret, $raw);
    expect($settings->statuses()[0]->jsonSerialize())->toBe(['key' => 'integration_secret', 'isSet' => true, 'masked' => '••••••••']);
    foreach ([null, ''] as $empty) {
        $settings->write('integration_secret', $empty);
        expect(DB::table('settings')->where('key', 'integration_secret')->value('value'))->toBe($raw);
    }
    $settings->write('integration_secret', $secret.'new');
    expect(Setting::where('key', 'integration_secret')->first()->value)->toBe($secret.'new');
});

it('protects settings API and rejects invalid input without exposing secret in responses or logs', function () {
    $secret = bin2hex(random_bytes(24));
    Log::spy();
    $this->getJson('/api/admin/settings')->assertUnauthorized();
    $this->actingAs(User::factory()->create())->getJson('/api/admin/settings')->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => 'admin']));
    $this->putJson('/api/admin/settings', ['key' => 'integration_secret', 'newValue' => $secret])->assertOk()->assertDontSee($secret);
    $raw = DB::table('settings')->where('key', 'integration_secret')->value('value');
    foreach ([[], ['newValue' => '']] as $input) {
        $this->putJson('/api/admin/settings', ['key' => 'integration_secret', ...$input])->assertOk()->assertDontSee($secret);
        expect(DB::table('settings')->where('key', 'integration_secret')->value('value'))->toBe($raw);
    }
    $this->getJson('/api/admin/settings')->assertOk()->assertDontSee($secret)->assertDontSee($raw);
    $this->putJson('/api/admin/settings', ['key' => 'invalid', 'newValue' => $secret])->assertUnprocessable()->assertDontSee($secret);
    $this->putJson('/api/admin/settings', ['key' => 'integration_secret', 'newValue' => $secret, 'value' => 'injection'])->assertUnprocessable()->assertDontSee($secret);
    Log::shouldNotHaveReceived('error');
    Log::shouldNotHaveReceived('warning');
    Log::shouldNotHaveReceived('info');
    try {
        app(Settings::class)->write('invalid', $secret);
        $this->fail('Invalid key was accepted.');
    } catch (ValidationException $exception) {
        expect($exception->getMessage().json_encode($exception->errors()).$exception->getTraceAsString())->not->toContain($secret);
    }
});

it('never hydrates stored secrets and clears submitted secrets from Filament success and validation payloads', function () {
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    Filament::bootCurrentPanel();
    $this->actingAs(User::factory()->create(['role' => 'admin']));
    $secret = bin2hex(random_bytes(24));
    app(Settings::class)->write('integration_secret', $secret);
    $component = Livewire::test(SecureSettings::class);
    expect(json_encode([$component->snapshot, $component->effects]))->not->toContain($secret);
    $new = bin2hex(random_bytes(24));
    $component->update(updates: ['newValue' => $new], calls: [['method' => 'save', 'params' => [], 'path' => '']])->assertHasNoErrors()->assertSet('newValue', '');
    expect(Setting::where('key', 'integration_secret')->first()->value)->toBe($new);
    expect(json_encode([$component->snapshot, $component->effects]))->not->toContain($secret, $new);
    $component->call('save');
    expect(Setting::where('key', 'integration_secret')->first()->value)->toBe($new);
    $component->update(updates: ['newValue' => str_repeat($new, 100)], calls: [['method' => 'save', 'params' => [], 'path' => '']])->assertHasErrors(['newValue']);
    expect(json_encode([$component->snapshot, $component->effects]))->not->toContain($new);
    $this->actingAs(User::factory()->create())->get(SecureSettings::getUrl())->assertForbidden();
});

it('records admin create update delete with identity IP time and default-deny redacted snapshots', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $this->actingAs($actor);
    $category = (new Brand)->forceFill(['name' => 'Private name', 'slug' => 'audit-fixture']);
    $category->save();
    $category->forceFill(['name' => 'Private changed name'])->save();
    $category->delete();
    $logs = ActivityLog::where('module', 'brands')->orderBy('id')->get();
    expect($logs->pluck('action')->all())->toBe(['create', 'update', 'delete']);
    foreach ($logs as $log) {
        expect($log->user_id)->toBe($actor->id);
        expect($log->user_role)->toBe('admin');
        expect($log->ip_address)->not->toBeNull();
        expect($log->created_at)->not->toBeNull();
    }
    expect($logs[1]->before['name'])->toBe('[REDACTED]');
    expect($logs[1]->after['name'])->toBe('[REDACTED]');
    $secret = bin2hex(random_bytes(24));
    app(Settings::class)->write('integration_secret', $secret);
    expect(json_encode(ActivityLog::all()))->not->toContain($secret, 'Private name', 'Private changed name');
    expect(ActivityLog::where('module', 'settings')->first()->after['value'])->toBe('[REDACTED]');
});

it('replaces failing secret-write exceptions with a safe unchained error', function () {
    $secret = bin2hex(random_bytes(24));
    Setting::saving(function () use ($secret): void {
        throw new RuntimeException($secret);
    });
    try {
        app(Settings::class)->write('integration_secret', $secret);
        $this->fail('Write should fail.');
    } catch (RuntimeException $exception) {
        expect($exception->getMessage())->toBe('Unable to save setting.');
        expect($exception->getPrevious())->toBeNull();
        expect($exception->getTraceAsString())->not->toContain($secret);
    }
    expect(Setting::count())->toBe(0);
});
