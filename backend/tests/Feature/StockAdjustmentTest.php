<?php

declare(strict_types=1);

use App\Filament\Pages\StockAdjustmentEditor;
use App\Models\ActivityLog;
use App\Models\User;
use App\Services\Products;
use App\Services\StockAdjustment;
use App\Services\Variants;
use Filament\Facades\Filament;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Livewire\Livewire;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(RefreshDatabase::class);

beforeEach(function () {
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    Filament::bootCurrentPanel();
});

it('L3a stock single and bulk actions gate six roles and refreshed revoked actors', function (string $role, bool $allowed) {
    $staff = User::factory()->create(['role' => 'admin']);
    $product = app(Products::class)->save($staff, ['title' => 'کالا', 'slug' => 'stock', 'sku' => 'STOCK', 'price' => 100]);
    $actor = User::factory()->create(['role' => $role]);
    $this->actingAs($actor, 'web');
    expect(StockAdjustmentEditor::canAccess())->toBe($allowed);
    if ($allowed) {
        Livewire::test(StockAdjustmentEditor::class)->fillForm(['targets' => ['p:'.$product->id], 'amount' => '۵', 'direction' => 'increase', 'reason' => 'شمارش انبار'])->call('adjustOne')->assertHasNoErrors();
        expect($product->fresh()->stock)->toBe(5);
        expect(DB::table('stock_adjustments')->value('actor_id'))->toBe($actor->id);
        Livewire::test(StockAdjustmentEditor::class)->fillForm(['targets' => ['p:'.$product->id], 'amount' => 1, 'direction' => 'increase', 'reason' => 'تعدیل گروهی'])->call('adjustMany')->assertHasNoErrors();
        expect($product->fresh()->stock)->toBe(6);
    } else {
        Livewire::test(StockAdjustmentEditor::class)->assertForbidden();
        expect(fn () => app(StockAdjustment::class)->adjust($actor, $product->id, null, 5, 'increase', 'دلیل', 'denied'))->toThrow(AuthorizationException::class);
    }
    foreach (['adjustOne', 'adjustMany', 'newRequest'] as $method) {
        $this->actingAs($staff, 'web');
        $page = Livewire::test(StockAdjustmentEditor::class);
        DB::table('users')->where('id', $staff->id)->update(['role' => $allowed ? 'support' : $role]);
        $page->call($method)->assertForbidden();
        DB::table('users')->where('id', $staff->id)->update(['role' => 'admin']);
    }
})->with([['super_admin', true], ['admin', true], ['shop_manager', true], ['content_editor', false], ['support', false], ['customer', false]]);

it('L3a bulk stock UI persists reason actor immutable ledger and replay-safe atomic increments', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $a = app(Products::class)->save($actor, ['title' => 'اول', 'slug' => 'a', 'sku' => 'A', 'price' => 100]);
    $b = app(Products::class)->save($actor, ['title' => 'دوم', 'slug' => 'b', 'sku' => 'B', 'price' => 100]);
    $this->actingAs($actor, 'web');
    $page = Livewire::test(StockAdjustmentEditor::class)->fillForm(['targets' => ['p:'.$a->id, 'p:'.$b->id], 'amount' => 5, 'direction' => 'increase', 'reason' => 'رسید انبار'])->call('adjustMany')->assertHasNoErrors()->call('adjustMany')->assertHasNoErrors()->assertSee('رسید انبار');
    expect($a->fresh()->stock)->toBe(5);
    expect($b->fresh()->stock)->toBe(5);
    expect(DB::table('stock_adjustments')->count())->toBe(2);
    expect(DB::table('stock_operations')->count())->toBe(1);
    $entry = DB::table('stock_adjustments')->first();
    expect($entry->actor_id)->toBe($actor->id);
    expect($entry->reason)->toBe('رسید انبار');
    expect((int) $entry->before_stock)->toBe(0);
    expect((int) $entry->after_stock)->toBe(5);
    expect(fn () => DB::table('stock_adjustments')->where('id', $entry->id)->update(['reason' => 'changed']))->toThrow(QueryException::class);
    expect(fn () => DB::table('stock_adjustments')->where('id', $entry->id)->delete())->toThrow(QueryException::class);
    $page->call('newRequest')->fillForm(['amount' => 6, 'direction' => 'decrease'])->call('adjustMany')->assertHasErrors('data.amount')->assertSet('notice', '');
    expect($a->fresh()->stock)->toBe(5);
    expect($b->fresh()->stock)->toBe(5);
    expect(DB::table('stock_adjustments')->count())->toBe(2);
    expect(ActivityLog::where('action', 'stock.adjust')->count())->toBe(2);
    expect(json_encode(ActivityLog::where('action', 'stock.adjust')->first()->after))->not->toContain('رسید انبار');
});

