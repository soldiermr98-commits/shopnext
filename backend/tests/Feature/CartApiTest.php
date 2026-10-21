<?php

declare(strict_types=1);

use App\Financial\CartService;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\EnforcedCsrf;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withCredentials();
    $this->app->bind(ValidateCsrfToken::class, EnforcedCsrf::class);
    config(['cache.default' => 'database']);
});

function cartCsrf(): void
{
    $response = test()->get('https://localhost/sanctum/csrf-cookie');
    foreach ($response->headers->getCookies() as $cookie) {
        test()->withUnencryptedCookie($cookie->getName(), $cookie->getValue());
        if ($cookie->getName() === 'XSRF-TOKEN') {
            test()->withHeader('X-XSRF-TOKEN', $cookie->getValue());
        }
    }
}

it('M02 H09 enforces real CSRF on guest cart and quote and rejects bearer fallback', function () {
    $this->putJson('https://localhost/api/cart', ['items' => [], 'version' => 0])->assertStatus(419);
    $this->postJson('https://localhost/api/quote', ['items' => []])->assertStatus(419);
    $this->withHeader('Authorization', 'Bearer forged')->getJson('https://localhost/api/cart')->assertUnauthorized();
});

it('H10 issues a secure host-only httponly guest cookie and reloads authoritative persisted cart without returning token', function () {
    cartCsrf();
    $sku = bin2hex(random_bytes(16));
    $id = DB::table('products')->insertGetId(['sku' => $sku, 'slug' => $sku, 'title' => 'کالا', 'price' => 100, 'stock' => 10, 'status' => 'published']);
    $result = $this->putJson('https://localhost/api/cart', ['items' => [['product_id' => $id, 'quantity' => 2, 'price' => 0]], 'version' => 0, 'payable_total' => 0]);
    $result->assertOk()->assertJsonPath('pricing.totals.merchandise_total', 200)->assertJsonMissingPath('token');
    $cookie = $result->getCookie(CartService::COOKIE, false);
    expect($cookie)->not->toBeNull()->and($cookie->isSecure())->toBeTrue()->and($cookie->isHttpOnly())->toBeTrue()->and($cookie->getPath())->toBe('/')->and($cookie->getDomain())->toBeNull()->and($cookie->getSameSite())->toBe('strict');
    $this->withUnencryptedCookie(CartService::COOKIE, $cookie->getValue())->getJson('https://localhost/api/cart')->assertOk()->assertJsonPath('items.0.quantity', 2)->assertJsonPath('version', 1);
    $this->putJson('https://localhost/api/cart', ['items' => [], 'version' => 0])->assertStatus(409);
    $this->putJson('https://localhost/api/cart', ['items' => [], 'version' => 1])->assertOk()->assertJsonCount(0, 'items');
});

it('C02 FormRequest rejects JSON fractional quantities and IDs before writing a cart', function () {
    cartCsrf();
    foreach ([0, -1, 1.5, '1', true] as $qty) {
        $this->putJson('https://localhost/api/cart', ['items' => [['product_id' => 1, 'quantity' => $qty]], 'version' => 0])->assertUnprocessable();
    }
    expect(DB::table('carts')->count())->toBe(0);
});

it('H09 bounds quote floods independently of authentication and requires login for merge retry', function () {
    cartCsrf();
    $this->postJson('https://localhost/api/cart/merge')->assertUnauthorized();
    for ($i = 0; $i < 60; $i++) {
        $response = $this->getJson('https://localhost/api/cart');
    }
    $response->assertStatus(429);
});

it('C01 H10 retry merges only authenticated account and token-authorized guest without accepting owner IDs', function () {
    cartCsrf();
    $owner = User::factory()->create();
    $foreign = User::factory()->create();
    $service = app(CartService::class);
    $sku = bin2hex(random_bytes(16));
    $id = DB::table('products')->insertGetId(['sku' => $sku, 'slug' => $sku, 'title' => 'کالا', 'price' => 100, 'stock' => 1000, 'status' => 'published']);
    $guest = $service->replace(null, null, [['product_id' => $id, 'quantity' => 2]], 0);
    $service->replace($foreign, null, [['product_id' => $id, 'quantity' => 5]], 0);
    $this->actingAs($owner, 'web')->withCookie(CartService::COOKIE, $guest['token'])->postJson('https://localhost/api/cart/merge', ['user_id' => $foreign->id])->assertOk()->assertJsonPath('cart_merge.status', 'merged')->assertJsonPath('cart.items.0.quantity', 2);
    expect($service->view($foreign, null)['items'][0]['quantity'])->toBe(5);
});
