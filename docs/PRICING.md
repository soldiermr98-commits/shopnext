# L2 financial contract — approved decisions and implementation checkpoints

L2 authorized by owner after l1-complete. **IN PROGRESS; not l2-complete.**
Only executed green CI is evidence. No gateway/SMS/Filament business resources.

## Owner-approved decisions

- Canonical integer Toman, JS-safe maximum9,007,199,254,740,991; never float money.
  BCMath decimal strings for intermediate products/fractions; integer DTOs.
- Half-up ONCE per final line, then sum rounded lines. Do not round discounted
  unit prices before multiplying quantity. Largest-remainder integer allocation
  for fixed coupons, deterministic ties in sorted product/variation line order.
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

## First implementation checkpoint

`App/Financial/Money`: checked unsigned JS-safe arithmetic, exact half-up rationals
and deterministic integer allocation. Named C02/H06 tests +200 seeded property cases.
Service, schema, reservation, wallet, API/UI integration, concurrency and all other
financial finding ports remain **UNVERIFIED until implemented and executed**.
Final formulas/examples and per-finding evidence will be updated as steps pass.
