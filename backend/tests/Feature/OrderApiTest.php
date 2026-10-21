<?php

declare(strict_types=1);

use App\Financial\CartService;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Support\EnforcedCsrf;
use Tests\Support\FinancialFixtures as F;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withCredentials();
    $this->app->bind(ValidateCsrfToken::class, EnforcedCsrf::class);
    Storage::fake('local');
    config(['cache.default' => 'database']);
});

function orderAs(User $user)
{
    // Fresh PHP request identity: Sanctum RequestGuard otherwise caches the first actor.
    Auth::forgetGuards();

    return test()->actingAs($user, 'web');
}

function orderCsrf(): void
{
    foreach (test()->get('https://localhost/sanctum/csrf-cookie')->headers->getCookies() as $cookie) {
        test()->withUnencryptedCookie($cookie->getName(), $cookie->getValue());
        if ($cookie->getName() === 'XSRF-TOKEN') {
            test()->withHeader('X-XSRF-TOKEN', $cookie->getValue());
        }
    }
}

it('C01 H02 H09 rejects guests foreign orders tracking enumeration and oversized pagination with empty own list', function () {
    F::rules();
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $order = F::order($owner);
    $this->getJson('https://localhost/api/orders')->assertUnauthorized();
    $this->getJson('https://localhost/api/orders/'.$order->id)->assertUnauthorized();
    orderAs($other)->getJson('https://localhost/api/orders/'.$order->id)->assertNotFound();
    $this->getJson('https://localhost/api/orders/track/'.$order->tracking_code)->assertNotFound();
    $this->getJson('https://localhost/api/orders')->assertOk()->assertJsonCount(0, 'data');
    $this->getJson('https://localhost/api/orders?per_page=51')->assertUnprocessable();
    orderAs($owner)->getJson('https://localhost/api/orders/track/'.$order->tracking_code)->assertOk()->assertJsonMissingPath('shipping_address')->assertJsonMissingPath('customer_phone');
});

it('C02 H06 H10 M06 checkout API discards client prices and items reprices owned cart and replays exactly one durable order', function () {
    F::rules();
    orderCsrf();
    $user = User::factory()->create();
    $p = F::product();
    app(CartService::class)->replace($user, null, [['product_id' => $p, 'quantity' => 1]], 0);
    DB::table('products')->where('id', $p)->update(['price' => 200]);
    $payload = ['version' => 1, 'address_id' => F::address($user), 'shipping_method' => 'post', 'payment_method' => 'cod', 'idempotency_key' => str_repeat('r', 32), 'payable_total' => 0, 'items' => []];
    $response = orderAs($user)->postJson('https://localhost/api/checkout', $payload);
    $response->assertCreated()->assertJsonPath('order.unit', 'TOMAN')->assertJsonPath('order.payable_total', 200)->assertJsonPath('order.invoice.totals.rounding_adjustment', 0);
    $id = $response->json('order.id');
    $this->postJson('https://localhost/api/checkout', $payload)->assertCreated()->assertJsonPath('order.id', $id);
    $this->getJson('https://localhost/api/orders/'.$id)->assertOk()->assertJsonPath('order.invoice.lines.0.line_total', 200);
    expect(DB::table('orders')->count())->toBe(1);
});

it('M02 C01 enforces actual checkout mutation CSRF and denies owner cancellation after processing', function () {
    $admin = F::rules();
    $user = User::factory()->create();
    $order = F::order($user);
    orderAs($user)->postJson('https://localhost/api/orders/'.$order->id.'/cancel')->assertStatus(419);
    orderCsrf();
    orderAs($admin)->postJson('https://localhost/api/orders/'.$order->id.'/actions', ['action' => 'processing'])->assertOk();
    orderAs($user)->postJson('https://localhost/api/orders/'.$order->id.'/cancel')->assertForbidden();
    $this->postJson('https://localhost/api/orders/'.$order->id.'/actions', ['action' => 'paid'])->assertForbidden();
    orderAs($admin)->postJson('https://localhost/api/orders/'.$order->id.'/actions', ['action' => 'cancel', 'reason' => 'Reviewed unshipped COD'])->assertOk()->assertJsonPath('order.status', 'cancelled');
});

it('C03 H09 stores sanitized private card receipt authorizes read and requires admin verification without exposing storage path', function () {
    $admin = F::rules();
    $user = User::factory()->create();
    $other = User::factory()->create();
    $order = F::order($user, 'card_to_card');
    orderCsrf();
    $url = 'https://localhost/api/orders/'.$order->id.'/receipt';
    orderAs($user)->post($url, ['file' => UploadedFile::fake()->image('receipt.jpg', 10, 10)], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('order.payment_state', 'pending_verification')->assertJsonMissingPath('order.receipt_path');
    $path = DB::table('orders')->where('id', $order->id)->value('receipt_path');
    expect(Storage::disk('local')->exists($path))->toBeTrue()->and(Storage::disk('local')->get($path))->toStartWith("\x89PNG");
    $this->get($url)->assertOk()->assertHeader('Content-Type', 'image/png');
    orderAs($other)->get($url)->assertNotFound();
    orderAs(User::factory()->create(['role' => 'shop_manager']))->get($url)->assertForbidden();
    orderAs($admin)->get($url)->assertOk();
    $this->postJson('https://localhost/api/orders/'.$order->id.'/actions', ['action' => 'paid'])->assertOk()->assertJsonPath('order.payment_state', 'paid');
    $this->get('https://localhost/media/'.basename($path))->assertNotFound();
});

it('C04 H09 rejects SVG and removes newly stored receipt if transactional journal fails', function () {
    F::rules();
    $user = User::factory()->create();
    $order = F::order($user, 'card_to_card');
    orderCsrf();
    $url = 'https://localhost/api/orders/'.$order->id.'/receipt';
    orderAs($user)->post($url, ['file' => UploadedFile::fake()->createWithContent('bad.svg', '<svg/>')], ['Accept' => 'application/json'])->assertUnprocessable();
    ActivityLog::creating(function (ActivityLog $log): void {
        if ($log->action === 'receipt') {
            throw new RuntimeException('Injected receipt audit failure');
        }
    });
    try {
        $this->post($url, ['file' => UploadedFile::fake()->image('ok.png', 10, 10)], ['Accept' => 'application/json'])->assertServerError();
    } finally {
        ActivityLog::flushEventListeners();
    }
    expect(Storage::disk('local')->allFiles('receipts'))->toBe([])->and(DB::table('orders')->where('id', $order->id)->value('payment_state'))->toBe('unpaid');
});

it('M09 H02 does not fabricate or expose an unimplemented financial CSV export to guest or customer', function () {
    $this->getJson('https://localhost/api/orders/export?format=csv')->assertNotFound();
    orderAs(User::factory()->create())->getJson('https://localhost/api/orders/export?format=csv')->assertNotFound();
});
