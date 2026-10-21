<?php

declare(strict_types=1);

namespace App\Financial;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class CartService
{
    public const COOKIE = '__Host-shopnext_cart';

    public function __construct(private readonly PricingService $pricing) {}

    /** Read a consistent advisory snapshot; never invent zero prices for invalid items. */
    public function view(?User $owner, ?string $token): array
    {
        return DB::transaction(function () use ($owner, $token): array {
            if ($owner) {
                $this->customer($owner);
            }
            $cart = $owner ? DB::table('carts')->where('user_id', $owner->id)->first() : $this->guest($token);
            $items = $cart ? $this->items($cart->id) : [];
            $guest = $owner ? $this->guest($token) : null;
            $pending = $guest ? $this->items($guest->id) : [];
            try {
                $quote = $this->pricing->quote($items, user: $owner);
                $errors = [];
            } catch (ValidationException $e) {
                $quote = null;
                $errors = $e->errors();
            }

            return ['id' => $cart?->id, 'version' => $cart?->version ?? 0, 'items' => $items, 'pricing' => $quote, 'errors' => $errors, 'merge_conflict' => $pending !== [], 'pending_guest_items' => $pending];
        });
    }

    /** Replacement is optimistic, atomic, server validated; no price/coupon storage. */
    public function replace(?User $owner, ?string $token, array $items, int $expectedVersion): array
    {
        if ($expectedVersion < 0 || $expectedVersion >= 4294967295) {
            abort(409, 'نسخه سبد نامعتبر است؛ سبد را دوباره دریافت کنید.');
        }

        return DB::transaction(function () use ($owner, $token, $items, $expectedVersion): array {
            if ($owner) {
                $this->lockOwner($owner);
            }
            $cart = $owner ? DB::table('carts')->where('user_id', $owner->id)->lockForUpdate()->first() : $this->guest($token, true);
            $newToken = null;
            if (! $cart) {
                abort_if($expectedVersion !== 0, 409, 'سبد تغییر کرده است؛ دوباره دریافت کنید.');
                $newToken = $owner ? null : bin2hex(random_bytes(32));
                $id = DB::table('carts')->insertGetId(['user_id' => $owner?->id, 'token_hash' => $newToken === null ? null : hash('sha256', $newToken), 'created_at' => now('UTC'), 'updated_at' => now('UTC')]);
                $cart = DB::table('carts')->where('id', $id)->lockForUpdate()->first();
            }
            abort_if($cart->version !== $expectedVersion, 409, 'سبد تغییر کرده است؛ دوباره دریافت کنید.');
            $quote = $this->pricing->quote($items, user: $owner, lock: true);
            $this->write($cart, $quote['lines']);

            return ['id' => $cart->id, 'version' => $cart->version + 1, 'token' => $newToken];
        }, 5);
    }

    /** Login stays successful on a BUSINESS conflict. BOTH carts survive rollback. */
    public function merge(User $owner, ?string $token): array
    {
        try {
            return DB::transaction(function () use ($owner, $token): array {
                $this->lockOwner($owner);
                $guest = $this->guest($token);
                if (! $guest) {
                    return ['status' => 'none', 'errors' => []];
                }
                $account = DB::table('carts')->where('user_id', $owner->id)->first();
                // Guest writes only lock their cart; account writes always lock user first.
                $locked = DB::table('carts')->whereIn('id', array_filter([$account?->id, $guest->id]))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                // Current read after waiting: another login may already have merged/deleted it.
                if (! isset($locked[$guest->id])) {
                    return ['status' => 'none', 'errors' => []];
                }
                if (! $account) {
                    $id = DB::table('carts')->insertGetId(['user_id' => $owner->id, 'created_at' => now('UTC'), 'updated_at' => now('UTC')]);
                    $account = DB::table('carts')->where('id', $id)->lockForUpdate()->first();
                } else {
                    $account = $locked[$account->id];
                }
                $quote = $this->pricing->quote([...$this->items($account->id, true), ...$this->items($guest->id, true)], user: $owner, lock: true);
                $this->write($account, $quote['lines']);
                DB::table('carts')->where('id', $guest->id)->whereNull('user_id')->delete();

                return ['status' => 'merged', 'errors' => []];
            }, 5);
        } catch (ValidationException $e) {
            return ['status' => 'conflict', 'errors' => $e->errors()];
        }
    }

    public function items(int $cartId, bool $lock = false): array
    {
        if ($lock && DB::transactionLevel() < 1) {
            throw new \LogicException('Locked cart read requires a transaction.');
        }

        return DB::table('cart_items')->where('cart_id', $cartId)->orderBy('product_id')->orderBy('variant_key')->when($lock, fn ($q) => $q->lockForUpdate())->get()->map(fn ($row): array => ['product_id' => $row->product_id, 'variant_id' => $row->product_variant_id, 'quantity' => $row->quantity])->all();
    }

    private function guest(?string $token, bool $lock = false): ?object
    {
        if ($token === null || ! preg_match('/^[0-9a-f]{64}$/D', $token)) {
            return null;
        }

        return DB::table('carts')->whereNull('user_id')->where('token_hash', hash('sha256', $token))->when($lock, fn ($q) => $q->lockForUpdate())->first();
    }

    private function write(object $cart, array $lines): void
    {
        abort_if($cart->version >= 4294967295, 409, 'نسخه سبد نیاز به بررسی دارد.');
        DB::table('cart_items')->where('cart_id', $cart->id)->delete();
        foreach ($lines as $line) {
            DB::table('cart_items')->insert(['cart_id' => $cart->id, 'product_id' => $line['product_id'], 'product_variant_id' => $line['variant_id'], 'variant_key' => $line['variant_id'] ?? 0, 'quantity' => $line['quantity']]);
        }
        DB::table('carts')->where('id', $cart->id)->update(['version' => $cart->version + 1, 'updated_at' => now('UTC')]);
    }

    private function lockOwner(User $owner): void
    {
        $this->customer(User::whereKey($owner->id)->lockForUpdate()->firstOrFail());
    }

    private function customer(User $owner): void
    {
        abort_unless($owner->is_active && $owner->role === 'customer' && ! $owner->must_change_password, 403);
    }
}