it('L3a variant adjustments verify parent reject invalid quantities and key conflicts without partial changes', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $root = app(Products::class)->save($actor, ['title' => 'متغیر', 'slug' => 'variable', 'sku' => 'VARIABLE', 'type' => 'variable', 'price' => 100]);
    $variant = app(Variants::class)->save($actor, $root->id, ['sku' => 'VARIANT', 'price' => 100]);
    $service = app(StockAdjustment::class);
    $service->adjust($actor, $root->id, $variant->id, 5, 'increase', 'شمارش', 'variant-key');
    expect($variant->fresh()->stock)->toBe(5);
    expect($root->fresh()->stock)->toBe(0);
    foreach ([0, -1, 1.5, '1e3', '1.0', true] as $amount) {
        expect(fn () => $service->adjust($actor, $root->id, $variant->id, $amount, 'increase', 'شمارش', 'bad'))->toThrow(ValidationException::class);
    }
    expect(fn () => $service->adjust($actor, $root->id, null, 1, 'increase', 'شمارش', 'root'))->toThrow(ValidationException::class);
    expect(fn () => $service->adjust($actor, $root->id, $variant->id, 6, 'increase', 'شمارش', 'variant-key'))->toThrow(HttpException::class);
    expect(fn () => $service->adjust($actor, $root->id, $variant->id, 1, 'increase', '', 'reason'))->toThrow(ValidationException::class);
    expect(DB::table('stock_adjustments')->count())->toBe(1);
});

it('L3a stock mutation rolls back every row ledger operation and audit on audit failure', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $root = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'audit', 'sku' => 'AUDIT', 'price' => 100]);
    ActivityLog::saving(function (): void {
        throw new RuntimeException('Injected audit write failure.');
    });
    try {
        expect(fn () => app(StockAdjustment::class)->adjust($actor, $root->id, null, 5, 'increase', 'شمارش', 'audit'))->toThrow(RuntimeException::class);
    } finally {
        ActivityLog::flushEventListeners();
    }
    expect($root->fresh()->stock)->toBe(0);
    expect(DB::table('stock_adjustments')->count())->toBe(0);
    expect(DB::table('stock_operations')->count())->toBe(0);
});

it('L3a fifty row bulk stock adjustment has six fixed selects not one select per SKU', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $targets = [];
    for ($i = 0; $i < 50; $i++) {
        $root = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'bulk-'.$i, 'sku' => 'BULK-'.$i, 'price' => 100]);
        $targets[] = ['product_id' => $root->id, 'variant_id' => null];
    }
    DB::enableQueryLog();
    DB::flushQueryLog();
    expect(app(StockAdjustment::class)->bulk($actor, $targets, 1, 'increase', 'شمارش گروهی', 'fifty'))->toBe(50);
    $selects = array_filter(DB::getQueryLog(), fn (array $row): bool => str_starts_with(strtolower($row['query']), 'select'));
    DB::disableQueryLog();
    expect($selects)->toHaveCount(6);
    expect(DB::table('stock_adjustments')->count())->toBe(50);
});
