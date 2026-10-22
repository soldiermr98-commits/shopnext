<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('C03 wallet ledger is append only in real SQL and legacy snapshot is not editable', function () {
    $user = User::factory()->create();
    $id = DB::table('wallet_entries')->insertGetId(['user_id' => $user->id, 'delta' => 1000, 'kind' => 'credit', 'idempotency_key' => 'fixture-credit', 'reason' => 'Fixture', 'created_at' => now()]);
    expect(fn () => DB::table('wallet_entries')->where('id', $id)->update(['delta' => 2000]))->toThrow(QueryException::class);
    expect(fn () => DB::table('wallet_entries')->where('id', $id)->delete())->toThrow(QueryException::class);
    expect(fn () => DB::table('users')->where('id', $user->id)->update(['wallet_balance' => 1000]))->toThrow(QueryException::class);
    expect(DB::table('wallet_entries')->where('id', $id)->value('delta'))->toBe(1000);
});

it('C02 H08 rejects zero wallet entries and invalid coupon capacity directly in SQL', function () {
    $user = User::factory()->create();
    expect(fn () => DB::table('wallet_entries')->insert(['user_id' => $user->id, 'delta' => 0, 'kind' => 'credit', 'idempotency_key' => 'bad', 'reason' => 'Fixture', 'created_at' => now()]))->toThrow(QueryException::class);
    expect(fn () => DB::table('coupons')->insert(['code' => 'OVER', 'type' => 'fixed', 'value' => 1, 'usage_limit' => 1, 'used_count' => 2]))->toThrow(QueryException::class);
});
