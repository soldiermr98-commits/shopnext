<?php

declare(strict_types=1);

use App\Filament\Pages\ProductContentEditor;
use App\Filament\Widgets\CronHeartbeat;
use App\Models\User;
use App\Services\ImageBudget;
use App\Services\ImageHostHealth;
use App\Services\Products;
use App\Services\SafeUpload;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Livewire\Livewire;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(RefreshDatabase::class);

it('L3a image headers reject oversized and bomb dimensions before any decoder or storage write', function () {
    Storage::fake('local');
    $valid = UploadedFile::fake()->image('tiny.png', 1, 1);
    $bytes = file_get_contents($valid->getRealPath());
    // Only modify IHDR and its CRC. Tiny compressed payload, astronomical dimensions.
    $bytes = substr_replace($bytes, pack('NN', 100000, 100000), 16, 8);
    $bytes = substr_replace($bytes, pack('N', crc32(substr($bytes, 12, 17))), 29, 4);
    $bomb = UploadedFile::fake()->createWithContent('bomb.png', $bytes);
    expect(getimagesize($bomb->getRealPath())[0])->toBe(100000);
    expect(fn () => app(SafeUpload::class)->store($bomb))->toThrow(ValidationException::class);
    expect(Storage::disk('local')->allFiles())->toBe([]);
    config(['media.max_pixels' => 100]);
    expect(fn () => app(SafeUpload::class)->store(UploadedFile::fake()->image('wide.png', 11, 10)))->toThrow(ValidationException::class);
});

it('L3a image preflight rejects corrupt data and configured byte ceilings with Persian errors', function () {
    Storage::fake('local');
    $tiny = UploadedFile::fake()->image('valid.png', 2, 2);
    $truncated = UploadedFile::fake()->createWithContent('truncated.png', substr(file_get_contents($tiny->getRealPath()), 0, 33));
    foreach ([$truncated, UploadedFile::fake()->createWithContent('corrupt.png', 'not an image'), UploadedFile::fake()->createWithContent('php.png', '<?php exit;')] as $file) {
        try {
            app(SafeUpload::class)->store($file);
            $this->fail('Corrupted image unexpectedly accepted.');
        } catch (ValidationException $exception) {
            expect(json_encode($exception->errors(), JSON_UNESCAPED_UNICODE))->toMatch('/[آ-ی]/u');
        }
    }
    config(['media.max_file_bytes' => 10]);
    expect(fn () => app(SafeUpload::class)->store(UploadedFile::fake()->image('over.png', 2, 2)))->toThrow(ValidationException::class);
    expect(Storage::disk('local')->allFiles())->toBe([]);
});

it('L3a memory estimates use both RGBA buffers input overhead reserve and live PHP headroom without decoding', function () {
    $budget = app(ImageBudget::class);
    $budget->assertFits(100, 100, 1024, 16 * 1024 * 1024, '256M');
    $budget->assertFits(6000, 4000, 1024, 0, '256M');
    foreach ([[6000, 4000, 1024, 64 * 1024 * 1024, '256M'], [100, 100, 1024, 31 * 1024 * 1024, '32M'], [100, 100, 1024, 0, 'invalid'], [PHP_INT_MAX, PHP_INT_MAX, 1, 0, '-1']] as $args) {
        expect(fn () => $budget->assertFits(...$args))->toThrow(ValidationException::class);
    }
    config(['media.processing_memory_bytes' => 32 * 1024 * 1024]);
    expect(fn () => $budget->assertFits(100, 100, 1024, 0, '-1'))->toThrow(ValidationException::class);
    expect(ImageBudget::iniBytes('256M'))->toBe(268435456);
    expect(ImageBudget::iniBytes('1G'))->toBe(1073741824);
    expect(ImageBudget::iniBytes('-1'))->toBeNull();
    expect(ImageBudget::iniBytes('bad'))->toBe(0);
});

it('L3a media variant configuration has a small hard cap and bounded integer dimensions', function () {
    expect(app(ImageBudget::class)->variants())->toBe(['thumb' => 320, 'webp' => 1600]);
    foreach ([array_fill_keys(['a', 'b', 'c', 'd'], 320), ['thumb' => 320.0], ['thumb' => 100000], ['../bad' => 320]] as $variants) {
        config(['media.variants' => $variants]);
        expect(fn () => app(ImageBudget::class)->variants())->toThrow(ValidationException::class);
    }
});

it('L3a image host recommendations report all limits WebP capabilities and warnings without SQL or failing small-upload readiness', function () {
    $health = app(ImageHostHealth::class);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $report = $health->evaluate(['upload_max_filesize' => '2M', 'post_max_size' => '2M', 'memory_limit' => '128M', 'max_execution_time' => '20'], false, false);
    expect($report['warnings'])->toHaveCount(5);
    expect($report['gd_webp'])->toBeFalse();
    expect($report['imagick_webp'])->toBeFalse();
    expect(DB::getQueryLog())->toHaveCount(0);
    DB::disableQueryLog();
    expect($health->evaluate(['upload_max_filesize' => '8M', 'post_max_size' => '10M', 'memory_limit' => '256M', 'max_execution_time' => '60'], true, true)['warnings'])->toBe([]);
    expect($health->evaluate(['upload_max_filesize' => '8M', 'post_max_size' => '0', 'memory_limit' => '-1', 'max_execution_time' => '0'], true, true)['warnings'])->toBe([]);
    Artisan::call('deploy-check');
    expect(Artisan::output())->toContain('upload_max_filesize', 'post_max_size', 'memory_limit', 'max_execution_time', 'image.webp.gd', 'image.webp.imagick');
});

it('L3a dashboard image warnings independently gate six roles and refresh revoked actors', function (string $role, bool $allowed) {
    $actor = User::factory()->create(['role' => $role]);
    $this->actingAs($actor, 'web');
    $widget = new CronHeartbeat;
    if (! $allowed) {
        expect(fn () => $widget->imageHealth())->toThrow(HttpException::class);

        return;
    }
    expect($widget->imageHealth())->toBe(app(ImageHostHealth::class)->report());
    DB::table('users')->where('id', $actor->id)->update(['role' => 'support']);
    expect(fn () => $widget->imageHealth())->toThrow(HttpException::class);
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a upload forms preserve the Persian low-memory explanation instead of replacing it with a generic file error', function () {
    Storage::fake('local');
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    Filament::bootCurrentPanel();
    $actor = User::factory()->create(['role' => 'admin']);
    $product = app(Products::class)->save($actor, ['title' => 'کالا', 'slug' => 'product', 'sku' => 'SKU', 'price' => 100]);
    $this->actingAs($actor, 'web');
    config(['media.processing_memory_bytes' => 32 * 1024 * 1024]);
    Livewire::test(ProductContentEditor::class, ['product' => $product->id])->set('imageUpload', UploadedFile::fake()->image('tiny.png', 2, 2))->call('save')->assertHasErrors('imageUpload')->assertSee('حافظه مجاز هاست')->assertSet('notice', '');
    expect(Storage::disk('local')->files('media'))->toBe([]);
    expect($product->fresh()->gallery_images)->toBeNull();
});
