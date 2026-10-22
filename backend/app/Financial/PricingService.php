<?php

declare(strict_types=1);

namespace App\Financial;

use App\Models\User;
use App\Services\CatalogPublication;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Advisory quotes and locked checkout share this exact implementation. */
final class PricingService
{
    public function __construct(private readonly Rules $rules) {}

    public function quote(array $items, ?string $code = null, ?string $method = null, ?string $zone = null, ?User $user = null, bool $lock = false): array
    {
        if ($lock && DB::transactionLevel() < 1) {
            throw new \LogicException('Locked pricing requires a transaction.');
        }
        $rules = $this->rules->current($lock);
        $items = $this->normalize($items, $rules);
        $now = CarbonImmutable::now('UTC');
        $coupon = $this->coupon($code, $user, $now, $lock);
        $products = DB::table('products')->whereIn('id', array_column($items, 'product_id'))->orderBy('id')->when($lock, fn ($q) => $q->lockForUpdate())->get()->keyBy('id');
        $variants = DB::table('product_variants')->whereIn('id', array_filter(array_column($items, 'variant_id')))->orderBy('id')->when($lock, fn ($q) => $q->lockForUpdate())->get()->keyBy('id');
        $categories = DB::table('category_product')->whereIn('product_id', $products->keys())->when($lock, fn ($q) => $q->sharedLock())->get()->groupBy('product_id');
        $prepared = [];
        $eligible = Fraction::of(0);
        $weight = 0;
        $knownWeight = true;
        $perProduct = [];
        foreach ($items as $key => $input) {
            $product = $products->get($input['product_id']);
            $variant = $input['variant_id'] === null ? null : $variants->get($input['variant_id']);
            if (! $product || ! CatalogPublication::visible($product, $now) || ($input['variant_id'] !== null && (! $variant || $variant->product_id !== $product->id)) || ($product->type === 'variable' && ! $variant)) {
                $this->fail('items', 'کالا یا تنوع انتخاب‌شده در دسترس نیست.');
            }
            $source = $variant ?? $product;
            $qty = $input['quantity'];
            $perProduct[$product->id] = ($perProduct[$product->id] ?? 0) + $qty;
            if ($qty > ($source->max_quantity ?? $rules['max_per_line']) || $perProduct[$product->id] > ($product->max_quantity ?? $rules['max_order_quantity'])) {
                $this->fail('quantity', 'تعداد از سقف مجاز کالا بیشتر است.');
            }
            if ($qty > $source->stock) {
                $this->fail('stock', 'موجودی کالا کافی نیست.');
            }
            $unit = $this->unitPrice($source, $now);
            $listed = Money::multiply((int) $source->price, $qty);
            $base = Fraction::of(Money::multiply($unit, $qty));
            $categoryIds = ($categories->get($product->id) ?? collect())->pluck('category_id')->all();
            $automatic = Fraction::of(0);
            foreach ($rules['automatic'] as $rule) {
                if ($qty < $rule['min_quantity'] || ! $this->scope($rule['products'] ?? [], $rule['categories'] ?? [], $rule['exclude_products'] ?? [], $rule['exclude_categories'] ?? [], $product->id, $categoryIds) || ! $this->window($rule['starts_at'] ?? null, $rule['ends_at'] ?? null, $now)) {
                    continue;
                }
                $candidate = $rule['type'] === 'fixed' ? Fraction::of($rule['value'])->minimum($base) : $base->times(new Fraction((string) $rule['value'], '10000'));
                if ($candidate->compare($automatic) > 0) {
                    $automatic = $candidate;
                }
            }
            $afterAuto = $base->minus($automatic);
            $matches = $coupon && $this->scope($this->ids($coupon->include_products), $this->ids($coupon->include_categories), $this->ids($coupon->exclude_products), $this->ids($coupon->exclude_categories), $product->id, $categoryIds);
            if ($matches && ! $coupon->allow_stacking && $automatic->compare(Fraction::of(0)) > 0) {
                $this->fail('coupon', 'این کوپن با تخفیف خودکار قابل ترکیب نیست.');
            }
            if ($matches) {
                $eligible = $eligible->plus($afterAuto);
            }
            $grams = $source->weight_grams ?? $product->weight_grams;
            if ($grams === null) {
                $knownWeight = false;
            } else {
                $weight = Money::add($weight, Money::multiply((int) $grams, $qty));
            }
            $prepared[$key] = compact('input', 'product', 'source', 'unit', 'listed', 'automatic', 'afterAuto', 'matches');
        }
        $couponTotal = Fraction::of(0);
        if ($coupon) {
            if ($eligible->compare(Fraction::of(0)) === 0) {
                $this->fail('coupon', 'کوپن برای کالاهای این سبد قابل استفاده نیست.');
            }
            if ($eligible->compare(Fraction::of((int) $coupon->min_order_amount)) < 0) {
                $this->fail('coupon', 'حداقل مبلغ خرید برای این کوپن رعایت نشده است.');
            }
            $couponTotal = ($coupon->type === 'fixed' ? Fraction::of((int) $coupon->value) : $eligible->times(new Fraction((string) $coupon->value, '100')))->minimum($eligible);
            if ($coupon->max_discount_amount !== null) {
                $couponTotal = $couponTotal->minimum(Fraction::of((int) $coupon->max_discount_amount));
            }
        }
        // Integer allocations describe the coupon; they NEVER feed economic fractions.
        $displayCoupon = $this->displayAllocation($couponTotal->rounded(), array_map(fn (array $p): Fraction => $p['matches'] ? $p['afterAuto'] : Fraction::of(0), $prepared));
        $lines = [];
        $preTax = Fraction::of(0);
        $totals = ['subtotal' => 0, 'items_discount' => 0, 'coupon_discount' => 0, 'vat_amount' => 0, 'included_vat' => 0, 'rounding_adjustment' => 0, 'merchandise_total' => 0, 'net_total' => 0];
        foreach ($prepared as $key => $p) {
            $couponPart = $p['matches'] ? $couponTotal->times($p['afterAuto'])->dividedBy($eligible) : Fraction::of(0);
            $discounted = $p['afterAuto']->minus($couponPart);
            $rate = new Fraction((string) $rules['vat_bps'], '10000');
            if ($rules['prices_include_tax']) {
                $net = $discounted->dividedBy(Fraction::of(1)->plus($rate));
                $tax = $discounted->minus($net);
                $payable = $discounted->rounded();
                $taxAdded = 0;
            } else {
                $net = $discounted;
                $tax = $discounted->times($rate);
                $payable = $discounted->plus($tax)->rounded();
                $taxAdded = $tax->rounded();
            }
            $preTax = $preTax->plus($net);
            $sale = Fraction::of($p['listed'] - Money::multiply($p['unit'], $p['input']['quantity']));
            $parts = [$sale->rounded(), $p['automatic']->rounded(), $displayCoupon[$key]];
            $adjustment = $payable - ($p['listed'] - array_sum($parts) + $taxAdded);
            $line = [
                ...$p['input'], 'key' => $key, 'title' => $p['product']->title, 'sku' => $p['source']->sku,
                'unit_price' => $p['unit'], 'listed_subtotal' => $p['listed'],
                'sale_discount' => $parts[0], 'automatic_discount' => $parts[1], 'coupon_discount' => $parts[2],
                'tax_amount' => $tax->rounded(), 'tax_added' => $taxAdded, 'rounding_adjustment' => $adjustment,
                'net_total' => $payable - $tax->rounded(), 'line_total' => $payable,
            ];
            $lines[] = $line;
            foreach (['subtotal' => $p['listed'], 'items_discount' => $parts[0] + $parts[1], 'coupon_discount' => $parts[2], 'vat_amount' => $taxAdded, 'included_vat' => $rules['prices_include_tax'] ? $tax->rounded() : 0, 'merchandise_total' => $payable, 'net_total' => $line['net_total']] as $field => $amount) {
                $totals[$field] = Money::add($totals[$field], $amount);
            }
            $totals['rounding_adjustment'] += $adjustment;
        }
        $shipping = $method === null ? null : $this->shipping($rules, $method, $zone, $preTax, $knownWeight ? $weight : null);

        return ['unit' => 'TOMAN', 'calculation_version' => 'exact-line-v1', 'lines' => $lines, 'totals' => [...$totals, 'shipping_fee' => $shipping['amount'] ?? null, 'payable_total' => $shipping === null ? null : Money::add($totals['merchandise_total'], $shipping['amount'])], 'shipping' => $shipping, 'coupon_id' => $coupon?->id, 'coupon_code' => $coupon?->code, 'expires_in_minutes' => $rules['expiry_minutes'], 'vat_bps' => $rules['vat_bps'], 'prices_include_tax' => $rules['prices_include_tax'], 'checkout_ready' => $shipping !== null && $lines !== []];
    }

