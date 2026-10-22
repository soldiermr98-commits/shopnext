<?php

declare(strict_types=1);

use App\Models\ActivityLog;
use App\Models\Brand;
use App\Models\User;
use App\Services\Brands;
use App\Services\CatalogAudit;
use App\Services\SafeUpload;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\Support\FinancialFixtures;

uses(RefreshDatabase::class);

it('L3a brand service independently enforces all six roles for list create update delete and explicit actor audit', function (string $role, bool $allowed) {
    $actor = User::factory()->create(['role' => $role]);
    $service = app(Brands::class);
    if (! $allowed) {
        foreach ([fn () => $service->listing($actor), fn () => $service->save($actor, ['name' => 'برند', 'slug' => 'brand']), fn () => $service->save($actor, [], 123), fn () => $service->delete($actor, 123)] as $operation) {
            expect($operation)->toThrow(AuthorizationException::class);
        }
        expect(Brand::count())->toBe(0);
        expect(ActivityLog::count())->toBe(0);

        return;
    }
    $brand = $service->save($actor, ['name' => 'برند', 'slug' => 'brand', 'origin_country' => 'ایران', 'is_official' => true]);
    $service->save($actor, ['name' => 'ویرایش برند', 'slug' => 'brand', 'origin_country' => 'ایران', 'is_official' => false], $brand->id);
    expect($brand->fresh()->name)->toBe('ویرایش برند');
    expect((bool) $brand->fresh()->is_official)->toBeFalse();
    expect($service->listing($actor)->total())->toBe(1);
    $service->delete($actor, $brand->id);
    expect(Brand::find($brand->id))->toBeNull();
    expect(ActivityLog::where('module', 'brands')->where('user_id', $actor->id)->count())->toBe(3);
    expect(ActivityLog::latest('id')->first()->user_role)->toBe($role);
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a brand service protects unique slugs referenced brands and raster logo validation with Persian errors', function () {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Brands::class);
    $brand = $service->save($actor, ['name' => 'برند', 'slug' => 'brand']);
    FinancialFixtures::product(['brand_id' => $brand->id]);
    foreach ([fn () => $service->save($actor, ['name' => 'تکراری', 'slug' => 'brand']), fn () => $service->delete($actor, $brand->id), fn () => $service->save($actor, ['name' => 'تصویر', 'slug' => 'image', 'logo' => 'https://example.invalid/evil.svg']), fn () => $service->save($actor, ['name' => 'تصویر', 'slug' => 'image', 'logo' => '/media/'.str_repeat('a', 48).'.png'])] as $operation) {
        try {
            $operation();
            $this->fail('Invalid brand mutation unexpectedly succeeded.');
        } catch (ValidationException $exception) {
            expect(json_encode($exception->errors(), JSON_UNESCAPED_UNICODE))->toMatch('/[آ-ی]/u');
        }
    }
    $image = app(SafeUpload::class)->store(UploadedFile::fake()->image('logo.png', 16, 16));
    $service->save($actor, ['name' => 'برند', 'slug' => 'brand', 'logo' => '/media/'.$image], $brand->id);
    expect($brand->fresh()->logo)->toBe('/media/'.$image);
});

it('L3a brand service checks fresh staff flags before writing', function (string $field, bool $value) {
    $actor = User::factory()->create(['role' => 'admin']);
    DB::table('users')->where('id', $actor->id)->update([$field => $value]);
    expect(fn () => app(Brands::class)->save($actor, ['name' => 'برند', 'slug' => 'brand']))->toThrow(AuthorizationException::class);
    expect(Brand::count())->toBe(0);
})->with([['is_active', false], ['must_change_password', true]]);

it('L3a brand and audit roll back together and catalog audit redacts unknown fields', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Brands::class);
    $brand = $service->save($actor, ['name' => 'اصلی', 'slug' => 'original']);
    ActivityLog::creating(function (): void {
        throw new RuntimeException('Injected catalog audit failure.');
    });
    try {
        expect(fn () => $service->save($actor, ['name' => 'تغییر', 'slug' => 'changed'], $brand->id))->toThrow(RuntimeException::class);
        expect($brand->fresh()->name)->toBe('اصلی');
    } finally {
        ActivityLog::flushEventListeners();
    }
    DB::transaction(fn () => app(CatalogAudit::class)->write($actor, $brand, 'test_redaction', [], ['name' => 'عمومی', 'unrecognized' => 'synthetic-sensitive-value']));
    expect(ActivityLog::latest('id')->first()->after)->toBe(['name' => 'عمومی', 'unrecognized' => '[REDACTED]']);
});

it('L3a brand lists use three bounded queries for one thousand rows', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $rows = [];
    for ($i = 0; $i < 1000; $i++) {
        $rows[] = ['name' => 'برند '.$i, 'slug' => 'brand-'.$i];
    }
    DB::table('brands')->insert($rows);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $page = app(Brands::class)->listing($actor);
    $queries = DB::getQueryLog();
    DB::disableQueryLog();
    expect($page->total())->toBe(1000);
    expect($page->count())->toBe(30);
    expect($queries)->toHaveCount(3);
});
