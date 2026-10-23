<?php

declare(strict_types=1);

use App\Filament\Pages\MediaLibraryEditor;
use App\Jobs\ConvertMedia;
use App\Models\ActivityLog;
use App\Models\MediaAsset;
use App\Models\User;
use App\Services\MediaConversions;
use App\Services\MediaLibrary;
use App\Services\MediaUsage;
use App\Services\Products;
use App\Services\WebpRenderer;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Livewire\Livewire;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    Filament::bootCurrentPanel();
});

it('L3a media page six roles gates upload metadata replace delete and refreshed revoked actors', function (string $role, bool $allowed) {
    $staff = User::factory()->create(['role' => 'admin']);
    $asset = app(MediaLibrary::class)->upload($staff, UploadedFile::fake()->image('first.png', 8, 8), []);
    $actor = User::factory()->create(['role' => $role]);
    $this->actingAs($actor, 'web');
    expect(MediaLibraryEditor::canAccess())->toBe($allowed);
    if (! $allowed) {
        Livewire::test(MediaLibraryEditor::class)->assertForbidden();
    } else {
        Livewire::test(MediaLibraryEditor::class)->call('select', $asset->id)->set('folder', 'کالا/جدید')->set('alt', 'متن تازه')->call('saveMetadata')->assertHasNoErrors()->call('retryConversions')->assertHasNoErrors();
        expect($asset->fresh()->folder)->toBe('کالا/جدید');
    }
    foreach (['saveUpload', 'saveMetadata', 'replace', 'deleteSelected', 'retryConversions', 'select'] as $method) {
        $this->actingAs($staff, 'web');
        $page = Livewire::test(MediaLibraryEditor::class)->call('select', $asset->id);
        DB::table('users')->where('id', $staff->id)->update(['role' => $allowed ? 'support' : $role]);
        $page->call($method, $asset->id)->assertForbidden();
        DB::table('users')->where('id', $staff->id)->update(['role' => 'admin']);
    }
})->with([['super_admin', true], ['admin', true], ['shop_manager', true], ['content_editor', false], ['support', false], ['customer', false]]);

it('L3a media real upload folder alt replace stable references usage and protected deletion persist audited changes', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $this->actingAs($actor, 'web');
    $page = Livewire::test(MediaLibraryEditor::class)->set('folder', 'کالا')->set('alt', 'تصویر کالا')->set('upload', UploadedFile::fake()->image('first.png', 8, 8))->call('saveUpload')->assertHasNoErrors();
    $asset = MediaAsset::firstOrFail();
    expect($asset->conversion_status)->toBe('ready');
    expect($asset->variants)->toHaveKeys(['thumb', 'webp']);
    foreach ($asset->variants as $filename) {
        expect(getimagesize(Storage::disk('local')->path('media/'.$filename))['mime'])->toBe('image/webp');
        $this->get('/media/'.$filename)->assertOk()->assertHeader('Content-Type', 'image/webp');
    }
    $product = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'media-product', 'sku' => 'MEDIA', 'price' => 100]);
    DB::table('products')->where('id', $product->id)->update(['main_image' => $asset->url(), 'gallery_images' => json_encode([$asset->url()])]);
    expect(app(MediaUsage::class)->counts([$asset->url()])[$asset->url()])->toBe(2);
    $oldSha = $asset->sha256;
    $url = $asset->url();
    $page->set('upload', UploadedFile::fake()->image('second.png', 12, 12))->call('replace')->assertHasNoErrors();
    expect($asset->fresh()->sha256)->not->toBe($oldSha);
    expect($asset->fresh()->url())->toBe($url);
    expect($product->fresh()->main_image)->toBe($url);
    $product->delete();
    $page->call('deleteSelected')->assertHasErrors('asset');
    expect(Storage::disk('local')->exists('media/'.$asset->filename))->toBeTrue();
    DB::table('products')->where('id', $product->id)->update(['main_image' => '/images/catalog-placeholder.svg', 'gallery_images' => null]);
    $page->call('deleteSelected')->assertHasNoErrors();
    expect(MediaAsset::find($asset->id))->toBeNull();
    expect(Storage::disk('local')->exists('media/'.$asset->filename))->toBeFalse();
    expect(ActivityLog::where('action', 'media.replace')->count())->toBe(1);
    expect(ActivityLog::where('action', 'media.delete')->value('user_id'))->toBe($actor->id);
});