    /** Catalog and checkout share active regular/sale/flash price selection. */
    public function unitPrice(object $source, ?CarbonImmutable $now = null): int
    {
        $now ??= CarbonImmutable::now('UTC');
        $unit = Money::integer((int) $source->price);
        foreach ([['sale_price', 'sale_starts_at', 'sale_ends_at'], ['flash_price', 'flash_starts_at', 'flash_ends_at']] as [$price, $start, $end]) {
            if ($source->$price !== null && ($price !== 'flash_price' || ($source->$start !== null && $source->$end !== null)) && $this->window($source->$start, $source->$end, $now)) {
                $unit = min($unit, Money::integer((int) $source->$price));
            }
        }

        return $unit;
    }

    public function normalize(array $items, array $rules): array
    {
        if (count($items) > 2 * $rules['max_lines']) {
            $this->fail('items', 'تعداد خطوط سبد بیشتر از سقف مجاز است.');
        }
        $result = [];
        $total = 0;
        foreach ($items as $item) {
            if (! is_array($item) || ! is_int($item['product_id'] ?? null) || $item['product_id'] < 1 || $item['product_id'] > Money::MAX || (isset($item['variant_id']) && (! is_int($item['variant_id']) || $item['variant_id'] < 1 || $item['variant_id'] > Money::MAX)) || ! is_int($item['quantity'] ?? null) || $item['quantity'] < 1 || $item['quantity'] > $rules['max_per_line']) {
                $this->fail('quantity', 'شناسه و تعداد کالا باید عدد صحیح مثبت در محدوده مجاز باشد.');
            }
            $key = sprintf('%020d:%020d', $item['product_id'], $item['variant_id'] ?? 0);
            $quantity = ($result[$key]['quantity'] ?? 0) + $item['quantity'];
            if ($quantity > $rules['max_per_line']) {
                $this->fail('quantity', 'تعداد تکراری کالا از سقف مجاز بیشتر است.');
            }
            $result[$key] = ['product_id' => $item['product_id'], 'variant_id' => $item['variant_id'] ?? null, 'quantity' => $quantity];
            $total += $item['quantity'];
        }
        if ($total > $rules['max_order_quantity']) {
            $this->fail('quantity', 'تعداد کل سفارش از سقف مجاز بیشتر است.');
        }
        if (count($result) > $rules['max_lines']) {
            $this->fail('items', 'تعداد خطوط سبد بیشتر از سقف مجاز است.');
        }
        ksort($result);

        return $result;
    }

