# L2 financial contract — approved decisions and implementation checkpoints

L2 authorized by owner after l1-complete. **IN PROGRESS; not l2-complete.**
Only executed green CI is evidence. No gateway/SMS/Filament business resources.

## Owner-approved decisions

- Canonical integer Toman, JS-safe maximum9,007,199,254,740,991; never float money.
  BCMath decimal strings for intermediate products/fractions; integer DTOs.
- Half-up ONCE per final line, then sum rounded lines. Do not round discounted
  unit prices before multiplying quantity. Economic fixed-coupon allocation stays
  EXACT RATIONAL through VAT and final payable. Largest-remainder integer allocation
  is DISPLAY ONLY, deterministic ties in sorted product/variation line order. An
  explicit signed integer `rounding_adjustment` reconciles displayed components.
- Best valid regular/sale/flash price; then automatic discount and coupon according
  to explicit stacking permission. Default VAT0/off; rates as integer basis points
  (10000=100%). VAT after discounts; shipping untaxed. Free-shipping threshold on
  discounted merchandise before VAT/wallet. Details/examples follow with service.
- Methods/zones lacking valid tariffs are disabled, not silently free. Integer
  grams; checkout derives zone from an owned address. Configurable initial limits:
  99 units/line,100 distinct lines,1000 units/order. No invented real tariff table.
- One coupon/order, exclusion wins, minimum on eligible merchandise; no automatic
  discount stacking unless allowed. Pending usage reserves capacity atomically;
  unpaid cancellation/expiry releases it; paid usage is retained after refund.
- Login succeeds on cart-merge limit conflict: reject the ENTIRE merge, preserve
  both carts, report explicit conflict; checkout uses only a valid account cart.
- Stock reserved at creation; default unpaid expiry30min. COD pending/unpaid expires
  until admin/super_admin accepts ->processing; then excluded from unpaid expiry.
  Card-to-card remains subject to expiry until paid, including pending verification.
- Full-wallet payments ONLY, insufficient balance fails; no partial wallet/COD/card
  combinations. COD unpaid until administrator confirms collection; delivery alone
  never marks paid. Card-to-card receipt ->pending verification ->admin paid.
- Customer may cancel pending/awaiting_payment only. Admin cancels processing;
  shipped cannot cancel, only approved refund. Approved refund credits the amount
  actually paid to append-only wallet ledger once; no bank-refund claim.
- No loyalty-point formula is approved. Do not invent earning rules or double-apply
  effects when payment is repeated. No provider adapters beyond PaymentMethod.

## Pricing implementation (CI pending for this change)

`Money` checks unsigned JS-safe integer arithmetic. `Fraction` performs reduced
nonnegative rational operations using BCMath strings (no float conversions).
`Rules` validates an encrypted `_financial_rules` setting independently from secret
configuration slots. Only active admin/super_admin without forced password rotation
can replace it; recheck the actor under lock and atomically write a redacted audit.
There is NO financial-settings API/Filament business resource in this checkpoint.
Default methods/zones are empty; fixtures are NOT real shipping tariffs.

`PricingService::quote` is the shared calculator; client monetary fields are discarded.
Only IDs/quantities and server-resolved coupon/method/zone affect pricing. Advisory
quotes don't lock; locked checkout mode requires an enclosing transaction. Lock order
inside pricing: settings shared lock, coupon exclusive lock, products by ascending ID,
variants by ascending ID. Later orchestration must acquire user/cart/order locks before
pricing and follow the same order for lifecycle mutations. Neither quote mode reserves
stock/coupon capacity or debits a wallet. Those services and integration are pending.

### Formulas (all intermediate expressions exact)

For each canonical merged `(product_id, variant_id)` line with quantity q:

- R = regular price × q; B = minimum active regular/sale/flash unit price × q.
- A = best matching automatic rule discount, capped at B (rules do not stack).
  Percentage automatic values are integer BPS; fixed values apply to the whole line,
  not per unit. Minimum quantity is per canonical line. Time windows are UTC,
  inclusive start/exclusive end; flash requires both endpoints. Variants own their
  prices/stock; missing variant weight inherits parent weight. Parent max_quantity
  caps aggregate quantity across variants; variant max_quantity caps its own line.
- E = sum(B−A) over coupon-eligible lines, after product/category exclusions.
  Category matching uses direct memberships, not implicit descendant inheritance.
  Legacy discount_percent is display metadata, NOT another economic discount.
- D = min(E, coupon cap if present, fixed value OR E × whole-percent value/100).
  Each eligible line's economic coupon C = D × (B−A)/E; no integer allocation here.
  Reject no eligible positive amount, expired/future/exhausted coupon, eligible
  minimum violation, disallowed automatic stacking or per-user limit violation.
- G = B−A−C. Exclusive-tax: T = G × vat_bps/10000; final = half_up(G+T).
  Inclusive-tax: N = G/(1+vat_bps/10000), T = G−N; final = half_up(G).
- Merchandise = sum(final). Shipping thresholds/price tiers use exact pre-VAT net
  merchandise after ALL discounts, never rounded thresholds. Weight tiers use grams.
  Shipping has no VAT. Payable = Merchandise + configured shipping fee.

### Display, not economics

Show sale R−B, automatic half_up(A), tax half_up(T). Display the coupon by allocating
half_up(D) using largest remainders on exact eligible (B−A) weights. Allocations must
never be used to recompute G, VAT or final. For each line:

`rounding_adjustment = final − (R − sale − automatic − displayed_coupon + added_tax)`

`added_tax` is zero for inclusive prices, displayed tax otherwise. Sum adjustments
as signed integers; all final monetary totals are nonnegative bounded integer Toman.
Displayed net = final − displayed tax. A displayed component can exceed its fractional
source by rounding; it is not permission to clip or alter economic discounts.

**Owner's counterexample:** two1-Toman lines, automatic50% each, stackable fixed
coupon1 Toman: A=1/2 each, E=1, C=1/2 each, final=0 each, payable=0 with configured
free pickup. Display automatic=1 each; coupon=1 on the first line,0 on the second.
Adjustments +1,0 explicitly reconcile the display; economics never becomes1 Toman.

**Positive/negative adjustment:** price3, automatic25%, exclusive100% VAT gives
G=9/4, tax=9/4, final=5; displayed discount1, tax2, adjustment+1. Price1 with same
25% discount and80% VAT gives G=3/4, tax=3/5, final=1; displayed discount0, tax1,
adjustment−1. No shipping VAT in either case.

No selected shipping method produces nullable shipping/payable and `checkout_ready=false`,
NOT a fabricated zero shipping fee. A selected but unavailable method/zone fails closed.
Checkout MUST derive zone from the authenticated owner's saved address; quote inputs
alone must never authorize an address or final order. Wallet deductions are not applied
by this pure calculator; full-wallet orchestration remains pending.

## Evidence / remaining gate

Money checkpoint04cdcab: full seven-job CI success39578549164. Schema checkpoint
66b2187: full seven-job CI success39579280000. Pricing service tests in this change:
named C01/C02/H06 regressions plus80 deterministic property iterations, with existing
200 Money allocation iterations. Execution evidence for the new change is pending.

Order transactions, stock/coupon reservation concurrency, cart/login merge, wallet,
manual payment state machine, expiry, owner-only APIs and storefront wiring remain
**NOT IMPLEMENTED / UNVERIFIED**. No `l2-complete` tag until the whole gate passes.
