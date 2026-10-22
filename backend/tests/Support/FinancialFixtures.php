<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Financial\CartService;
use App\Financial\Checkout;
use App\Financial\Rules;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class FinancialFixtures
{
    public static function rules(array $data = []): User
    {
        $admin = User::factory()->create(['role' => 'admin']);
        app(Rules::class)->replace($admin, array_replace(['shipping' => [['method' => 'post', 'zone' => 'z1', 'type' => 'flat', 'amount' => 0, 'cod' => true]]], $data));

        return $admin;
    }

    public static function product(array $data = []): int
    {
        $key = bin2hex(random_bytes(12));

        return DB::table('products')->insertGetId(array_replace(['title' => 'کالای آزمون', 'sku' => $key, 'slug' => $key, 'price' => 100, 'stock' => 1000, 'status' => 'published'], $data));
    }

    public static function address(User $user): int
    {
        return DB::table('addresses')->insertGetId(['user_id' => $user->id, 'title' => 'منزل', 'recipient_name' => $user->name, 'recipient_phone' => $user->phone, 'province' => 'استان', 'city' => 'شهر', 'postal_code' => '1234567890', 'street_address' => 'خیابان آزمون', 'zone_code' => 'z1']);
    }

    public static function order(User $user, string $payment = 'cod', ?int $product = null, ?string $coupon = null): object
    {
        $cart = app(CartService::class)->view($user, null);
        app(CartService::class)->replace($user, null, [['product_id' => $product ?? self::product(), 'quantity' => 1]], $cart['version']);

        return app(Checkout::class)->create($user, $cart['version'] + 1, self::address($user), 'post', $payment, $coupon, bin2hex(random_bytes(16)));
    }
}
