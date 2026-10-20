<?php

declare(strict_types=1);

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

function schemaProduct(array $changes = []): int
{
    return DB::table('products')->insertGetId(array_replace([
        'title' => 'پیراهن آزمایشی', 'slug' => bin2hex(random_bytes(8)),
        'sku' => bin2hex(random_bytes(8)), 'price' => 120000, 'stock' => 2,
    ], $changes));
}

function schemaOrder(int $user): int
{
    return DB::table('orders')->insertGetId([
        'user_id' => $user, 'order_number' => bin2hex(random_bytes(8)),
        'tracking_code' => bin2hex(random_bytes(8)), 'customer_name' => 'Fixture',
        'customer_phone' => '09100000000', 'shipping_address' => '{}',
    ]);
}

it('enforces unique user identity directly in MySQL', function (string $field) {
    $a = User::factory()->create();
    expect(fn () => User::factory()->create([$field => $a->$field]))->toThrow(QueryException::class);
})->with(['email', 'phone']);

it('enforces product uniqueness directly in MySQL', function (string $field) {
    $id = schemaProduct();
    $value = DB::table('products')->where('id', $id)->value($field);
    expect(fn () => schemaProduct([$field => $value]))->toThrow(QueryException::class);
})->with(['slug', 'sku']);

it('rejects invalid catalog money and stock without validation middleware', function (array $values) {
    expect(fn () => schemaProduct($values))->toThrow(QueryException::class);
})->with([
    'negative price' => [['price' => -1]], 'negative stock' => [['stock' => -1]],
    'sale exceeds price' => [['price' => 10, 'sale_price' => 11]],
    'negative sale' => [['sale_price' => -1]],
    'JS unsafe integer' => [['price' => 9007199254740992]],
    'unknown publication enum' => [['status' => 'anything']],
    'orphan brand' => [['brand_id' => 999999]],
]);

it('restricts deletion of ordered products and customers, and retains snapshots', function () {
    $user = User::factory()->create();
    $product = schemaProduct();
    $order = schemaOrder($user->id);
    DB::table('order_items')->insert([
        'order_id' => $order, 'product_id' => $product, 'title' => 'Immutable',
        'sku' => 'snapshot', 'quantity' => 1, 'unit_price' => 120000,
    ]);
    expect(fn () => DB::table('products')->where('id', $product)->delete())->toThrow(QueryException::class);
    expect(fn () => $user->delete())->toThrow(QueryException::class);
    expect(fn () => DB::table('orders')->where('id', $order)->delete())->toThrow(QueryException::class);
    DB::table('products')->where('id', $product)->update(['title' => 'Changed']);
    expect(DB::table('order_items')->where('order_id', $order)->value('title'))->toBe('Immutable');
});

it('rejects zero order item quantity and orphan item relationships', function (string $case) {
    $user = User::factory()->create();
    $item = ['order_id' => schemaOrder($user->id), 'product_id' => schemaProduct(),
        'title' => 'Fixture', 'sku' => 'fixture', 'quantity' => 1, 'unit_price' => 1];
    if ($case === 'quantity') {
        $item['quantity'] = 0;
    } else {
        $item[$case] = 999999;
    }
    expect(fn () => DB::table('order_items')->insert($item))->toThrow(QueryException::class);
})->with(['quantity', 'order_id', 'product_id', 'product_variant_id']);

it('enforces coupon uniqueness and percentage bounds', function () {
    DB::table('coupons')->insert(['code' => 'UNIQUE', 'type' => 'percentage', 'value' => 10]);
    expect(fn () => DB::table('coupons')->insert(['code' => 'UNIQUE', 'type' => 'fixed', 'value' => 1]))->toThrow(QueryException::class);
    expect(fn () => DB::table('coupons')->insert(['code' => 'OVER', 'type' => 'percentage', 'value' => 101]))->toThrow(QueryException::class);
});

it('round trips integer Toman and Persian text with required indexes and engine', function () {
    $id = schemaProduct(['price' => 9007199254740991]);
    $product = DB::table('products')->find($id);
    expect((int) $product->price)->toBe(9007199254740991);
    expect($product->title)->toBe('پیراهن آزمایشی');
    expect(Schema::hasIndex('products', ['sku'], 'unique'))->toBeTrue();
    expect(Schema::hasIndex('orders', ['user_id', 'created_at']))->toBeTrue();
    $table = DB::selectOne("SELECT ENGINE, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'");
    expect($table->ENGINE)->toBe('InnoDB');
    expect($table->TABLE_COLLATION)->toStartWith('utf8mb4');
});

it('rolls back a multi-write failure without phantom records', function () {
    $before = DB::table('products')->count();
    expect(fn () => DB::transaction(function () {
        schemaProduct();
        schemaProduct(['stock' => -1]);
    }))->toThrow(QueryException::class);
    expect(DB::table('products')->count())->toBe($before);
});

it('refuses development seeders in production', function () {
    $this->app->detectEnvironment(fn () => 'production');
    try {
        expect(fn () => (new DatabaseSeeder)->run())->toThrow(RuntimeException::class);
    } finally {
        $this->app->detectEnvironment(fn () => 'testing');
    }
});
