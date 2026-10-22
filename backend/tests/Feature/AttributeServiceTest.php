<?php

declare(strict_types=1);

use App\Models\ActivityLog;
use App\Models\AttributeTerm;
use App\Models\CatalogAttribute;
use App\Models\User;
use App\Services\Attributes;
use App\Services\SafeUpload;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\Support\FinancialFixtures;

uses(RefreshDatabase::class);

it('L3a attributes and terms independently enforce six roles and persist all CRUD with actual actor audits', function (string $role, bool $allowed) {
    $actor = User::factory()->create(['role' => $role]);
    $service = app(Attributes::class);
    if (! $allowed) {
        foreach ([fn () => $service->listing($actor), fn () => $service->terms($actor, 123), fn () => $service->save($actor, []), fn () => $service->save($actor, [], 123), fn () => $service->delete($actor, 123), fn () => $service->saveTerm($actor, 123, []), fn () => $service->saveTerm($actor, 123, [], 123), fn () => $service->deleteTerm($actor, 123, 123)] as $operation) {
            expect($operation)->toThrow(AuthorizationException::class);
        }
        expect(CatalogAttribute::count())->toBe(0);
        expect(AttributeTerm::count())->toBe(0);
        expect(ActivityLog::count())->toBe(0);

        return;
    }
    $attribute = $service->save($actor, ['name' => 'رنگ', 'slug' => 'color', 'type' => 'color']);
    $term = $service->saveTerm($actor, $attribute->id, ['name' => 'قرمز', 'slug' => 'red', 'hex' => '#abc']);
    expect($term->fresh()->hex)->toBe('#AABBCC');
    $service->saveTerm($actor, $attribute->id, ['name' => 'آبی', 'slug' => 'blue', 'hex' => '#1234ff', 'order_index' => 2], $term->id);
    expect($term->fresh()->hex)->toBe('#1234FF');
    $service->save($actor, ['name' => 'رنگ جدید', 'slug' => 'color', 'type' => 'color'], $attribute->id);
    expect((int) $service->listing($actor)->first()->terms_count)->toBe(1);
    expect($service->terms($actor, $attribute->id)->first()->attribute->name)->toBe('رنگ جدید');
    $service->deleteTerm($actor, $attribute->id, $term->id);
    $service->delete($actor, $attribute->id);
    expect(CatalogAttribute::count())->toBe(0);
    expect(AttributeTerm::count())->toBe(0);
    expect(ActivityLog::where('module', 'catalog_attributes')->where('user_id', $actor->id)->count())->toBe(3);
    expect(ActivityLog::where('module', 'attribute_terms')->where('user_id', $actor->id)->count())->toBe(3);
})->with([
    ['super_admin', true], ['admin', true], ['shop_manager', true],
    ['content_editor', false], ['support', false], ['customer', false],
]);

it('L3a attribute validation preserves scoped slugs hex ownership and product usage with real SQL constraints', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Attributes::class);
    $a = $service->save($actor, ['name' => 'رنگ یک', 'slug' => 'color-one', 'type' => 'color']);
    $b = $service->save($actor, ['name' => 'رنگ دو', 'slug' => 'color-two', 'type' => 'color']);
    $term = $service->saveTerm($actor, $a->id, ['name' => 'قرمز', 'slug' => 'red', 'hex' => '#112233']);
    $service->saveTerm($actor, $b->id, ['name' => 'قرمز', 'slug' => 'red', 'hex' => '#ff0000']);
    foreach ([fn () => $service->save($actor, ['name' => 'تکراری', 'slug' => 'color-one', 'type' => 'select']), fn () => $service->saveTerm($actor, $a->id, ['name' => 'تکراری', 'slug' => 'red', 'hex' => '#ffffff']), fn () => $service->saveTerm($actor, $a->id, ['name' => 'نامعتبر', 'slug' => 'invalid', 'hex' => '#12GG00']), fn () => $service->saveTerm($actor, $a->id, ['name' => 'خالی', 'slug' => 'empty', 'hex' => '']), fn () => $service->save($actor, ['name' => 'نوع تازه', 'slug' => 'color-one', 'type' => 'image'], $a->id)] as $operation) {
        try {
            $operation();
            $this->fail('Invalid attribute mutation unexpectedly succeeded.');
        } catch (ValidationException $exception) {
            expect(json_encode($exception->errors(), JSON_UNESCAPED_UNICODE))->toMatch('/[آ-ی]/u');
        }
    }
    expect(fn () => $service->saveTerm($actor, $b->id, ['name' => 'بیگانه', 'slug' => 'foreign', 'hex' => '#123456'], $term->id))->toThrow(ModelNotFoundException::class);
    expect(fn () => DB::table('attribute_terms')->insert(['attribute_id' => $a->id, 'name' => 'ناامن', 'slug' => 'unsafe', 'hex' => '#GG0000']))->toThrow(QueryException::class);
    $product = FinancialFixtures::product();
    expect(fn () => DB::table('product_attribute_terms')->insert(['product_id' => $product, 'term_id' => $term->id, 'attribute_id' => $b->id]))->toThrow(QueryException::class);
    DB::table('product_attribute_terms')->insert(['product_id' => $product, 'term_id' => $term->id, 'attribute_id' => $a->id]);
    expect(fn () => $service->deleteTerm($actor, $a->id, $term->id))->toThrow(ValidationException::class);
    expect(fn () => $service->delete($actor, $a->id))->toThrow(ValidationException::class);
    expect($term->fresh()->attribute_id)->toBe($a->id);
});

