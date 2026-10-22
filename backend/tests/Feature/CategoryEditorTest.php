<?php

declare(strict_types=1);

use App\Filament\Pages\CategoryEditor;
use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\User;
use App\Services\Categories;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;

uses(RefreshDatabase::class);

beforeEach(function () {
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    Filament::bootCurrentPanel();
});

it('L3a category screen and every mutation deny each excluded role independently', function (string $role, bool $allowed) {
    $actor = User::factory()->create(['role' => $role]);
    $this->actingAs($actor, 'web');
    expect(CategoryEditor::canAccess())->toBe($allowed);
    if (! $allowed) {
        $this->get('/admin/categories')->assertForbidden();
        Livewire::test(CategoryEditor::class)->assertForbidden();
        foreach (['save' => [], 'edit' => [123], 'delete' => [123], 'move' => [123, 1], 'openChildren' => [null], 'newCategory' => []] as $method => $arguments) {
            $staff = User::factory()->create(['role' => 'admin']);
            $this->actingAs($staff, 'web');
            $component = Livewire::test(CategoryEditor::class);
            DB::table('users')->where('id', $staff->id)->update(['role' => $role]);
            $component->call($method, ...$arguments)->assertForbidden();
        }
        expect(Category::count())->toBe(0);

        return;
    }
    $this->get('/admin/categories')->assertOk()->assertSee('درخت دسته‌بندی‌ها');
    Livewire::test(CategoryEditor::class)->fillForm(['title' => 'دسته نقش', 'slug' => 'role-category'])->call('save')->assertHasNoErrors()->assertSet('notice', 'دسته‌بندی ذخیره شد.');
    expect(Category::where('slug', 'role-category')->exists())->toBeTrue();
    expect(ActivityLog::where('module', 'categories')->where('user_id', $actor->id)->exists())->toBeTrue();
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a category screen persists edit image SEO tree navigation both reorder directions and guarded deletion', function () {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'admin']);
    $this->actingAs($actor, 'web');
    $component = Livewire::test(CategoryEditor::class)->fillForm(['title' => 'یک', 'slug' => 'first'])->set('imageUpload', UploadedFile::fake()->image('category.png', 16, 16))->call('save')->assertHasNoErrors();
    $first = Category::where('slug', 'first')->firstOrFail();
    Storage::disk('local')->assertExists('media/'.basename($first->image));
    $component->call('edit', $first->id)->fillForm(['title' => 'ویرایش یک', 'slug' => 'first', 'meta_title' => 'عنوان سئو', 'meta_description' => 'شرح سئو'])->call('save')->assertHasNoErrors();
    expect($first->fresh()->title)->toBe('ویرایش یک');
    expect($first->fresh()->meta_description)->toBe('شرح سئو');
    $component->call('newCategory')->assertSet('editingId', null)->fillForm(['title' => 'دو', 'slug' => 'second'])->call('save')->assertHasNoErrors();
    $second = Category::where('slug', 'second')->firstOrFail();
    $component->call('move', $second->id, -1)->assertHasNoErrors();
    expect($second->fresh()->order_index)->toBe(0);
    $component->call('move', $second->id, 1)->assertHasNoErrors();
    expect($first->fresh()->order_index)->toBe(0);
    $component->call('openChildren', $first->id)->assertSet('parentId', $first->id)->assertSet('data.parent_id', fn ($value): bool => (int) $value === $first->id)->fillForm(['title' => 'فرزند', 'slug' => 'child', 'parent_id' => $first->id])->call('save')->assertHasNoErrors();
    $child = Category::where('slug', 'child')->firstOrFail();
    $component->call('delete', $first->id)->assertHasErrors('category')->assertSet('notice', '');
    expect(Category::find($first->id))->not->toBeNull();
    $component->call('delete', $child->id)->assertHasNoErrors()->call('openChildren', null)->assertSet('parentId', null);
    expect(Category::find($child->id))->toBeNull();
    $component->call('delete', $second->id)->assertHasNoErrors();
    expect(Category::find($second->id))->toBeNull();
});

it('L3a category screen rejects invalid upload duplicate slug and cyclic parents without false success or orphan files', function () {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'admin']);
    $this->actingAs($actor, 'web');
    $root = app(Categories::class)->save($actor, ['title' => 'ریشه', 'slug' => 'root']);
    $child = app(Categories::class)->save($actor, ['title' => 'فرزند', 'slug' => 'child', 'parent_id' => $root->id]);
    Livewire::test(CategoryEditor::class)->fillForm(['title' => 'تصویر', 'slug' => 'bad-image'])->set('imageUpload', UploadedFile::fake()->createWithContent('bad.svg', '<svg onload="alert(1)"></svg>'))->assertHasErrors('imageUpload')->call('save')->assertHasErrors('imageUpload')->assertSet('notice', '');
    expect(Storage::disk('local')->allFiles('media'))->toBeEmpty();
    expect(Category::where('slug', 'bad-image')->exists())->toBeFalse();
    Livewire::test(CategoryEditor::class)->fillForm(['title' => 'تکراری', 'slug' => 'root'])->set('imageUpload', UploadedFile::fake()->image('safe.png', 16, 16))->call('save')->assertHasErrors('data.slug')->assertSet('notice', '');
    expect(Storage::disk('local')->allFiles('media'))->toBeEmpty();
    Livewire::test(CategoryEditor::class)->call('edit', $root->id)->fillForm(['title' => 'چرخه', 'slug' => 'root', 'parent_id' => $child->id])->call('save')->assertHasErrors('data.parent_id');
    expect($root->fresh()->parent_id)->toBeNull();
    expect(Category::count())->toBe(2);
});

it('L3a category screen paginates large root lists without N plus one category queries', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $this->actingAs($actor, 'web');
    $rows = [];
    for ($i = 0; $i < 1000; $i++) {
        $rows[] = ['title' => 'دسته '.$i, 'slug' => 'category-'.$i];
    }
    DB::table('categories')->insert($rows);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $component = Livewire::test(CategoryEditor::class)->assertSee('>category-0</td>', false)->assertDontSee('>category-999</td>', false);
    $queries = array_filter(DB::getQueryLog(), fn (array $query): bool => str_contains($query['query'], 'from `categories`'));
    DB::disableQueryLog();
    expect(count($queries))->toBeLessThanOrEqual(5);
    $component->call('nextPage')->assertSee('>category-30</td>', false)->assertDontSee('>category-999</td>', false);
    $component->call('previousPage')->assertSee('>category-0</td>', false)->assertDontSee('>category-30</td>', false);
});

it('L3a category screen recovers a rejected temporary upload only after a valid replacement', function () {
    Storage::fake('local');
    $this->actingAs(User::factory()->create(['role' => 'admin']), 'web');
    $component = Livewire::test(CategoryEditor::class)->fillForm(['title' => 'جایگزین', 'slug' => 'replacement'])
        ->set('imageUpload', UploadedFile::fake()->createWithContent('bad.svg', '<svg></svg>'))->assertHasErrors('imageUpload')
        ->call('save')->assertHasErrors('imageUpload')->assertSet('notice', '');
    expect(Category::count())->toBe(0);
    $component->set('imageUpload', UploadedFile::fake()->image('safe.png', 16, 16))->call('save')->assertHasNoErrors()->assertSet('notice', 'دسته‌بندی ذخیره شد.');
    $category = Category::where('slug', 'replacement')->firstOrFail();
    Storage::disk('local')->assertExists('media/'.basename($category->image));
});
