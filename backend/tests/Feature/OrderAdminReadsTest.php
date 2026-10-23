<?php

declare(strict_types=1);

use App\Filament\Pages\OrdersEditor;
use App\Models\User;
use App\Services\OrderAdminReads;
use App\Support\Persian;
use Filament\Facades\Filament;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Livewire\Livewire;
use Tests\Support\FinancialFixtures as F;

uses(RefreshDatabase::class);

beforeEach(function () {
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    Filament::bootCurrentPanel();
});

it('L3b orders page gates six roles and independently reauthorizes each stale read action', function (string $role, bool $allowed) {
    F::rules();
    $customer = User::factory()->create();
    $order = F::order($customer);
    $actor = User::factory()->create(['role' => $role]);
    $this->actingAs($actor, 'web');
    expect(OrdersEditor::canAccess())->toBe($allowed);
    if ($allowed) {
        $this->get('/admin/orders')->assertOk();
        Livewire::test(OrdersEditor::class)->call('select', $order->id)->assertSee('تعدیل گردکردن')->call('closeDetail')->assertHasNoErrors();
    } else {
        $this->get('/admin/orders')->assertForbidden();
        Livewire::test(OrdersEditor::class)->assertForbidden();
    }
    $staff = User::factory()->create(['role' => 'admin']);
    foreach (['applyFilters' => [], 'select' => [$order->id], 'closeDetail' => []] as $action => $args) {
        $this->actingAs($staff, 'web');
        $page = Livewire::test(OrdersEditor::class);
        DB::table('users')->where('id', $staff->id)->update(['role' => $allowed ? 'customer' : $role]);
        $page->call($action, ...$args)->assertForbidden();
        DB::table('users')->where('id', $staff->id)->update(['role' => 'admin']);
    }
})->with([['super_admin', true], ['admin', true], ['shop_manager', true], ['content_editor', false], ['support', true], ['customer', false]]);

it('L3b order detail keeps immutable item prices masks support PII and never serializes private paths or unknown snapshot keys', function () {
    F::rules();
    $customer = User::factory()->create();
    $product = F::product(['title' => 'عنوان زمان خرید', 'price' => 123]);
    $order = F::order($customer, 'cod', $product);
    $secret = bin2hex(random_bytes(24));
    DB::table('orders')->where('id', $order->id)->update(['receipt_path' => 'receipts/'.$secret.'.png']);
    $item = DB::table('order_items')->where('order_id', $order->id)->first();
    $snapshot = json_decode($item->snapshot, true);
    $snapshot['private_token'] = $secret;
    expect(fn () => DB::table('order_items')->where('id', $item->id)->update(['snapshot' => json_encode($snapshot)]))->toThrow(QueryException::class);
    // Seed a separate malformed historical snapshot at INSERT; never bypass the immutable-update trigger.
    $seed = (array) $item;
    unset($seed['id']);
    $seed['snapshot'] = json_encode($snapshot);
    DB::table('order_items')->insert($seed);
    DB::table('products')->where('id', $product)->update(['title' => 'عنوان جدید', 'price' => 999]);
    $support = User::factory()->create(['role' => 'support']);
    $this->actingAs($support, 'web');
    Livewire::test(OrdersEditor::class)->call('select', $order->id)->assertSee('عنوان زمان خرید')->assertDontSee('عنوان جدید')->assertDontSee($secret)->assertDontSee($customer->phone)->assertDontSee(Persian::digits($customer->phone))->assertDontSee('خیابان آزمون');
    $detail = app(OrderAdminReads::class)->detail($support, $order->id);
    expect($detail['items']->first()->unit_price)->toBe(123);
    expect($detail['address'])->toHaveKey('masked');
    expect(json_encode($detail))->not->toContain($secret, $customer->phone, 'receipt_path');
    $admin = User::factory()->create(['role' => 'admin']);
    expect(app(OrderAdminReads::class)->detail($admin, $order->id)['address']['street_address'])->toBe('خیابان آزمون');
});

it('L3b five thousand order list stays at three queries and detail stays at six with independent pagination', function () {
    $actor = User::factory()->create(['role' => 'admin']);
    $customer = User::factory()->create();
    $rows = [];
    for ($i = 1; $i <= 5001; $i++) {
        $rows[] = ['user_id' => $customer->id, 'order_number' => 'BIG-'.$i, 'tracking_code' => str_pad((string) $i, 48, '0', STR_PAD_LEFT), 'customer_name' => 'مشتری آزمون', 'customer_phone' => $customer->phone, 'shipping_address' => '{}', 'created_at' => '2026-10-23 00:00:00'];
        if (count($rows) === 500 || $i === 5001) {
            DB::table('orders')->insert($rows);
            $rows = [];
        }
    }
    $lastId = DB::table('orders')->max('id');
    DB::table('order_items')->insert(['order_id' => $lastId, 'product_id' => F::product(), 'title' => 'قلم ثابت', 'sku' => 'BIG-ITEM', 'quantity' => 1, 'unit_price' => 100, 'line_total' => 100, 'snapshot' => '{}']);
    DB::table('order_events')->insert(['order_id' => $lastId, 'actor_user_id' => $actor->id, 'actor_name' => $actor->name, 'actor_role' => 'admin', 'action' => 'created', 'created_at' => now('UTC')]);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $page = app(OrderAdminReads::class)->listing($actor, []);
    $queries = DB::getQueryLog();
    DB::disableQueryLog();
    expect($page->total())->toBe(5001);
    expect($page->count())->toBe(30);
    expect($queries)->toHaveCount(3);
    DB::enableQueryLog();
    DB::flushQueryLog();
    app(OrderAdminReads::class)->detail($actor, $page->first()->id);
    $queries = DB::getQueryLog();
    DB::disableQueryLog();
    expect($queries)->toHaveCount(6);
});

it('L3b order list filters status payment shipping UTC date and all four searchable identities without exposing snapshots', function () {
    $admin = F::rules();
    $customer = User::factory()->create();
    $order = F::order($customer);
    $service = app(OrderAdminReads::class);
    foreach ([$order->order_number, $customer->phone, $customer->name, $order->tracking_code] as $search) {
        expect($service->listing($admin, ['search' => $search])->total())->toBe(1);
    }
    expect($service->listing($admin, ['status' => 'pending', 'payment_state' => 'unpaid', 'payment_method' => 'cod', 'shipping_method_id' => 'post', 'from' => now('UTC')->subDay()->format('Y-m-d H:i:s'), 'until' => now('UTC')->addDay()->format('Y-m-d H:i:s')])->total())->toBe(1);
    expect($service->listing($admin, ['status' => 'shipped'])->total())->toBe(0);
    $this->actingAs($admin, 'web');
    Livewire::test(OrdersEditor::class)->fillForm(['status' => 'shipped'])->call('applyFilters')->assertHasNoErrors()->assertDontSee($order->order_number);
});
