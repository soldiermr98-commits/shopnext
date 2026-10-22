<?php

declare(strict_types=1);

use App\Filament\Pages\ProductBulkEditor;
use App\Models\ActivityLog;
use App\Models\User;
use App\Services\Categories;
use App\Services\ProductBulk;
use App\Services\Products;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Livewire\Livewire;

uses(RefreshDatabase::class);

beforeEach(function () {
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    Filament::bootCurrentPanel();
});

it('L3a bulk page independently gates six roles and revoked actions while persisting price category and clear', function (string $role, bool $allowed) {
    $actor = User::factory()->create(['role' => $role]);
    $this->actingAs($actor, 'web');
    expect(ProductBulkEditor::canAccess())->toBe($allowed);
    if (! $allowed) {
        $this->get('/admin/product-bulk')->assertForbidden();
        Livewire::test(ProductBulkEditor::class)->assertForbidden();
        foreach (['applyPrices', 'applyCategories'] as $method) {
            $staff = User::factory()->create(['role' => 'admin']);
            $this->actingAs($staff, 'web');
            $page = Livewire::test(ProductBulkEditor::class);
            DB::table('users')->where('id', $staff->id)->update(['role' => $role]);
            $page->call($method)->assertForbidden();
        }

        return;
    }
    $root = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'root', 'sku' => 'ROOT', 'price' => 105]);
    $other = app(Products::class)->save($actor, ['title' => 'دیگر', 'slug' => 'other', 'sku' => 'OTHER', 'price' => 200]);
    $category = app(Categories::class)->save($actor, ['title' => 'دسته', 'slug' => 'category']);
    $this->get('/admin/product-bulk')->assertOk();
    $page = Livewire::test(ProductBulkEditor::class)->fillForm(['products' => [$root->id], 'percent' => '۱۰', 'direction' => 'increase', 'categories' => [$category->id]])->call('applyPrices')->assertHasNoErrors();
    expect($root->fresh()->price)->toBe(116);
    expect($other->fresh()->price)->toBe(200);
    expect($root->fresh()->stock)->toBe(0);
    $page->call('applyCategories')->assertHasNoErrors();
    expect(DB::table('category_product')->where('product_id', $root->id)->value('category_id'))->toBe($category->id);
    $page->fillForm(['categories' => []])->call('applyCategories')->assertHasNoErrors();
    expect(DB::table('category_product')->count())->toBe(0);
    expect(ActivityLog::where('action', 'bulk.price')->value('user_id'))->toBe($actor->id);
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a bulk page rejects fractional percentages and missing selection without a success notice or mutation', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $root = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'root', 'sku' => 'ROOT', 'price' => 100]);
    $this->actingAs($actor, 'web');
    Livewire::test(ProductBulkEditor::class)->call('applyPrices')->assertHasErrors('data.products')->assertSet('notice', '');
    Livewire::test(ProductBulkEditor::class)->fillForm(['products' => [$root->id], 'percent' => '1.5'])->call('applyPrices')->assertHasErrors('data.percent')->assertSet('notice', '');
    expect($root->fresh()->price)->toBe(100);
    expect(ActivityLog::where('action', 'bulk.price')->count())->toBe(0);
});

it('L3a category bulk snapshots fifty selected memberships in five SQL reads rather than per product queries', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $ids = [];
    for ($i = 0; $i < 50; $i++) {
        $ids[] = app(Products::class)->save($actor, ['title' => 'کالا '.$i, 'slug' => 'product-'.$i, 'sku' => 'SKU-'.$i, 'price' => 100])->id;
    }
    DB::enableQueryLog();
    DB::flushQueryLog();
    expect(app(ProductBulk::class)->categories($actor, $ids, []))->toBe(50);
    $reads = array_filter(DB::getQueryLog(), fn (array $query): bool => str_starts_with(strtolower($query['query']), 'select'));
    DB::disableQueryLog();
    expect($reads)->toHaveCount(5);
    expect(ActivityLog::where('action', 'bulk.categories')->count())->toBe(50);
});
