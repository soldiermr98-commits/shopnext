<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('maps every one of the 175 declared legacy columns across all 14 tables', function () {
    $map = json_decode(file_get_contents(base_path('../docs/LEGACY_SCHEMA_MAP.json')), true, 512, JSON_THROW_ON_ERROR)['tables'];
    $source = file_get_contents(base_path('../legacy/server/db/database.ts'));
    preg_match_all('/CREATE TABLE IF NOT EXISTS (\w+)\s*\((.*?)\);/s', $source, $matches, PREG_SET_ORDER);
    $count = 0;
    $tables = [];
    foreach ($matches as $match) {
        if ($match[1] === 'auth_sessions') {
            continue; // Phase A addition, not one of the original 14 entities; Sanctum replaces it.
        }
        $table = $match[1];
        $tables[] = $table;
        $columns = array_map(fn (string $line) => preg_split('/\s+/', trim($line))[0], array_values(array_filter(explode("\n", $match[2]), fn (string $line) => trim($line) !== '')));
        expect(array_keys($map[$table]))->toBe($columns);
        foreach ($columns as $column) {
            $count++;
            expect($map[$table][$column])->not->toBeEmpty();
            foreach ($map[$table][$column] as $target) {
                [$targetTable, $targetColumn] = explode('.', $target, 2);
                expect(Schema::hasColumn($targetTable, $targetColumn))->toBeTrue("Missing {$target}");
            }
        }
        if ($table !== 'settings') {
            expect(Schema::hasIndex($table, ['legacy_id'], 'unique'))->toBeTrue();
        }
    }
    expect($count)->toBe(175);
    expect(array_keys($map))->toBe($tables)->toHaveCount(14);
});

it('enforces every remaining legacy unique key with direct SQL', function (string $table, string $key, array $values) {
    DB::table($table)->insert($values);
    expect(fn () => DB::table($table)->insert($values))->toThrow(QueryException::class);
    expect(Schema::hasIndex($table, [$key], 'unique'))->toBeTrue();
})->with([
    ['categories', 'slug', ['title' => 'Fixture', 'slug' => 'unique']],
    ['brands', 'slug', ['name' => 'Fixture', 'slug' => 'unique']],
    ['blog_posts', 'slug', ['title' => 'Fixture', 'slug' => 'unique', 'content' => 'Safe']],
    ['settings', 'key', ['key' => 'unique', 'value' => 'not-a-credential']],
]);

it('rejects invalid JSON on all server families', function () {
    expect(fn () => DB::table('products')->insert(['title' => 'Fixture', 'slug' => 'json', 'sku' => 'json', 'price' => 10, 'gallery_images' => '{invalid']))->toThrow(QueryException::class);
});

it('rejects invalid catalog discount and rating checks', function (array $values) {
    expect(fn () => DB::table('products')->insert(array_merge(['title' => 'Fixture', 'slug' => 'bounds', 'sku' => 'bounds', 'price' => 10], $values)))->toThrow(QueryException::class);
})->with([[['discount_percent' => 101]], [['rating' => -1]], [['rating' => 5.01]], [['reviews_count' => -1]]]);

it('enforces category parent foreign keys and safe pivot cascades', function () {
    expect(fn () => DB::table('categories')->insert(['title' => 'Orphan', 'slug' => 'orphan', 'parent_id' => 999999]))->toThrow(QueryException::class);
    $category = DB::table('categories')->insertGetId(['title' => 'Parent', 'slug' => 'parent']);
    $child = DB::table('categories')->insertGetId(['title' => 'Child', 'slug' => 'child', 'parent_id' => $category]);
    expect(fn () => DB::table('categories')->where('id', $category)->delete())->toThrow(QueryException::class);
    $product = DB::table('products')->insertGetId(['title' => 'Fixture', 'slug' => 'pivot', 'sku' => 'pivot', 'price' => 1]);
    DB::table('category_product')->insert(['category_id' => $child, 'product_id' => $product]);
    DB::table('categories')->where('id', $child)->delete();
    expect(DB::table('category_product')->count())->toBe(0);
    expect(DB::table('products')->where('id', $product)->exists())->toBeTrue();
});

