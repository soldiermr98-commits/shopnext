<?php

declare(strict_types=1);

use App\Filament\Pages\AttributeEditor;
use App\Filament\Pages\AttributeTermEditor;
use App\Models\ActivityLog;
use App\Models\AttributeTerm;
use App\Models\CatalogAttribute;
use App\Models\User;
use App\Services\Attributes;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Livewire\Features\SupportLockedProperties\CannotUpdateLockedPropertyException;
use Livewire\Livewire;
use Tests\Support\FinancialFixtures;

uses(RefreshDatabase::class);

beforeEach(function () {
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    Filament::bootCurrentPanel();
});

it('L3a attribute and term screens gate six roles recheck every action and persist CRUD audit and swatches', function (string $role, bool $allowed) {
    $actor = User::factory()->create(['role' => $role]);
    $this->actingAs($actor, 'web');
    expect(AttributeEditor::canAccess())->toBe($allowed);
    expect(AttributeTermEditor::canAccess())->toBe($allowed);
    if (! $allowed) {
        $id = DB::table('catalog_attributes')->insertGetId(['name' => 'رنگ', 'slug' => 'fixture', 'type' => 'color']);
        $this->get('/admin/attributes')->assertForbidden();
        $this->get('/admin/attributes/'.$id.'/terms')->assertForbidden();
        Livewire::test(AttributeEditor::class)->assertForbidden();
        Livewire::test(AttributeTermEditor::class, ['attribute' => $id])->assertForbidden();
        foreach ([AttributeEditor::class => ['newAttribute' => [], 'save' => [], 'edit' => [123], 'delete' => [123]], AttributeTermEditor::class => ['newTerm' => [], 'save' => [], 'edit' => [123], 'delete' => [123], '_uploadErrored' => ['imageUpload', null, false]]] as $page => $methods) {
            foreach ($methods as $method => $arguments) {
                $staff = User::factory()->create(['role' => 'admin']);
                $this->actingAs($staff, 'web');
                $component = Livewire::test($page, $page === AttributeTermEditor::class ? ['attribute' => $id] : []);
                DB::table('users')->where('id', $staff->id)->update(['role' => $role]);
                $component->call($method, ...$arguments)->assertForbidden();
            }
        }
        expect(CatalogAttribute::count())->toBe(1);
        expect(AttributeTerm::count())->toBe(0);
        expect(ActivityLog::whereIn('module', ['catalog_attributes', 'attribute_terms'])->count())->toBe(0);

        return;
    }
    $this->get('/admin/attributes')->assertOk()->assertSee('مدیریت ویژگی‌ها');
    $root = Livewire::test(AttributeEditor::class)->fillForm(['name' => 'رنگ', 'slug' => 'color', 'type' => 'color'])->call('save')->assertHasNoErrors();
    $attribute = CatalogAttribute::where('slug', 'color')->firstOrFail();
    $this->get('/admin/attributes/'.$attribute->id.'/terms')->assertOk()->assertSee('مدیریت گزینه‌های ویژگی');
    $termPage = Livewire::test(AttributeTermEditor::class, ['attribute' => $attribute->id])->fillForm(['name' => 'قرمز', 'slug' => 'red', 'hex' => '#abc'])->call('save')->assertHasNoErrors()->assertSet('notice', 'گزینه ذخیره شد.')->assertSee('background-color:#AABBCC', false);
    $term = AttributeTerm::where('attribute_id', $attribute->id)->firstOrFail();
    $termPage->call('edit', $term->id)->fillForm(['name' => 'آبی', 'slug' => 'blue', 'hex' => '#1234ff', 'order_index' => 2])->call('save')->assertHasNoErrors();
    expect($term->fresh()->hex)->toBe('#1234FF');
    expect((int) $term->fresh()->order_index)->toBe(2);
    $root->call('edit', $attribute->id)->fillForm(['name' => 'رنگ جدید', 'slug' => 'color', 'type' => 'color'])->call('save')->assertHasNoErrors();
    expect($attribute->fresh()->name)->toBe('رنگ جدید');
    $termPage->call('newTerm')->assertSet('editingId', null)->call('delete', $term->id)->assertHasNoErrors();
    $root->call('newAttribute')->assertSet('editingId', null)->call('delete', $attribute->id)->assertHasNoErrors();
    expect(CatalogAttribute::count())->toBe(0);
    expect(AttributeTerm::count())->toBe(0);
    expect(ActivityLog::where('module', 'catalog_attributes')->where('user_id', $actor->id)->count())->toBe(3);
    expect(ActivityLog::where('module', 'attribute_terms')->where('user_id', $actor->id)->count())->toBe(3);
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a term screen persists a safe required image and preserves it on unrelated edits', function () {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'admin']);
    $this->actingAs($actor, 'web');
    $attribute = app(Attributes::class)->save($actor, ['name' => 'طرح', 'slug' => 'pattern', 'type' => 'image']);
    $component = Livewire::test(AttributeTermEditor::class, ['attribute' => $attribute->id])->fillForm(['name' => 'طرح', 'slug' => 'pattern'])->call('save')->assertHasErrors('data.image')->assertSet('notice', '');
    expect(AttributeTerm::count())->toBe(0);
    $component->set('imageUpload', UploadedFile::fake()->image('term.png', 16, 16))->call('save')->assertHasNoErrors();
    $term = AttributeTerm::firstOrFail();
    $image = $term->image;
    Storage::disk('local')->assertExists('media/'.basename($image));
    $component->call('edit', $term->id)->fillForm(['name' => 'طرح جدید', 'slug' => 'pattern'])->call('save')->assertHasNoErrors();
    expect($term->fresh()->image)->toBe($image);
});