it('L3a image terms require existing safe raster references and preserve images on unrelated edits', function () {
    Storage::fake('local');
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Attributes::class);
    $attribute = $service->save($actor, ['name' => 'طرح', 'slug' => 'pattern', 'type' => 'image']);
    foreach ([null, '', 'https://example.invalid/evil.svg', '/media/'.str_repeat('a', 48).'.png'] as $image) {
        expect(fn () => $service->saveTerm($actor, $attribute->id, ['name' => 'طرح', 'slug' => 'pattern', 'image' => $image]))->toThrow(ValidationException::class);
    }
    $image = '/media/'.app(SafeUpload::class)->store(UploadedFile::fake()->image('term.png', 16, 16));
    $term = $service->saveTerm($actor, $attribute->id, ['name' => 'طرح', 'slug' => 'pattern', 'image' => $image]);
    $service->saveTerm($actor, $attribute->id, ['name' => 'طرح تازه', 'slug' => 'pattern'], $term->id);
    expect($term->fresh()->image)->toBe($image);
});

it('L3a attribute and term audits roll back writes and stale roles cannot mutate them', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $service = app(Attributes::class);
    $attribute = $service->save($actor, ['name' => 'اندازه', 'slug' => 'size', 'type' => 'select']);
    ActivityLog::creating(function (): void {
        throw new RuntimeException('Injected taxonomy audit failure.');
    });
    try {
        expect(fn () => $service->save($actor, ['name' => 'تغییر', 'slug' => 'changed', 'type' => 'select'], $attribute->id))->toThrow(RuntimeException::class);
        expect(fn () => $service->saveTerm($actor, $attribute->id, ['name' => 'کوچک', 'slug' => 'small']))->toThrow(RuntimeException::class);
        expect($attribute->fresh()->name)->toBe('اندازه');
        expect(AttributeTerm::count())->toBe(0);
    } finally {
        ActivityLog::flushEventListeners();
    }
    DB::table('users')->where('id', $actor->id)->update(['role' => 'support']);
    expect(fn () => $service->delete($actor, $attribute->id))->toThrow(AuthorizationException::class);
});

it('L3a attribute and term thousand row lists bound eager counts and owner labels', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $attribute = app(Attributes::class)->save($actor, ['name' => 'اندازه', 'slug' => 'size', 'type' => 'select']);
    $rows = [];
    $terms = [];
    for ($i = 0; $i < 1000; $i++) {
        $rows[] = ['name' => 'ویژگی '.$i, 'slug' => 'attribute-'.$i];
        $terms[] = ['attribute_id' => $attribute->id, 'name' => 'گزینه '.$i, 'slug' => 'term-'.$i];
    }
    DB::table('catalog_attributes')->insert($rows);
    DB::table('attribute_terms')->insert($terms);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $page = app(Attributes::class)->listing($actor);
    expect($page->count())->toBe(30);
    expect((int) $page->first()->terms_count)->toBe(1000);
    expect(DB::getQueryLog())->toHaveCount(3);
    DB::flushQueryLog();
    $page = app(Attributes::class)->terms($actor, $attribute->id);
    foreach ($page as $term) {
        expect($term->attribute->name)->toBe('اندازه');
    }
    expect($page->total())->toBe(1000);
    expect($page->count())->toBe(30);
    $queries = DB::getQueryLog();
    DB::disableQueryLog();
    expect($queries)->toHaveCount(5);
});
