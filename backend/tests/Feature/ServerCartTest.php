<?php

declare(strict_types=1);

use App\Financial\CartService;
use App\Financial\Rules;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(RefreshDatabase::class);

function cartProduct(array $attributes = []): int
{
    $sku = bin2hex(random_bytes(16));

    return DB::table('products')->insertGetId(array_replace(['title' => 'سبد', 'sku' => $sku, 'slug' => $sku, 'price' => 100, 'status' => 'published', 'stock' => 1000], $attributes));
}

it('C02 H10 persists canonical guest quantities with hashed unguessable token and no client prices', function () {
    $cart = app(CartService::class);
    $id = cartProduct();
    expect($cart->view(null, null)['id'])->toBeNull()->and(DB::table('carts')->count())->toBe(0);
    $created = $cart->replace(null, null, [['product_id' => $id, 'quantity' => 2, 'price' => 0, 'line_total' => 0]], 0);
    expect($created['token'])->toMatch('/^[0-9a-f]{64}$/D');
    expect(DB::table('carts')->where('id', $created['id'])->value('token_hash'))->toBe(hash('sha256', $created['token']));
    $view = $cart->view(null, $created['token']);
    expect($view['items'])->toBe([['product_id' => $id, 'variant_id' => null, 'quantity' => 2]])->and($view['pricing']['totals']['merchandise_total'])->toBe(200);
    expect($cart->view(null, str_repeat('0', 64))['items'])->toBe([]);
    expect($cart->view(null, 'invalid')['items'])->toBe([]);
    expect(DB::getSchemaBuilder()->getColumnListing('cart_items'))->not->toContain('price');
});

it('C01 H10 account carts do not authorize by supplied guest token and owner writes reject stale versions', function () {
    $cart = app(CartService::class);
    $id = cartProduct();
    $a = User::factory()->create();
    $b = User::factory()->create();
    $guest = $cart->replace(null, null, [['product_id' => $id, 'quantity' => 5]], 0);
    $account = $cart->replace($a, $guest['token'], [['product_id' => $id, 'quantity' => 2]], 0);
    expect($cart->view($b, $guest['token'])['items'])->toBe([])->and($cart->view($b, $guest['token'])['merge_conflict'])->toBeTrue();
    expect($cart->view(null, $guest['token'])['items'][0]['quantity'])->toBe(5);
    expect(fn () => $cart->replace($a, null, [], 0))->toThrow(HttpException::class);
    expect($cart->view($a, null)['version'])->toBe($account['version'])->and($cart->view($a, null)['items'][0]['quantity'])->toBe(2);
    $a->forceFill(['is_active' => false])->save();
    expect(fn () => $cart->replace($a, null, [], 1))->toThrow(HttpException::class);
});

it('H10 login merge combines duplicate quantities once and deletes guest only on total success', function () {
    $cart = app(CartService::class);
    $user = User::factory()->create();
    $id = cartProduct();
    $guest = $cart->replace(null, null, [['product_id' => $id, 'quantity' => 3]], 0);
    $cart->replace($user, null, [['product_id' => $id, 'quantity' => 2]], 0);
    expect($cart->merge($user, $guest['token'])['status'])->toBe('merged');
    expect($cart->view($user, null)['items'][0]['quantity'])->toBe(5);
    expect(DB::table('carts')->where('id', $guest['id'])->exists())->toBeFalse();
    expect($cart->merge($user, $guest['token'])['status'])->toBe('none');
    expect($cart->view($user, null)['items'][0]['quantity'])->toBe(5);
});

it('H10 conflict preserves both full carts and versions without clamping or partial lines', function () {
    $cart = app(CartService::class);
    $user = User::factory()->create();
    $id = cartProduct();
    $extra = cartProduct();
    $guest = $cart->replace(null, null, [['product_id' => $id, 'quantity' => 60], ['product_id' => $extra, 'quantity' => 1]], 0);
    $cart->replace($user, null, [['product_id' => $id, 'quantity' => 60]], 0);
    $beforeCarts = DB::table('carts')->orderBy('id')->get()->toJson();
    $beforeItems = DB::table('cart_items')->orderBy('id')->get()->toJson();
    expect($cart->merge($user, $guest['token'])['status'])->toBe('conflict');
    expect(DB::table('carts')->orderBy('id')->get()->toJson())->toBe($beforeCarts);
    expect(DB::table('cart_items')->orderBy('id')->get()->toJson())->toBe($beforeItems);
    $view = $cart->view($user, $guest['token']);
    expect($view['merge_conflict'])->toBeTrue()->and($view['pending_guest_items'])->toHaveCount(2)->and($view['items'])->toHaveCount(1);
    // Customer can reduce account quantities, then explicitly retry the whole merge.
    $cart->replace($user, null, [['product_id' => $id, 'quantity' => 1]], 1);
    expect($cart->merge($user, $guest['token'])['status'])->toBe('merged');
    expect($cart->view($user, null)['items'][0]['quantity'])->toBe(61);
});

it('H10 applies the distinct-line limit after canonical merge not before duplicate combination', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    app(Rules::class)->replace($admin, ['max_lines' => 1]);
    $cart = app(CartService::class);
    $user = User::factory()->create();
    $id = cartProduct();
    $guest = $cart->replace(null, null, [['product_id' => $id, 'quantity' => 1]], 0);
    $cart->replace($user, null, [['product_id' => $id, 'quantity' => 1]], 0);
    expect($cart->merge($user, $guest['token'])['status'])->toBe('merged');
    $other = cartProduct();
    $guest = $cart->replace(null, null, [['product_id' => $other, 'quantity' => 1]], 0);
    expect($cart->merge($user, $guest['token'])['status'])->toBe('conflict');
    expect($cart->view($user, null)['items'][0]['quantity'])->toBe(2);
});

it('C02 H10 fails an invalid replacement atomically and shows stale catalog as unpriced not fake zero', function () {
    $cart = app(CartService::class);
    $id = cartProduct();
    $guest = $cart->replace(null, null, [['product_id' => $id, 'quantity' => 2]], 0);
    expect(fn () => $cart->replace(null, $guest['token'], [['product_id' => $id, 'quantity' => 0]], 1))->toThrow(ValidationException::class);
    expect($cart->view(null, $guest['token'])['version'])->toBe(1);
    DB::table('products')->where('id', $id)->update(['status' => 'draft']);
    $view = $cart->view(null, $guest['token']);
    expect($view['items'][0]['quantity'])->toBe(2)->and($view['pricing'])->toBeNull()->and($view['errors'])->not->toBeEmpty();
    $cart->replace(null, $guest['token'], [], 1);
    expect($cart->view(null, $guest['token'])['items'])->toBe([]);
});

it('H10 successful HTTP login explicitly reports merge conflict while keeping both carts and authenticated identity', function () {
    $cart = app(CartService::class);
    $id = cartProduct();
    $password = bin2hex(random_bytes(16));
    $user = User::factory()->create(['password' => $password]);
    $guest = $cart->replace(null, null, [['product_id' => $id, 'quantity' => 60]], 0);
    $cart->replace($user, null, [['product_id' => $id, 'quantity' => 60]], 0);
    $this->withCredentials()->withCookie(CartService::COOKIE, $guest['token'])->postJson('/api/auth/login', ['identifier' => $user->phone, 'password' => $password])->assertOk()->assertJsonPath('user.id', (string) $user->id)->assertJsonPath('cart_merge.status', 'conflict');
    expect($cart->view(null, $guest['token'])['items'][0]['quantity'])->toBe(60)->and($cart->view($user, null)['items'][0]['quantity'])->toBe(60);
});