it('L3a term screen blocks SVG until valid replacement and cleans new files on duplicate failure', function () {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'admin']);
    $this->actingAs($actor, 'web');
    $attribute = app(Attributes::class)->save($actor, ['name' => 'طرح', 'slug' => 'pattern', 'type' => 'image']);
    $component = Livewire::test(AttributeTermEditor::class, ['attribute' => $attribute->id])->fillForm(['name' => 'طرح', 'slug' => 'pattern'])->set('imageUpload', UploadedFile::fake()->createWithContent('bad.svg', '<svg></svg>'))->assertHasErrors('imageUpload')->call('save')->assertHasErrors('imageUpload')->assertSet('notice', '');
    expect(AttributeTerm::count())->toBe(0);
    $component->set('imageUpload', UploadedFile::fake()->image('good.png', 16, 16))->call('save')->assertHasNoErrors();
    $files = Storage::disk('local')->allFiles('media');
    Livewire::test(AttributeTermEditor::class, ['attribute' => $attribute->id])->fillForm(['name' => 'تکراری', 'slug' => 'pattern'])->set('imageUpload', UploadedFile::fake()->image('duplicate.png', 16, 16))->call('save')->assertHasErrors('data.slug')->assertSet('notice', '');
    expect(Storage::disk('local')->allFiles('media'))->toBe($files);
    expect(AttributeTerm::count())->toBe(1);
});

it('L3a attribute and term screens reject bad hex unsafe type changes and used term deletion', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $this->actingAs($actor, 'web');
    $attribute = app(Attributes::class)->save($actor, ['name' => 'رنگ', 'slug' => 'color', 'type' => 'color']);
    $component = Livewire::test(AttributeTermEditor::class, ['attribute' => $attribute->id])->fillForm(['name' => 'ناامن', 'slug' => 'invalid', 'hex' => '#GG0000'])->call('save')->assertHasErrors('data.hex')->assertSet('notice', '');
    expect(AttributeTerm::count())->toBe(0);
    $component->fillForm(['name' => 'قرمز', 'slug' => 'red', 'hex' => '#ff0000'])->call('save')->assertHasNoErrors();
    $term = AttributeTerm::firstOrFail();
    DB::table('product_attribute_terms')->insert(['product_id' => FinancialFixtures::product(), 'term_id' => $term->id, 'attribute_id' => $attribute->id]);
    $component->call('delete', $term->id)->assertHasErrors('term')->assertSet('notice', '');
    $root = Livewire::test(AttributeEditor::class)->call('edit', $attribute->id)->fillForm(['name' => 'رنگ', 'slug' => 'color', 'type' => 'image'])->call('save')->assertHasErrors('type')->assertSet('notice', '');
    $root->call('delete', $attribute->id)->assertHasErrors('attribute')->assertSet('notice', '');
    expect($attribute->fresh()->type)->toBe('color');
    expect(AttributeTerm::find($term->id))->not->toBeNull();
});