    private function coupon(?string $code, ?User $user, CarbonImmutable $now, bool $lock): ?object
    {
        if ($code === null || trim($code) === '') {
            return null;
        }
        $code = mb_strtoupper(trim($code), 'UTF-8');
        if (! preg_match('/^[\pL\pN_-]{1,100}$/uD', $code)) {
            $this->fail('coupon', 'کد تخفیف نامعتبر است.');
        }
        $row = DB::table('coupons')->where('code', $code)->when($lock, fn ($q) => $q->lockForUpdate())->first();
        if (! $row || ! $row->is_active) {
            $this->fail('coupon', 'کد تخفیف معتبر نیست.');
        }
        if (! $this->window($row->starts_at, $row->expires_at, $now)) {
            $this->fail('coupon', 'زمان استفاده از کوپن معتبر نیست یا منقضی شده است.');
        }
        if ($row->usage_limit !== null && $row->used_count >= $row->usage_limit) {
            $this->fail('coupon', 'سقف استفاده از کوپن تکمیل شده است.');
        }
        if ($row->per_user_limit !== null) {
            if (! $user) {
                $this->fail('coupon', 'برای استفاده از این کوپن وارد حساب شوید.');
            }
            if (DB::table('coupon_usages')->where('coupon_id', $row->id)->where('user_id', $user->id)->whereIn('state', ['reserved', 'redeemed'])->when($lock, fn ($q) => $q->lockForUpdate())->count() >= $row->per_user_limit) {
                $this->fail('coupon', 'سقف استفاده شما از این کوپن تکمیل شده است.');
            }
        }

        return $row;
    }

