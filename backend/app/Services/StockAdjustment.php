<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

/** Adjustment ledger supplements checkout reservations; stock is available stock. */
final class StockAdjustment
{
    public function adjust(User $actor, int $product, ?int $variant, mixed $amount, string $direction, string $reason, string $key): int
    {
        return $this->bulk($actor, [['product_id' => $product, 'variant_id' => $variant]], $amount, $direction, $reason, $key);
    }

    public function bulk(User $actor, array $targets, mixed $amount, string $direction, string $reason, string $key): int
    {
        Gate::forUser($actor->fresh())->authorize('viewAny', Product::class);
        $amount = CatalogInput::integer($amount, 'amount', 1, 1000000);
        $reason = trim($reason);
        if (! in_array($direction, ['increase', 'decrease'], true) || $reason === '' || mb_strlen($reason) > 200 || ! preg_match('/^[A-Za-z0-9_-]{1,64}$/D', $key)) {
            $this->fail('reason', 'جهت، دلیل الزامی و شناسه تکرار درخواست معتبر وارد کنید.');
        }
        if (count($targets) < 1 || count($targets) > 50) {
            $this->fail('targets', 'بین ۱ تا ۵۰ ردیف کالا انتخاب کنید.');
        }
        $normalized = [];
        foreach ($targets as $target) {
            if (! is_array($target) || array_diff(array_keys($target), ['product_id', 'variant_id']) !== []) {
                $this->fail('targets', 'ردیف موجودی معتبر نیست.');
            }
            $product = CatalogInput::integer($target['product_id'] ?? null, 'targets', 1);
            $variant = ($target['variant_id'] ?? null) === null ? null : CatalogInput::integer($target['variant_id'], 'targets', 1);
            $identity = $product.':'.($variant ?? 0);
            if (isset($normalized[$identity])) {
                $this->fail('targets', 'ردیف تکراری انتخاب نکنید.');
            }
            $normalized[$identity] = ['product_id' => $product, 'variant_id' => $variant];
        }
        $targets = array_values($normalized);
        usort($targets, fn (array $a, array $b): int => [$a['product_id'], $a['variant_id'] ?? 0] <=> [$b['product_id'], $b['variant_id'] ?? 0]);
        $hash = hash('sha256', json_encode([$targets, $amount, $direction, $reason], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($actor, $targets, $amount, $direction, $reason, $key, $hash): int {
            $actor = app(CatalogAccess::class)->lock($actor, Product::class);
            $existing = DB::table('stock_operations')->where('actor_id', $actor->id)->where('request_key', $key)->first();
            if ($existing !== null) {
                abort_unless(hash_equals($existing->intent_hash, $hash), 409, 'شناسه تکرار با درخواست قبلی مطابقت ندارد.');

                return (int) $existing->row_count;
            }
            // Match checkout/cancel locking order: sorted roots, then sorted variants.
            $products = Product::whereIn('id', array_column($targets, 'product_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $variants = ProductVariant::whereIn('id', array_filter(array_column($targets, 'variant_id')))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $operation = DB::table('stock_operations')->insertGetId(['actor_id' => $actor->id, 'request_key' => $key, 'intent_hash' => $hash, 'row_count' => count($targets), 'created_at' => now('UTC')]);
            foreach ($targets as $target) {
                $product = $products->get($target['product_id']);
                if ($product === null) {
                    $this->fail('targets', 'کالا حذف شده یا موجود نیست.');
                }
                Gate::forUser($actor)->authorize('adjustStock', $product);
                $variant = $target['variant_id'] === null ? null : $variants->get($target['variant_id']);
                if (($target['variant_id'] !== null && ($variant === null || $variant->product_id !== $product->id)) || ($variant === null && $product->type !== 'simple')) {
                    $this->fail('targets', 'برای کالای متغیر، تنوع متعلق به همان کالا را انتخاب کنید.');
                }
                if ($variant !== null) {
                    Gate::forUser($actor)->authorize('adjustStock', $variant);
                }
                $record = $variant ?? $product;
                $before = (int) $record->stock;
                $delta = $direction === 'increase' ? $amount : -$amount;
                $after = $before + $delta;
                if ($after < 0 || $after > 4294967295) {
                    $this->fail('amount', 'تعدیل موجودی منفی یا خارج از محدوده ایجاد می‌کند؛ هیچ ردیفی تغییر نکرد.');
                }
                DB::table($record->getTable())->where('id', $record->id)->update(['stock' => $after, 'updated_at' => now('UTC')]);
                $entry = DB::table('stock_adjustments')->insertGetId(['operation_id' => $operation, 'actor_id' => $actor->id, 'product_id' => $product->id, 'variant_id' => $variant?->id, 'delta' => $delta, 'before_stock' => $before, 'after_stock' => $after, 'reason' => $reason, 'created_at' => now('UTC')]);
                (new ActivityLog)->forceFill([
                    'user_id' => $actor->id, 'user_name' => $actor->name, 'user_role' => $actor->role,
                    'action' => 'stock.adjust', 'module' => 'stock_adjustments', 'subject_id' => (string) $entry,
                    'changed_fields' => ['stock'], 'before' => ['stock' => $before], 'after' => ['stock' => $after, 'delta' => $delta, 'reason' => '[REDACTED]'], 'ip_address' => request()->ip(),
                ])->save();
            }

            return count($targets);
        }, 5);
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
