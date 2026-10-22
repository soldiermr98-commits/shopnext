<?php

declare(strict_types=1);

use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\User;
use App\Services\Categories;
use App\Services\SafeUpload;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\Support\FinancialFixtures;

uses(RefreshDatabase::class);

it('L3a category service independently enforces six roles for every operation and records the actual actor', function (string $role, bool $allowed) {
    $actor = User::factory()->create(['role' => $role]);
    $service = app(Categories::class);
    if (! $allowed) {
        foreach ([fn () => $service->listing($actor), fn () => $service->save($actor, ['title' => 'دسته', 'slug' => 'test']), fn () => $service->save($actor, [], 123), fn () => $service->reorder($actor, null, [123]), fn () => $service->delete($actor, 123)] as $operation) {
            expect($operation)->toThrow(AuthorizationException::class);
        }
        expect(Category::count())->toBe(0);
        expect(ActivityLog::count())->toBe(0);

        return;
    }
    $root = $service->save($actor, ['title' => 'ریشه', 'slug' => 'root']);
    $second = $service->save($actor, ['title' => 'دوم', 'slug' => 'second']);
    $child = $service->save($actor, ['title' => 'فرزند', 'slug' => 'child', 'parent_id' => $root->id]);
    $service->save($actor, ['title' => 'ویرایش', 'slug' => 'child', 'parent_id' => $root->id, 'meta_title' => 'عنوان سئو', 'meta_description' => 'شرح سئو', 'description' => '<p>متن</p><script>alert(1)</script>'], $child->id);
    expect($child->fresh()->meta_title)->toBe('عنوان سئو');
    expect($child->fresh()->description)->not->toContain('<script');
    $service->reorder($actor, null, [$second->id, $root->id]);
    expect($second->fresh()->order_index)->toBe(0);
    expect($root->fresh()->order_index)->toBe(1);
    $service->delete($actor, $child->id);
    expect(Category::find($child->id))->toBeNull();
    expect($service->listing($actor)->total())->toBe(2);
    expect(ActivityLog::where('module', 'categories')->count())->toBe(7);
    expect(ActivityLog::where('user_id', '!=', $actor->id)->count())->toBe(0);
    expect(ActivityLog::latest('id')->first()->user_role)->toBe($role);
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a category service rejects cycles duplicate slugs foreign ordering and referenced deletion with Persian errors', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Categories::class);
    $root = $service->save($actor, ['title' => 'ریشه', 'slug' => 'root']);
    $child = $service->save($actor, ['title' => 'فرزند', 'slug' => 'child', 'parent_id' => $root->id]);
    foreach ([fn () => $service->save($actor, ['title' => 'تکراری', 'slug' => 'root']), fn () => $service->save($actor, ['title' => 'چرخه', 'slug' => 'root', 'parent_id' => $child->id], $root->id), fn () => $service->reorder($actor, null, [$child->id]), fn () => $service->reorder($actor, null, [$root->id, $root->id]), fn () => $service->delete($actor, $root->id)] as $operation) {
        try {
            $operation();
            $this->fail('Invalid category mutation unexpectedly succeeded.');
        } catch (ValidationException $exception) {
            expect(json_encode($exception->errors(), JSON_UNESCAPED_UNICODE))->toMatch('/[آ-ی]/u');
        }
    }
    DB::table('category_product')->insert(['category_id' => $child->id, 'product_id' => FinancialFixtures::product()]);
    expect(fn () => $service->delete($actor, $child->id))->toThrow(ValidationException::class);
    expect($root->fresh()->parent_id)->toBeNull();
    expect(Category::count())->toBe(2);
});

it('L3a category service accepts only existing safely rasterized image references', function () {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Categories::class);
    foreach (['/media/../../secret.png', 'https://example.invalid/image.png', '/media/not-safe.svg', '/media/'.str_repeat('a', 48).'.png'] as $image) {
        expect(fn () => $service->save($actor, ['title' => 'تصویر', 'slug' => 'image', 'image' => $image]))->toThrow(ValidationException::class);
    }
    $file = app(SafeUpload::class)->store(UploadedFile::fake()->image('safe.png', 16, 16));
    $category = $service->save($actor, ['title' => 'تصویر', 'slug' => 'image', 'image' => '/media/'.$file]);
    expect($category->fresh()->image)->toBe('/media/'.$file);
});

it('L3a category service refreshes authorization and rolls back the mutation if its actor audit fails', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Categories::class);
    $category = $service->save($actor, ['title' => 'اصلی', 'slug' => 'original']);
    ActivityLog::creating(function (): void {
        throw new RuntimeException('Injected audit failure.');
    });
    try {
        expect(fn () => $service->save($actor, ['title' => 'تغییر', 'slug' => 'changed'], $category->id))->toThrow(RuntimeException::class);
        expect($category->fresh()->title)->toBe('اصلی');
    } finally {
        ActivityLog::flushEventListeners();
    }
    DB::table('users')->where('id', $actor->id)->update(['role' => 'support']);
    expect(fn () => $service->delete($actor, $category->id))->toThrow(AuthorizationException::class);
    expect(Category::count())->toBe(1);
});

it('L3a category big lists paginate and eager load parents in four bounded queries', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $root = (new Category)->forceFill(['title' => 'ریشه', 'slug' => 'root', 'order_index' => 1000]);
    $root->saveQuietly();
    $rows = [];
    for ($i = 0; $i < 300; $i++) {
        $rows[] = ['title' => 'فرزند '.$i, 'slug' => 'child-'.$i, 'parent_id' => $root->id];
    }
    DB::table('categories')->insert($rows);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $page = app(Categories::class)->listing($actor);
    foreach ($page as $category) {
        expect($category->parent->title)->toBe('ریشه');
    }
    $queries = DB::getQueryLog();
    DB::disableQueryLog();
    expect($page->total())->toBe(301);
    expect($page->count())->toBe(30);
    expect($queries)->toHaveCount(4);
});
