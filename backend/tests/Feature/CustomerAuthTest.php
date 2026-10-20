<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tests\Support\EnforcedCsrf;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['session.driver' => 'database', 'cache.default' => 'database']);
    $this->app->bind(ValidateCsrfToken::class, EnforcedCsrf::class);
    $this->withServerVariables(['HTTPS' => 'on']);
});

function browserCookies(TestResponse $response): void
{
    $test = test();
    foreach ($response->headers->getCookies() as $cookie) {
        $test->withUnencryptedCookie($cookie->getName(), $cookie->getValue());
        if ($cookie->getName() === 'XSRF-TOKEN') {
            $test->withHeader('X-XSRF-TOKEN', $cookie->getValue());
        }
    }
    Auth::forgetGuards(); // Simulate a fresh PHP request, not a cached testing guard identity.
}

function browserCsrf(): void
{
    $response = test()->get('/sanctum/csrf-cookie');
    $response->assertNoContent();
    browserCookies($response);
}

it('rejects guest and bearer authentication without token-table fallbacks', function () {
    $this->getJson('/api/auth/me')->assertUnauthorized();
    $this->withHeader('Authorization', 'Bearer invalid')->getJson('/api/auth/me')->assertUnauthorized();
});

it('enforces real CSRF instead of the framework unit-test bypass', function () {
    $this->postJson('/api/auth/login', ['identifier' => '09100000000', 'password' => 'irrelevant'])->assertStatus(419);
    browserCsrf();
    $this->withHeader('X-XSRF-TOKEN', 'forged')->postJson('/api/auth/login', ['identifier' => '09100000000', 'password' => 'irrelevant'])->assertStatus(419);
});

it('logs a customer in with secure cookies, rotates session, reads identity then logs out', function () {
    $password = bin2hex(random_bytes(16));
    $user = User::factory()->create(['password' => $password]);
    browserCsrf();
    $old = DB::table('sessions')->pluck('id')->all();
    $response = $this->postJson('/api/auth/login', ['identifier' => $user->phone, 'password' => $password]);
    $response->assertOk()->assertJsonPath('user.id', (string) $user->id)->assertJsonMissingPath('token')->assertJsonMissingPath('user.password');
    $cookie = $response->getCookie('__Host-shopnext_session', false);
    expect($cookie->isSecure())->toBeTrue();
    expect($cookie->isHttpOnly())->toBeTrue();
    expect($cookie->getSameSite())->toBe('strict');
    expect($cookie->getDomain())->toBeNull();
    expect(DB::table('sessions')->whereIn('id', $old)->exists())->toBeFalse();
    browserCookies($response);
    $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.id', (string) $user->id);
    Auth::forgetGuards();
    $logout = $this->postJson('/api/auth/logout');
    $logout->assertOk();
    browserCookies($logout);
    $this->getJson('/api/auth/me')->assertUnauthorized();
});

it('normalizes phone registration and rejects privilege injection', function () {
    browserCsrf();
    $data = ['name' => 'مشتری', 'phone' => '+۹۸۹۱۰۰۰۰۰۰۰۰۱', 'password' => bin2hex(random_bytes(16))];
    $this->postJson('/api/auth/register', [...$data, 'role' => 'super_admin'])->assertUnprocessable();
    $response = $this->postJson('/api/auth/register', $data);
    $response->assertCreated()->assertJsonPath('user.role', 'customer')->assertJsonPath('user.phone', '09100000001');
    $user = User::firstOrFail();
    expect(Hash::check($data['password'], $user->password))->toBeTrue();
});

it('denies inactive accounts, unknown accounts and staff at the customer login boundary', function (string $kind) {
    $password = bin2hex(random_bytes(16));
    $user = User::factory()->create(['password' => $password, 'is_active' => $kind !== 'inactive', 'role' => $kind === 'staff' ? 'admin' : 'customer']);
    browserCsrf();
    $this->postJson('/api/auth/login', ['identifier' => $kind === 'unknown' ? 'unknown@example.invalid' : $user->email, 'password' => $password])->assertUnauthorized()->assertJsonPath('message', 'Invalid credentials.');
})->with(['inactive', 'unknown', 'staff']);

it('keeps both OTP operations disabled and independently rate limited', function (string $operation) {
    browserCsrf();
    $data = ['phone' => '09100000000'];
    if ($operation === 'verify') {
        $data['code'] = '123456';
    }
    for ($i = 0; $i < 3; $i++) {
        $this->postJson('/api/auth/otp/'.$operation, $data)->assertStatus(503);
    }
    $this->postJson('/api/auth/otp/'.$operation, $data)->assertTooManyRequests();
    expect(User::count())->toBe(0);
    expect(DB::table('cache')->count())->toBeGreaterThan(0);
})->with(['send', 'verify']);

it('limits login attempts by identity using persistent cache', function () {
    browserCsrf();
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/auth/login', ['identifier' => '09100000000', 'password' => 'irrelevant'])->assertUnauthorized();
    }
    $this->postJson('/api/auth/login', ['identifier' => '09100000000', 'password' => 'irrelevant'])->assertTooManyRequests();
});

it('requires current password, clears the initial-change flag and revokes other database sessions', function () {
    $old = bin2hex(random_bytes(16));
    $new = bin2hex(random_bytes(16));
    $user = User::factory()->create(['password' => $old, 'must_change_password' => true]);
    browserCsrf();
    $login = $this->postJson('/api/auth/login', ['identifier' => $user->phone, 'password' => $old]);
    $login->assertOk();
    browserCookies($login);
    DB::table('sessions')->insert(['id' => 'other-device', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);
    $this->postJson('/api/auth/change-password', ['newPassword' => $new])->assertUnprocessable();
    $this->postJson('/api/auth/change-password', ['oldPassword' => 'wrong', 'newPassword' => $new])->assertUnprocessable();
    $changed = $this->postJson('/api/auth/change-password', ['oldPassword' => $old, 'newPassword' => $new]);
    $changed->assertOk()->assertJsonPath('user.mustChangePassword', false);
    expect(DB::table('sessions')->where('id', 'other-device')->exists())->toBeFalse();
    expect(Hash::check($new, $user->fresh()->password))->toBeTrue();
    browserCookies($changed);
    $this->getJson('/api/auth/me')->assertOk();
});
