<?php

declare(strict_types=1);

use App\Models\User;
use App\Services\AdminAccess;
use App\Support\AdminCapabilities;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

it('L3b independently defines every cell of the six role panel capability matrix', function (string $role, array $allowed) {
    $actor = User::factory()->create(['role' => $role]);
    $abilities = ['orders.view', 'orders.status', 'orders.cancel', 'orders.refund', 'orders.receipt', 'orders.collected', 'orders.manual', 'orders.tracking', 'orders.notes', 'orders.export', 'orders.print', 'orders.labels', 'customers.view', 'customers.notes', 'customers.block', 'customers.wallet', 'customers.export', 'pii.full'];
    expect(array_keys(AdminCapabilities::MATRIX))->toBe($abilities);
    foreach ($abilities as $ability) {
        expect(Gate::forUser($actor)->allows('admin.'.$ability), $role.' '.$ability)->toBe(in_array($ability, $allowed, true));
    }
    expect(Gate::forUser($actor)->allows('admin.unknown'))->toBeFalse();
})->with([
    ['super_admin', ['orders.view', 'orders.status', 'orders.cancel', 'orders.refund', 'orders.receipt', 'orders.collected', 'orders.manual', 'orders.tracking', 'orders.notes', 'orders.export', 'orders.print', 'orders.labels', 'customers.view', 'customers.notes', 'customers.block', 'customers.wallet', 'customers.export', 'pii.full']],
    ['admin', ['orders.view', 'orders.status', 'orders.cancel', 'orders.refund', 'orders.receipt', 'orders.collected', 'orders.manual', 'orders.tracking', 'orders.notes', 'orders.export', 'orders.print', 'orders.labels', 'customers.view', 'customers.notes', 'customers.block', 'customers.wallet', 'customers.export', 'pii.full']],
    ['shop_manager', ['orders.view', 'orders.status', 'orders.tracking', 'orders.notes', 'orders.print', 'customers.view', 'customers.notes', 'pii.full']],
    ['content_editor', []], ['support', ['orders.view', 'customers.view']], ['customer', []],
]);

it('L3b fresh capability authorization rejects revoked roles inactive and first login actors', function (array $changes) {
    $actor = User::factory()->create(['role' => 'admin']);
    app(AdminAccess::class)->authorize($actor, 'orders.refund');
    DB::table('users')->where('id', $actor->id)->update($changes);
    expect(fn () => app(AdminAccess::class)->authorize($actor, 'orders.refund'))->toThrow(AuthorizationException::class);
})->with([[['role' => 'support']], [['is_active' => false]], [['must_change_password' => true]]]);