    private function shipping(array $rules, string $method, ?string $zone, Fraction $net, ?int $weight): array
    {
        foreach ($rules['shipping'] as $row) {
            if ($row['method'] !== $method || $row['zone'] !== $zone) {
                continue;
            }
            $fee = $row['type'] === 'pickup' ? 0 : ($row['amount'] ?? null);
            if (in_array($row['type'], ['weight', 'price'], true)) {
                if ($row['type'] === 'weight' && $weight === null) {
                    $this->fail('shipping', 'وزن معتبر کالا برای این روش ثبت نشده است.');
                }
                $measure = $row['type'] === 'weight' ? Fraction::of($weight) : $net;
                $fee = null;
                foreach ($row['tiers'] as $tier) {
                    if ($measure->compare(Fraction::of($tier['up_to'])) <= 0) {
                        $fee = $tier['amount'];
                        break;
                    }
                }
            }
            if ($fee === null) {
                $this->fail('shipping', 'تعرفه‌ای برای این وزن یا مبلغ ثبت نشده است.');
            }
            if (isset($row['free_over']) && $net->compare(Fraction::of($row['free_over'])) >= 0) {
                $fee = 0;
            }

            return ['method' => $method, 'zone' => $zone, 'type' => $row['type'], 'amount' => $fee, 'cod_allowed' => $row['cod']];
        }
        $this->fail('shipping', 'روش ارسال در این منطقه فعال نیست.');
    }

    private function window(?string $start, ?string $end, CarbonImmutable $now): bool
    {
        return ($start === null || CarbonImmutable::parse($start, 'UTC')->lessThanOrEqualTo($now)) && ($end === null || CarbonImmutable::parse($end, 'UTC')->greaterThan($now));
    }

    private function ids(?string $json): array
    {
        return $json === null ? [] : json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    }

    private function scope(array $products, array $categories, array $excludedProducts, array $excludedCategories, int $product, array $memberships): bool
    {
        return ! in_array($product, $excludedProducts, true) && ! array_intersect($memberships, $excludedCategories) && (($products === [] && $categories === []) || in_array($product, $products, true) || array_intersect($memberships, $categories));
    }

    private function displayAllocation(int $amount, array $parts): array
    {
        $common = '1';
        foreach ($parts as $part) {
            $common = bcmul($common, $part->d, 0);
        }
        $weights = array_map(fn (Fraction $part): string => bcmul($part->n, bcdiv($common, $part->d, 0), 0), $parts);

        return Money::allocate($amount, $weights);
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
