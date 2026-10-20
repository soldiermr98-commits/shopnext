<?php

declare(strict_types=1);

use App\Models\ActivityLog;
use App\Models\Address;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

dataset('legacy role action matrix', function () {
    // Expectations deliberately independent from Permissions::MATRIX.
    $actions = [
        ['viewAny', Product::class, true], ['create', Product::class, true], ['update', new Product, true], ['delete', new Product, true],
        ['viewAny', Order::class, true], ['updateStatus', new Order, true], ['viewAny', User::class, true],
        ['viewAny', Setting::class, false], ['update', new Setting, false], ['viewAny', ActivityLog::class, false],
        ['dashboard', null, true],
    ];
    foreach (['super_admin', 'admin', 'shop_manager', 'content_editor', 'support', 'customer'] as $role) {
        foreach ($actions as $i => [$ability, $model, $managerAllowed]) {
            yield "{$role}/{$i}/{$ability}" => [$role, $ability, $model, in_array($role, ['super_admin', 'admin'], true) || ($role === 'shop_manager' && $managerAllowed)];
        }
    }
});

it('preserves the independent six-role eleven-action legacy permission matrix', function (string $role, string $ability, mixed $model, bool $expected) {
    $user = User::factory()->create(['role' => $role]);
    expect(Gate::forUser($user)->allows($ability, $model === null ? [] : [$model]))->toBe($expected);
})->with('legacy role action matrix');

it('denies every privileged matrix action to inactive and forced-change staff', function (string $field) {
    $user = User::factory()->create(['role' => 'super_admin', $field => $field === 'must_change_password']);
    expect(Gate::forUser($user)->allows('dashboard'))->toBeFalse();
    foreach ([Product::class, Order::class, User::class, Setting::class] as $model) {
        expect(Gate::forUser($user)->allows('viewAny', $model))->toBeFalse();
    }
})->with(['is_active', 'must_change_password']);

it('enforces owner reads without permitting financial mutations', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $order = new Order(['user_id' => $owner->id]);
    $address = new Address(['user_id' => $owner->id]);
    expect(Gate::forUser($owner)->allows('view', $order))->toBeTrue();
    expect(Gate::forUser($other)->allows('view', $order))->toBeFalse();
    expect(Gate::forUser($owner)->allows('updateStatus', $order))->toBeFalse();
    expect(Gate::forUser($owner)->allows('update', $address))->toBeTrue();
    expect(Gate::forUser($other)->allows('update', $address))->toBeFalse();
    $admin = User::factory()->create(['role' => 'super_admin']);
    expect(Gate::forUser($admin)->allows('delete', $order))->toBeFalse();
});

it('assigns an explicit default-deny policy to every application model', function () {
    $admin = User::factory()->create(['role' => 'super_admin']);
    foreach (glob(app_path('Models/*.php')) as $path) {
        $class = 'App\\Models\\'.basename($path, '.php');
        expect(Gate::getPolicyFor($class))->not->toBeNull();
        expect(Gate::forUser($admin)->allows('forceDelete', new $class))->toBeFalse();
    }
    expect(Permissions::allows($admin, 'unknown-resource'))->toBeFalse();
});
