<?php

declare(strict_types=1);

use App\Filament\Pages\BrandEditor;
use App\Models\ActivityLog;
use App\Models\Brand;
use App\Models\User;
use App\Services\Brands;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\Support\FinancialFixtures;

uses(RefreshDatabase::class);

beforeEach(function () {
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    Filament::bootCurrentPanel();
});

it('L3a brand screen independently gates all six roles and rechecks every mutation after role revocation', function (string $role, bool $allowed) {
    $actor = User::factory()->create(['role' => $role]);
    $this->actingAs($actor, 'web');
    expect(BrandEditor::canAccess())->toBe($allowed);
    if (! $allowed) {
        $this->get('/admin/brands')->assertForbidden();
        Livewire::test(BrandEditor::class)->assertForbidden();
        foreach (['save' => [], 'edit' => [123], 'delete' => [123], 'newBrand' => []] as $method => $arguments) {
            $staff = User::factory()->create(['role' => 'admin']);
            $this->actingAs($staff, 'web');
            $component = Livewire::test(BrandEditor::class);
            DB::table('users')->where('id', $staff->id)->update(['role' => $role]);
            $component->call($method, ...$arguments)->assertForbidden();
        }
        expect(Brand::count())->toBe(0);

        return;
    }
    $this->get('/admin/brands')->assertOk()->assertSee('مدیریت برندها');
    $component = Livewire::test(BrandEditor::class)->fillForm(['name' => 'برند', 'slug' => 'brand'])->call('save')->assertHasNoErrors();
    $brand = Brand::where('slug', 'brand')->firstOrFail();
    $component->call('edit', $brand->id)->fillForm(['name' => 'ویرایش برند', 'slug' => 'brand', 'origin_country' => 'ایران', 'is_official' => true])->call('save')->assertHasNoErrors()->assertSet('notice', 'برند ذخیره شد.');
    expect($brand->fresh()->origin_country)->toBe('ایران');
    expect((bool) $brand->fresh()->is_official)->toBeTrue();
    $component->call('newBrand')->assertSet('editingId', null)->call('delete', $brand->id)->assertHasNoErrors()->assertSet('notice', 'برند حذف شد.');
    expect(Brand::find($brand->id))->toBeNull();
    expect(ActivityLog::where('module', 'brands')->where('user_id', $actor->id)->count())->toBe(3);
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a brand screen persists safe logos preserves existing logos and blocks product referenced deletion', function () {
    Storage::fake('local');
    $this->actingAs(User::factory()->create(['role' => 'admin']), 'web');
    $component = Livewire::test(BrandEditor::class)->fillForm(['name' => 'نشان', 'slug' => 'logo'])->set('imageUpload', UploadedFile::fake()->image('logo.png', 16, 16))->call('save')->assertHasNoErrors();
    $brand = Brand::where('slug', 'logo')->firstOrFail();
    $path = $brand->logo;
    Storage::disk('local')->assertExists('media/'.basename($path));
    $component->call('edit', $brand->id)->fillForm(['name' => 'نشان جدید', 'slug' => 'logo'])->call('save')->assertHasNoErrors();
    expect($brand->fresh()->logo)->toBe($path);
    FinancialFixtures::product(['brand_id' => $brand->id]);
    $component->call('delete', $brand->id)->assertHasErrors('brand')->assertSet('notice', '');
    expect(Brand::find($brand->id))->not->toBeNull();
});

it('L3a brand screen rejects temporary SVG recovers with replacement and cleans files after duplicate slug failure', function () {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'admin']);
    $this->actingAs($actor, 'web');
    app(Brands::class)->save($actor, ['name' => 'اصلی', 'slug' => 'original']);
    $component = Livewire::test(BrandEditor::class)->fillForm(['name' => 'جایگزین', 'slug' => 'replacement'])
        ->set('imageUpload', UploadedFile::fake()->createWithContent('bad.svg', '<svg></svg>'))->assertHasErrors('imageUpload')
        ->call('save')->assertHasErrors('imageUpload')->assertSet('notice', '');
    expect(Brand::count())->toBe(1);
    $component->set('imageUpload', UploadedFile::fake()->image('safe.png', 16, 16))->call('save')->assertHasNoErrors();
    expect(Brand::where('slug', 'replacement')->exists())->toBeTrue();
    $files = Storage::disk('local')->allFiles('media');
    Livewire::test(BrandEditor::class)->fillForm(['name' => 'تکراری', 'slug' => 'original'])->set('imageUpload', UploadedFile::fake()->image('duplicate.png', 16, 16))->call('save')->assertHasErrors('data.slug')->assertSet('notice', '');
    expect(Storage::disk('local')->allFiles('media'))->toBe($files);
    expect(Brand::count())->toBe(2);
});

it('L3a brand screen paginates one thousand rows with bounded list queries and real previous next buttons', function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']), 'web');
    $rows = [];
    for ($i = 0; $i < 1000; $i++) {
        $rows[] = ['name' => 'برند '.$i, 'slug' => 'brand-'.$i];
    }
    DB::table('brands')->insert($rows);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $component = Livewire::test(BrandEditor::class)->assertSee('>brand-0</td>', false)->assertDontSee('>brand-999</td>', false);
    $queries = array_filter(DB::getQueryLog(), fn (array $query): bool => str_contains($query['query'], 'from `brands`'));
    DB::disableQueryLog();
    expect(count($queries))->toBeLessThanOrEqual(3);
    $component->call('nextPage')->assertSee('>brand-30</td>', false)->assertDontSee('>brand-0</td>', false);
    $component->call('previousPage')->assertSee('>brand-0</td>', false)->assertDontSee('>brand-30</td>', false);
});