it('L3a term screen locks owner context and scopes record actions to that owner', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $this->actingAs($actor, 'web');
    $service = app(Attributes::class);
    $a = $service->save($actor, ['name' => 'یک', 'slug' => 'one', 'type' => 'select']);
    $b = $service->save($actor, ['name' => 'دو', 'slug' => 'two', 'type' => 'select']);
    $term = $service->saveTerm($actor, $b->id, ['name' => 'کوچک', 'slug' => 'small']);
    expect(fn () => Livewire::test(AttributeTermEditor::class, ['attribute' => $a->id])->set('attributeId', $b->id))->toThrow(CannotUpdateLockedPropertyException::class);
    Livewire::test(AttributeTermEditor::class, ['attribute' => $a->id])->call('edit', $term->id)->assertStatus(404);
    Livewire::test(AttributeTermEditor::class, ['attribute' => $a->id])->call('delete', $term->id)->assertStatus(404);
    $this->get('/admin/attributes/not-an-id/terms')->assertNotFound();
    $this->get('/admin/attributes/999999999/terms')->assertNotFound();
    expect($term->fresh()->attribute_id)->toBe($b->id);
});

it('L3a attribute screen paginates one thousand rows with bounded count queries and previous next actions', function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']), 'web');
    $rows = [];
    for ($i = 0; $i < 1000; $i++) {
        $rows[] = ['name' => 'ویژگی '.$i, 'slug' => 'attribute-'.$i];
    }
    DB::table('catalog_attributes')->insert($rows);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $component = Livewire::test(AttributeEditor::class)->assertSee('>attribute-0</td>', false)->assertDontSee('>attribute-999</td>', false);
    $queries = array_filter(DB::getQueryLog(), fn (array $query): bool => str_contains($query['query'], 'from `catalog_attributes`'));
    DB::disableQueryLog();
    expect(count($queries))->toBeLessThanOrEqual(3);
    $component->call('nextPage')->assertSee('>attribute-30</td>', false)->assertDontSee('>attribute-0</td>', false);
    $component->call('previousPage')->assertSee('>attribute-0</td>', false);
});

it('L3a term screen paginates one thousand owner scoped rows with bounded queries and previous next actions', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $this->actingAs($actor, 'web');
    $attribute = app(Attributes::class)->save($actor, ['name' => 'اندازه', 'slug' => 'size', 'type' => 'select']);
    $rows = [];
    for ($i = 0; $i < 1000; $i++) {
        $rows[] = ['attribute_id' => $attribute->id, 'name' => 'گزینه '.$i, 'slug' => 'term-'.$i];
    }
    DB::table('attribute_terms')->insert($rows);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $component = Livewire::test(AttributeTermEditor::class, ['attribute' => $attribute->id])->assertSee('>term-0</td>', false)->assertDontSee('>term-999</td>', false);
    $queries = array_filter(DB::getQueryLog(), fn (array $query): bool => str_contains($query['query'], 'from `attribute_terms`'));
    DB::disableQueryLog();
    expect(count($queries))->toBeLessThanOrEqual(3);
    $component->call('nextPage')->assertSee('>term-30</td>', false)->assertDontSee('>term-0</td>', false);
    $component->call('previousPage')->assertSee('>term-0</td>', false);
});