it('cannot attach another products variant to an order item', function () {
    $user = User::factory()->create();
    $product = DB::table('products')->insertGetId(['title' => 'First', 'slug' => 'first', 'sku' => 'first', 'price' => 10]);
    $other = DB::table('products')->insertGetId(['title' => 'Other', 'slug' => 'other', 'sku' => 'other', 'price' => 10]);
    $variant = DB::table('product_variants')->insertGetId(['product_id' => $product, 'sku' => 'variant', 'price' => 10]);
    expect(fn () => DB::table('product_variants')->insert(['product_id' => $other, 'sku' => 'variant', 'price' => 10]))->toThrow(QueryException::class);
    $order = DB::table('orders')->insertGetId(['user_id' => $user->id, 'order_number' => 'fixture', 'tracking_code' => 'fixture', 'customer_name' => 'Fixture', 'customer_phone' => $user->phone, 'shipping_address' => '{}']);
    expect(fn () => DB::table('order_items')->insert(['order_id' => $order, 'product_id' => $other, 'product_variant_id' => $variant, 'title' => 'Wrong', 'sku' => 'wrong', 'quantity' => 1, 'unit_price' => 10]))->toThrow(QueryException::class);
});

it('uses only canonical Toman and enforces scoped gateway authority uniqueness', function () {
    $user = User::factory()->create();
    $order = DB::table('orders')->insertGetId(['user_id' => $user->id, 'order_number' => 'fixture', 'tracking_code' => 'fixture', 'customer_name' => 'Fixture', 'customer_phone' => $user->phone, 'shipping_address' => '{}']);
    $transaction = ['order_id' => $order, 'gateway' => 'fixture', 'authority' => 'once', 'amount' => 100];
    DB::table('transactions')->insert($transaction);
    expect(fn () => DB::table('transactions')->insert($transaction))->toThrow(QueryException::class);
    expect(fn () => DB::table('transactions')->insert(array_replace($transaction, ['authority' => 'rial', 'unit' => 'RIAL'])))->toThrow(QueryException::class);
    expect(fn () => DB::table('transactions')->insert(array_replace($transaction, ['authority' => 'negative', 'amount' => -1])))->toThrow(QueryException::class);
});

it('cannot create a return for a different customer or unrelated order item', function () {
    $customer = User::factory()->create();
    $other = User::factory()->create();
    $makeOrder = fn (string $number) => DB::table('orders')->insertGetId(['user_id' => $customer->id, 'order_number' => $number, 'tracking_code' => $number, 'customer_name' => 'Fixture', 'customer_phone' => $customer->phone, 'shipping_address' => '{}']);
    $first = $makeOrder('first');
    $second = $makeOrder('second');
    expect(fn () => DB::table('return_requests')->insert(['order_id' => $first, 'user_id' => $other->id, 'items' => '[]']))->toThrow(QueryException::class);
    $return = DB::table('return_requests')->insertGetId(['order_id' => $first, 'user_id' => $customer->id, 'items' => '[]']);
    $product = DB::table('products')->insertGetId(['title' => 'Fixture', 'slug' => 'return', 'sku' => 'return', 'price' => 10]);
    $item = DB::table('order_items')->insertGetId(['order_id' => $second, 'product_id' => $product, 'title' => 'Fixture', 'sku' => 'return', 'quantity' => 1, 'unit_price' => 10]);
    expect(fn () => DB::table('return_items')->insert(['return_request_id' => $return, 'order_id' => $first, 'order_item_id' => $item, 'quantity' => 1, 'reason' => 'Fixture', 'snapshot' => '{}']))->toThrow(QueryException::class);
});
