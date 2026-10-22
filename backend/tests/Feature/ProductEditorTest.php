<?php

declare(strict_types=1);

use App\Filament\Pages\ProductEditor;
use App\Models\ActivityLog;
use App\Models\Product;
use App\Models\User;
use App\Services\Brands;
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

it('L3a product screen independently gates six roles and every CRUD trash toggle action after revocation', function (string $role, bool $allowed) {
    $actor = User::factory()->create(['role' => $role]);
    $this->actingAs($actor, 'web');
    expect(ProductEditor::canAccess())->toBe($allowed);
    if (! $allowed) {
        $this->get('/admin/products')->assertForbidden();
        Livewire::test(ProductEditor::class)->assertForbidden();
        foreach (['newProduct' => [], 'save' => [], 'edit' => [999], 'delete' => [999], 'restore' => [999], 'toggleTrash' => []] as $method => $args) {
            $staff = User::factory()->create(['role' => 'admin']);
            $this->actingAs($staff, 'web');
            $page = Livewire::test(ProductEditor::class);
            DB::table('users')->where('id', $staff->id)->update(['role' => $role]);
            $page->call($method, ...$args)->assertForbidden();
        }

        return;
    }
    $this->get('/admin/products')->assertOk()->assertSee('مدیریت محصول‌ها');
    $page = Livewire::test(ProductEditor::class)->fillForm(['title' => 'کالا', 'slug' => 'product', 'sku' => 'SKU', 'price' => '۱۲۳۴', 'meta_title' => 'سئو', 'meta_description' => 'توضیح سئو'])->call('save')->assertHasNoErrors()->assertSet('notice', 'محصول ذخیره شد.');
    $product = Product::where('slug', 'product')->firstOrFail();
    expect($product->price)->toBe(1234);
    expect($product->stock)->toBe(0);
    expect($product->meta_title)->toBe('سئو');
    $page->assertSee('/products/'.$product->id.'/content', false)->call('edit', $product->id)->fillForm(['title' => 'تازه'])->call('save')->assertHasNoErrors();
    expect($product->fresh()->title)->toBe('تازه');
    $page->call('delete', $product->id)->assertHasNoErrors()->call('toggleTrash')->assertSee('بازیابی')->call('restore', $product->id)->assertHasNoErrors()->call('toggleTrash')->call('newProduct')->assertSet('editingId', null);
    expect(Product::find($product->id))->not->toBeNull();
    expect(ActivityLog::where('module', 'products')->pluck('action')->all())->toBe(['create', 'update', 'delete', 'restore']);
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a product screen persists all four draft types and maps real service price SKU and publication errors', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $this->actingAs($actor, 'web');
    $page = Livewire::test(ProductEditor::class);
    foreach (['simple', 'variable', 'digital', 'bundle'] as $type) {
        $page->call('newProduct')->fillForm(['title' => $type, 'slug' => $type, 'sku' => strtoupper($type), 'type' => $type, 'price' => 100])->call('save')->assertHasNoErrors();
    }
    $variable = Product::where('type', 'variable')->firstOrFail();
    $page->call('edit', $variable->id)->fillForm(['status' => 'published'])->call('save')->assertHasErrors('data.type')->assertSet('notice', '');
    $page->call('edit', $variable->id)->fillForm(['price' => '1.5'])->call('save')->assertHasErrors('data.price');
    $page->call('edit', $variable->id)->fillForm(['sku' => 'SIMPLE'])->call('save')->assertHasErrors('data.sku');
    expect($variable->fresh()->status)->toBe('draft');
    expect($variable->fresh()->price)->toBe(100);
});

it('L3a product screen pages one thousand rows with bounded eager brands and without rich text hydration', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $brand = app(Brands::class)->save($actor, ['name' => 'برند', 'slug' => 'brand']);
    $rows = [];
    for ($i = 0; $i < 1000; $i++) {
        $rows[] = ['title' => 'کالا '.$i, 'slug' => 'product-'.$i, 'sku' => 'SKU-'.$i, 'price' => 100, 'brand_id' => $brand->id];
    }
    DB::table('products')->insert($rows);
    $this->actingAs($actor, 'web');
    $page = Livewire::test(ProductEditor::class)->assertSee('برند');
    $component = $page->instance();
    DB::enableQueryLog();
    DB::flushQueryLog();
    $records = $component->records();
    foreach ($records as $record) {
        expect($record->brandRecord->name)->toBe('برند');
        expect($record->getAttributes())->not->toHaveKey('full_description');
    }
    $queries = DB::getQueryLog();
    DB::disableQueryLog();
    expect($queries)->toHaveCount(5);
    expect($records->count())->toBe(30);
    expect($records->total())->toBe(1000);
    $page->call('nextPage')->assertHasNoErrors();
});

it('L3a product page saves Tehran scheduled publication sale and flash windows as Gregorian UTC and redisplays them', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $root = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'root', 'sku' => 'ROOT', 'price' => 100]);
    $this->actingAs($actor, 'web');
    $page = Livewire::test(ProductEditor::class)->call('edit', $root->id)->set('data.status', 'scheduled')->set('data.published_at', '2026-10-25 00:15:00')->set('data.sale_price', '80')->set('data.sale_starts_at', '2026-10-24 00:00:00')->set('data.sale_ends_at', '2026-10-26 00:00:00')->set('data.flash_price', '70')->set('data.flash_starts_at', '2026-10-24 00:00:00')->set('data.flash_ends_at', '2026-10-26 00:00:00')->call('save')->assertHasNoErrors();
    expect($root->fresh()->published_at)->toBe('2026-10-24 20:45:00');
    expect($root->fresh()->sale_starts_at)->toBe('2026-10-23 20:30:00');
    expect($root->fresh()->flash_ends_at)->toBe('2026-10-25 20:30:00');
    expect($root->fresh()->sale_price)->toBe(80);
    expect($root->fresh()->flash_price)->toBe(70);
    $page->assertSet('data.published_at', '2026-10-25 00:15:00')->assertSet('data.sale_starts_at', '2026-10-24 00:00:00');
});
