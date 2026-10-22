<?php

declare(strict_types=1);

use App\Filament\Pages\VariantEditor;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Attributes;
use App\Services\Products;
use App\Services\Variants;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Livewire\Features\SupportLockedProperties\CannotUpdateLockedPropertyException;
use Livewire\Livewire;

uses(RefreshDatabase::class);

beforeEach(function () {
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    Filament::bootCurrentPanel();
});

it('L3a variation page gates six roles and revoked CRUD trash and upload actions and persists metadata', function (string $role, bool $allowed) {
    $staff = User::factory()->create(['role' => 'admin']);
    $root = app(Products::class)->save($staff, ['title' => 'متغیر', 'slug' => 'root', 'sku' => 'ROOT', 'type' => 'variable', 'price' => 100]);
    $actor = User::factory()->create(['role' => $role]);
    $this->actingAs($actor, 'web');
    expect(VariantEditor::canAccess())->toBe($allowed);
    if (! $allowed) {
        $this->get('/admin/products/'.$root->id.'/variants')->assertForbidden();
        Livewire::test(VariantEditor::class, ['product' => $root->id])->assertForbidden();
        foreach (['newVariant' => [], 'save' => [], 'edit' => [999], 'delete' => [999], 'restore' => [999], 'toggleTrash' => [], 'updatedImageUpload' => [], '_uploadErrored' => ['imageUpload', null, false]] as $method => $arguments) {
            $this->actingAs($staff, 'web');
            $page = Livewire::test(VariantEditor::class, ['product' => $root->id]);
            DB::table('users')->where('id', $staff->id)->update(['role' => $role]);
            $page->call($method, ...$arguments)->assertForbidden();
            DB::table('users')->where('id', $staff->id)->update(['role' => 'admin']);
        }

        return;
    }
    $this->get('/admin/products/'.$root->id.'/variants')->assertOk();
    $page = Livewire::test(VariantEditor::class, ['product' => $root->id])->fillForm(['sku' => 'CHILD', 'price' => '۱۲۳۴'])->call('save')->assertHasNoErrors();
    $variant = ProductVariant::firstOrFail();
    expect($variant->price)->toBe(1234);
    expect($variant->stock)->toBe(0);
    $page->call('edit', $variant->id)->fillForm(['price' => 2000])->call('save')->assertHasNoErrors()->call('delete', $variant->id)->assertHasNoErrors()->call('toggleTrash')->assertSee('بازیابی')->call('restore', $variant->id)->assertHasNoErrors()->call('toggleTrash')->call('newVariant')->assertSet('editingId', null);
    expect($variant->fresh()->price)->toBe(2000);
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a variation page uploads real safe images and scopes edits and restores to its locked variable parent', function () {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'admin']);
    $root = app(Products::class)->save($actor, ['title' => 'متغیر', 'slug' => 'root', 'sku' => 'ROOT', 'type' => 'variable', 'price' => 100]);
    $other = app(Products::class)->save($actor, ['title' => 'دیگر', 'slug' => 'other', 'sku' => 'OTHER', 'type' => 'variable', 'price' => 100]);
    $foreign = app(Variants::class)->save($actor, $other->id, ['sku' => 'FOREIGN', 'price' => 100]);
    $this->actingAs($actor, 'web');
    $page = Livewire::test(VariantEditor::class, ['product' => $root->id])->fillForm(['sku' => 'CHILD', 'price' => 100])->set('imageUpload', UploadedFile::fake()->image('variant.jpg', 16, 16))->call('save')->assertHasNoErrors();
    $variant = ProductVariant::where('product_id', $root->id)->firstOrFail();
    expect(Storage::disk('local')->exists(ltrim($variant->image, '/')))->toBeTrue();
    expect(fn () => $page->set('productId', $other->id))->toThrow(CannotUpdateLockedPropertyException::class);
    Livewire::test(VariantEditor::class, ['product' => $root->id])->call('edit', $foreign->id)->assertNotFound();
    app(Variants::class)->delete($actor, $other->id, $foreign->id);
    Livewire::test(VariantEditor::class, ['product' => $root->id])->call('restore', $foreign->id)->assertNotFound();
    $simple = app(Products::class)->save($actor, ['title' => 'ساده', 'slug' => 'simple', 'sku' => 'SIMPLE', 'price' => 100]);
    $this->get('/admin/products/'.$simple->id.'/variants')->assertNotFound();
});

it('L3a variation page eager loads option labels on a thousand row fixture in seven bounded queries', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $root = app(Products::class)->save($actor, ['title' => 'متغیر', 'slug' => 'root', 'sku' => 'ROOT', 'type' => 'variable', 'price' => 100]);
    $attribute = app(Attributes::class)->save($actor, ['name' => 'رنگ', 'slug' => 'color', 'type' => 'select']);
    $term = app(Attributes::class)->saveTerm($actor, $attribute->id, ['name' => 'قرمز', 'slug' => 'red']);
    $rows = [];
    for ($i = 0; $i < 1000; $i++) {
        $rows[] = ['product_id' => $root->id, 'sku' => 'LEGACY-'.$i, 'price' => 100];
    }
    DB::table('product_variants')->insert($rows);
    DB::table('product_attribute_terms')->insert(['product_id' => $root->id, 'attribute_id' => $attribute->id, 'term_id' => $term->id]);
    $options = ProductVariant::all()->map(fn ($row): array => ['variant_id' => $row->id, 'product_id' => $root->id, 'attribute_id' => $attribute->id, 'term_id' => $term->id])->all();
    DB::table('variant_attribute_terms')->insert($options);
    $this->actingAs($actor, 'web');
    $page = Livewire::test(VariantEditor::class, ['product' => $root->id])->assertSee('رنگ')->assertSee('قرمز');
    DB::enableQueryLog();
    DB::flushQueryLog();
    $records = $page->instance()->records();
    foreach ($records as $record) {
        expect($record->terms[0]->attribute->name)->toBe('رنگ');
    }
    $queries = DB::getQueryLog();
    DB::disableQueryLog();
    expect($queries)->toHaveCount(7);
    expect($records->total())->toBe(1000);
    expect($records->count())->toBe(30);
    $page->call('nextPage')->assertHasNoErrors();
});
