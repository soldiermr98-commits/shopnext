<?php

declare(strict_types=1);

use App\Filament\Pages\ProductContentEditor;
use App\Models\ActivityLog;
use App\Models\Product;
use App\Models\User;
use App\Services\Products;
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

it('L3a content page independently gates six roles and every action after role revocation', function (string $role, bool $allowed) {
    $staff = User::factory()->create(['role' => 'admin']);
    $product = app(Products::class)->save($staff, ['title' => 'کالا', 'slug' => 'product', 'sku' => 'SKU', 'price' => 100]);
    $actor = User::factory()->create(['role' => $role]);
    $this->actingAs($actor, 'web');
    expect(ProductContentEditor::canAccess())->toBe($allowed);
    if (! $allowed) {
        $this->get('/admin/products/'.$product->id.'/content')->assertForbidden();
        Livewire::test(ProductContentEditor::class, ['product' => $product->id])->assertForbidden();
        foreach (['save' => [], 'reloadContent' => [], 'updatedImageUpload' => [], '_uploadErrored' => ['imageUpload', null, false]] as $method => $arguments) {
            $this->actingAs($staff, 'web');
            $component = Livewire::test(ProductContentEditor::class, ['product' => $product->id]);
            DB::table('users')->where('id', $staff->id)->update(['role' => $role]);
            $component->call($method, ...$arguments)->assertForbidden();
            DB::table('users')->where('id', $staff->id)->update(['role' => 'admin']);
        }

        return;
    }
    $this->get('/admin/products/'.$product->id.'/content')->assertOk()->assertSee('محتوا و گالری محصول');
    Livewire::test(ProductContentEditor::class, ['product' => $product->id])->fillForm(['short_description' => 'متن تازه', 'full_description' => '<p>توضیح <b>مجاز</b></p>', 'faqs' => [['question' => 'پرسش', 'answer' => '<p>پاسخ</p>']], 'specifications' => [['group' => 'فنی', 'key' => 'جنس', 'value' => 'پنبه']]])->call('save')->assertHasNoErrors()->assertSet('notice', 'محتوای محصول ذخیره شد.')->call('reloadContent')->assertHasNoErrors();
    expect($product->fresh()->short_description)->toBe('متن تازه');
    expect(json_decode($product->fresh()->faqs, true)[0]['question'])->toBe('پرسش');
    expect(ActivityLog::where('action', 'content.update')->value('user_id'))->toBe($actor->id);
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a content page safely uploads persists ordered gallery alt main and all three relationship selectors', function () {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'admin']);
    $root = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'root', 'sku' => 'ROOT', 'price' => 100]);
    $target = app(Products::class)->save($actor, ['title' => 'دیگر', 'slug' => 'target', 'sku' => 'TARGET', 'price' => 100]);
    $this->actingAs($actor, 'web');
    $page = Livewire::test(ProductContentEditor::class, ['product' => $root->id]);
    $page->set('imageUpload', UploadedFile::fake()->image('first.png', 16, 16))->call('save')->assertHasNoErrors();
    $first = json_decode($root->fresh()->gallery_images, true)[0];
    expect(Storage::disk('local')->exists(ltrim($first, '/')))->toBeTrue();
    $page->set('imageUpload', UploadedFile::fake()->image('second.jpg', 16, 16))->call('save')->assertHasNoErrors();
    $second = json_decode($root->fresh()->gallery_images, true)[1];
    $page->fillForm(['gallery' => [['path' => $second, 'alt' => 'دوم'], ['path' => $first, 'alt' => 'اول']], 'main_image' => $second, 'relations' => ['related' => [$target->id], 'upsell' => [$target->id], 'cross_sell' => [$target->id]]])->call('save')->assertHasNoErrors();
    expect(json_decode($root->fresh()->gallery_images, true))->toBe([$second, $first]);
    expect($root->fresh()->main_image)->toBe($second);
    expect(json_decode($root->fresh()->gallery_alt_texts, true)[$second])->toBe('دوم');
    expect(DB::table('product_relations')->count())->toBe(3);
    $page->fillForm(['gallery' => [], 'main_image' => '/images/catalog-placeholder.svg', 'relations' => ['related' => [], 'upsell' => [], 'cross_sell' => []]])->call('save')->assertHasNoErrors();
    expect(DB::table('product_relations')->count())->toBe(0);
    expect(Storage::disk('local')->exists(ltrim($first, '/')))->toBeTrue();
});

it('L3a content page locks its product context and rejects executable upload without orphan files or false success', function () {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'admin']);
    $root = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'root', 'sku' => 'ROOT', 'price' => 100]);
    $this->actingAs($actor, 'web');
    $page = Livewire::test(ProductContentEditor::class, ['product' => $root->id]);
    expect(fn () => $page->set('productId', 999))->toThrow(CannotUpdateLockedPropertyException::class);
    $page = Livewire::test(ProductContentEditor::class, ['product' => $root->id]);
    $page->set('imageUpload', UploadedFile::fake()->createWithContent('evil.svg', '<svg onload="alert(1)"></svg>'))->call('save')->assertHasErrors('imageUpload')->assertSet('notice', '');
    expect(Storage::disk('local')->files('media'))->toBe([]);
    expect(ActivityLog::where('action', 'content.update')->count())->toBe(0);
    expect(Product::findOrFail($root->id)->gallery_images)->toBeNull();
});
