<?php

declare(strict_types=1);

use App\Filament\Pages\VariantMatrixEditor;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Attributes;
use App\Services\Products;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Livewire\Features\SupportLockedProperties\CannotUpdateLockedPropertyException;
use Livewire\Livewire;

uses(RefreshDatabase::class);

beforeEach(function () {
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    Filament::bootCurrentPanel();
});

it('L3a matrix page independently gates six roles reauthorizes generation and idempotently persists owned combinations', function (string $role, bool $allowed) {
    $staff = User::factory()->create(['role' => 'admin']);
    $root = app(Products::class)->save($staff, ['title' => 'متغیر', 'slug' => 'root', 'sku' => 'ROOT', 'type' => 'variable', 'price' => 100]);
    $attribute = app(Attributes::class)->save($staff, ['name' => 'رنگ', 'slug' => 'color', 'type' => 'select']);
    $one = app(Attributes::class)->saveTerm($staff, $attribute->id, ['name' => 'قرمز', 'slug' => 'red']);
    $two = app(Attributes::class)->saveTerm($staff, $attribute->id, ['name' => 'آبی', 'slug' => 'blue']);
    $actor = User::factory()->create(['role' => $role]);
    $this->actingAs($actor, 'web');
    expect(VariantMatrixEditor::canAccess())->toBe($allowed);
    if (! $allowed) {
        $this->get('/admin/products/'.$root->id.'/matrix')->assertForbidden();
        Livewire::test(VariantMatrixEditor::class, ['product' => $root->id])->assertForbidden();
        $this->actingAs($staff, 'web');
        $page = Livewire::test(VariantMatrixEditor::class, ['product' => $root->id]);
        DB::table('users')->where('id', $staff->id)->update(['role' => $role]);
        $page->call('generate')->assertForbidden();

        return;
    }
    $this->get('/admin/products/'.$root->id.'/matrix')->assertOk();
    $page = Livewire::test(VariantMatrixEditor::class, ['product' => $root->id])->fillForm(['price' => '۲۵۰', 'dimensions' => [['attribute_id' => $attribute->id, 'term_ids' => [$one->id, $two->id]]]])->call('generate')->assertHasNoErrors();
    expect(ProductVariant::count())->toBe(2);
    expect(ProductVariant::pluck('price')->unique()->all())->toBe([250]);
    expect(ProductVariant::sum('stock'))->toBe(0);
    $page->fillForm(['price' => 999])->call('generate')->assertHasNoErrors();
    expect(ProductVariant::pluck('price')->unique()->all())->toBe([250]);
    expect(DB::table('variant_attribute_terms')->count())->toBe(2);
    expect(fn () => $page->set('productId', 999))->toThrow(CannotUpdateLockedPropertyException::class);
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a matrix page rejects repeated dimensions without persisting a partial matrix', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $root = app(Products::class)->save($actor, ['title' => 'متغیر', 'slug' => 'root', 'sku' => 'ROOT', 'type' => 'variable', 'price' => 100]);
    $attribute = app(Attributes::class)->save($actor, ['name' => 'رنگ', 'slug' => 'color', 'type' => 'select']);
    $term = app(Attributes::class)->saveTerm($actor, $attribute->id, ['name' => 'قرمز', 'slug' => 'red']);
    $this->actingAs($actor, 'web');
    Livewire::test(VariantMatrixEditor::class, ['product' => $root->id])->fillForm(['price' => 100, 'dimensions' => [['attribute_id' => $attribute->id, 'term_ids' => [$term->id]], ['attribute_id' => $attribute->id, 'term_ids' => [$term->id]]]])->call('generate')->assertHasErrors('data.dimensions')->assertSet('notice', '');
    expect(ProductVariant::count())->toBe(0);
});