it('L3a no WebP support keeps canonical original without attempting decode or variants', function () {
    $renderer = Mockery::mock(WebpRenderer::class);
    $renderer->shouldReceive('available')->once()->andReturn(false);
    $renderer->shouldNotReceive('render');
    app()->instance(WebpRenderer::class, $renderer);
    $asset = app(MediaLibrary::class)->upload(User::factory()->create(['role' => 'admin']), UploadedFile::fake()->image('safe.png', 8, 8), []);
    expect($asset->conversion_status)->toBe('original');
    expect($asset->variants)->toBeNull();
    expect(Storage::disk('local')->exists('media/'.$asset->filename))->toBeTrue();
});

it('L3a missing worker synchronously converts only small images queues larger ones and ignores stale replacement jobs', function () {
    Queue::fake();
    $actor = User::factory()->create(['role' => 'admin']);
    $small = app(MediaLibrary::class)->upload($actor, UploadedFile::fake()->image('small.png', 8, 8), []);
    expect($small->conversion_status)->toBe('ready');
    Queue::assertNothingPushed();
    $large = app(MediaLibrary::class)->upload($actor, UploadedFile::fake()->image('large.png', 1100, 1000), []);
    expect($large->conversion_status)->toBe('pending');
    Queue::assertPushed(ConvertMedia::class, fn ($job): bool => $job->assetId === $large->id);
    app(MediaConversions::class)->run($large->id, str_repeat('0', 64));
    expect($large->fresh()->conversion_status)->toBe('pending');
    app(MediaConversions::class)->run($large->id, $large->sha256);
    expect($large->fresh()->conversion_status)->toBe('ready');
});

it('L3a media paginated usage has fixed aggregate query count and codec failures keep safe original with no partial variants', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $renderer = Mockery::mock(WebpRenderer::class);
    $renderer->shouldReceive('available')->andReturn(true);
    $renderer->shouldReceive('render')->andThrow(ValidationException::withMessages(['file' => 'منابع کافی نیست.']));
    app()->instance(WebpRenderer::class, $renderer);
    $asset = app(MediaLibrary::class)->upload($actor, UploadedFile::fake()->image('safe.png', 8, 8), []);
    expect($asset->conversion_status)->toBe('original');
    expect(Storage::disk('local')->files('media'))->toHaveCount(1);
    DB::enableQueryLog();
    DB::flushQueryLog();
    app(MediaUsage::class)->counts(array_map(fn (int $i): string => '/media/'.str_pad((string) $i, 48, '0', STR_PAD_LEFT).'.png', range(1, 30)));
    expect(DB::getQueryLog())->toHaveCount(9);
    DB::disableQueryLog();
});

it('L3a media replacement restores canonical bytes metadata and files if its audit cannot commit', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $asset = app(MediaLibrary::class)->upload($actor, UploadedFile::fake()->image('old.png', 8, 8), []);
    $before = Storage::disk('local')->get('media/'.$asset->filename);
    $files = Storage::disk('local')->files('media');
    ActivityLog::saving(function ($log): void {
        if ($log->action === 'media.replace') {
            throw new RuntimeException('Injected media audit failure.');
        }
    });
    try {
        expect(fn () => app(MediaLibrary::class)->replace($actor, $asset->id, UploadedFile::fake()->image('new.png', 16, 16)))->toThrow(RuntimeException::class);
    } finally {
        ActivityLog::flushEventListeners();
    }
    expect(Storage::disk('local')->get('media/'.$asset->filename))->toBe($before);
    expect($asset->fresh()->sha256)->toBe(hash('sha256', $before));
    expect(Storage::disk('local')->files('media'))->toBe($files);
    expect(MediaAsset::count())->toBe(1);
});

it('L3a media partially encoded variants are removed on failure and original survives', function () {
    Queue::fake();
    $actor = User::factory()->create(['role' => 'admin']);
    $asset = app(MediaLibrary::class)->upload($actor, UploadedFile::fake()->image('large.png', 1100, 1000), []);
    $renderer = Mockery::mock(WebpRenderer::class);
    $renderer->shouldReceive('available')->once()->andReturn(true);
    $renderer->shouldReceive('render')->once()->ordered()->andReturn('temporary encoded output');
    $renderer->shouldReceive('render')->once()->ordered()->andThrow(ValidationException::withMessages(['file' => 'منابع کافی نیست.']));
    app()->instance(WebpRenderer::class, $renderer);
    app(MediaConversions::class)->run($asset->id, $asset->sha256);
    expect($asset->fresh()->conversion_status)->toBe('original');
    expect(Storage::disk('local')->files('media'))->toBe(['media/'.$asset->filename]);
});
