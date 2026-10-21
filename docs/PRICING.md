# L2 financial contract — approved decisions and implementation checkpoints

L2 financial code verified. Current acceptance/limits: [L2_ACCEPTANCE](L2_ACCEPTANCE.md).
`l2-complete` is published only after the final documentation commit also passes ALL7 jobs.
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
- Stock reserved at creation; default non-COD unpaid expiry30min. ALL COD is
  exempt from minute expiry; unshipped COD is flagged after configurable7days.
  A warning NEVER cancels an order; explicit authorized admin cancellation is required.
  Card-to-card remains subject to expiry until paid, including pending verification.
- Full-wallet payments ONLY, insufficient balance fails; no partial wallet/COD/card
  combinations. COD unpaid until administrator confirms collection; delivery alone
  never marks paid. Card-to-card receipt ->pending verification ->admin paid.
- Customer may cancel pending/awaiting_payment only. Admin cancels processing;
  shipped cannot cancel, only approved refund. Approved refund credits the amount
  actually paid to append-only wallet ledger once; no bank-refund claim.
- No loyalty-point formula is approved. Do not invent earning rules or double-apply
  effects when payment is repeated. No provider adapters beyond PaymentMethod.

## Pricing implementation (verified checkpoint4a76d51)

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
by this pure calculator; full-wallet orchestration is atomic in Checkout/WalletPayment.

## Historical checkpoints (superseded by current L2_ACCEPTANCE status)

Money checkpoint04cdcab: full seven-job CI success39578549164. Schema checkpoint
66b2187: full seven-job CI success39579280000. Pricing service tests in this change:
named C01/C02/H06 regressions plus80 deterministic property iterations, with existing
200 Money allocation iterations. Executed on4a76d51: CI39581254064 all seven jobs SUCCESS;173 tests/6437 assertions
on EACH of six PHP/database combinations. Exact evidence: `docs/ci/l2-pricing-verified-matrix.json`.

The subsequent checkpoints below completed transactions, lifecycle, real parallel
SQL tests, HTTP APIs and minimal storefront wiring. See L2_ACCEPTANCE for the
consolidated current status rather than interpreting historical pending notes as current.

## Wallet ledger primitives (verified checkpoint63088db)

`Ledger` computes balance as SQL SUM(delta), not users.wallet_balance. User's accessor
and therefore auth identity now read that sum. Credit/debit/refund lock the owner row;
credit locks actor and owner in ascending ID and rechecks privileged actor. Locked
balance and idempotency reads use locking/current reads, not an older InnoDB RR snapshot.
Credits reject zero/overflow and atomically append a redacted actor audit. Repeated
keys must match exact owner/delta/order/kind/reason; conflicts fail, not double-credit.
Payment debits the full persisted wallet order payable only; insufficient funds fail.
Refund credits actual recorded total_paid once, including manual COD/card payments;
zero paid/payable amounts create no zero-value ledger record. SQL append-only triggers
remain in force. The legacy users column stays an immutable opening snapshot.

These are TRANSACTIONAL PRIMITIVES, not a completed payment workflow. `payLocked` and
`refundLocked` require an enclosing caller transaction and do not change order/payment
state, release stock, redeem coupons or grant points. The forthcoming orchestrator
must atomically apply those changes and approve refunds via fresh admin permissions.
Tests inject audit/caller failures and assert rollback; they are sequential real SQL
regressions, NOT separate-connection concurrency evidence. Actual concurrent wallet
spend and full end-to-end stock/order/coupon rollback remain pending.

Wallet checkpoint63088db passed CI39582169761: all seven jobs success,180 Pest tests /
6482 assertions on EACH real PHP/database matrix. Exact evidence is recorded in
`docs/ci/l2-wallet-primitives-verified-matrix.json`. This is not a concurrent-spend proof.

## Server cart primitives / login integration (verified checkpoint8080bfe)

`CartService` stores only IDs and positive canonical quantities, never client prices.
Guest identity uses a256-bit random token with only SHA256 persisted. HTTP issuance
via cart endpoints is not implemented yet. Anonymous reads create no database rows.
Account mutation/merge locks the fresh active customer first, then carts in ID order.
Optimistic version conflicts return409 instead of overwriting a newer cart. Invalid
catalog/stock leaves stored items visible but unpriced, with explicit validation
errors; no fabricated zero money. Account reads never substitute the guest cart.

Login/register attempts an atomic merge and returns `cart_merge.status` and Persian
errors. Limit/stock conflicts roll back the entire merge without failing login, losing
lines, clamping quantities, changing versions or clearing the guest credential.
Successful merge deletes the guest only after validated account write and expires its
Secure/HttpOnly/SameSite=Strict __Host cookie. Forced password rotation defers merge;
no financial state changes until customer permissions allow it. Cart views explicitly
include `merge_conflict` and the token-authorized `pending_guest_items` for resolution.
Duplicate lines are combined before the DISTINCT line cap; raw domain input is capped
at twice that limit to accommodate two carts. Neither cart stores coupon/fee amounts.

These are domain methods plus login integration, NOT finished storefront/cart HTTP
contracts. Secure cart-cookie issuance, FormRequests, cart/quote routes, retry endpoint,
UI wiring, checkout/order orchestration and actual parallel merge tests are pending.

Cart first CI39583138981 failed HTTP conflict regression: the JSON test request did
not send its cookie (`MakesHttpRequests::prepareCookiesForJsonRequest` requires
withCredentials). The actual domain preserve-both tests passed. Fix the browser
fixture with withCredentials, WITHOUT relaxing cookie encryption or the conflict
assertion. Full rerun after this fix is required before continuing another concern.

Fixed cart checkpoint8080bfe passed CI39583400561: all seven jobs success,187 tests /
6525 assertions per EACH PHP/database combination. Evidence recorded in
`docs/ci/l2-cart-primitives-verified-matrix.json`. No tests were disabled or assertions
weakened; request-cookie fixture corrected using the actual locked Laravel source.

## Cart/quote HTTP contracts (verified checkpoint03238d6)

Same-origin cookie/session/real-CSRF routes:
- GET `/api/cart`: account or token-authorized guest snapshot. `pricing=null` and
  explicit errors for stale/invalid catalog; no local or fake zero-price fallback.
- PUT `/api/cart`: JSON `{items:[{product_id,variant_id?,quantity}],version}`.
  Strict JSON integer quantities/IDs; optimistic version conflict409. Client prices,
  payable/discount fields never affect persisted cart or pricing. A new guest cart
  sets a Secure/HttpOnly/host-only/SameSite=Strict cookie; no raw token in JSON.
- POST `/api/quote`: same items plus optional coupon, shipping_method, zone. Advisory
  only; a supplied zone is NOT authorization for final checkout/address ownership.
- POST `/api/cart/merge`: authenticated customer retry; conflict409 preserves both,
  success expires guest cookie. Extra owner IDs never select another account cart.

Named throttling bounds routes by IP and identity, no bearer fallback. Real-CSRF,
secure-cookie persistence/reload, fractional input rejection, throttling and foreign
owner-ID regressions added. These NEW tests still need execution; storefront wiring
and full checkout/order APIs remain unimplemented.

Cart API first CI39583987683: one throttle-boundary test expected429 on the60th
GET, but a60/min limit correctly permits60 and rejects61. The preceding unauthorized
merge request is rejected by auth before consuming the route throttle. Fix the test
to assert all60 requests succeed and the61st fails; do not change production limits.
Full matrix rerun is mandatory before further concerns.

Fixed API checkpoint03238d6 passed CI39584222988: all seven jobs SUCCESS, 192 tests /
6615 assertions per EACH of the six real PHP/database jobs. Exact evidence recorded
in `docs/ci/l2-cart-api-verified-matrix.json`. Production throttle remained unchanged.

New hardening change: encrypted configuration plaintext is bounded to30,000 UTF-8
JSON bytes before validation/storage, ensuring ciphertext fits existing TEXT. Money
fails closed on non64-bit PHP, and deploy-check reports php.integer64. Cart validation
messages are Persian. Executed hardening8178a52 passed CI39584953220: all7 jobs green, each backend
job193 tests/6619 assertions. Recorded in ci/l2-pricing-cart-wallet-hardening-verified-matrix.json.


## Owner continuation / L2c checkout change (CI pending)

Latest explicit owner decision: ALL COD exempt from30-minute unpaid expiry,
including pending COD. This supersedes the older pending-COD expiry paragraph above.
Owner selected7 days as configurable `cod_review_days`: flag unshipped COD for admin,
never automatically cancel it. Shipment/cancellation/refund end that review path.

Checkout now uses a single transaction, fresh active customer lock, owned cart/version,
owned address shared lock, PricingService locked repricing, ascending product/variant
locks, conditional nonnegative stock decrement and coupon row capacity reservation.
User+request key and canonical intent hash make retry return the SAME order even after
cart consumption; changed intent/key collision fails409. No guest cart is checked out.
Full wallet initializes payment and records paid in this same transaction; manual
methods remain unpaid. All snapshots (including signed adjustment) and actor timeline
are persisted; SQL triggers protect financial snapshots and timeline against mutation.
Tests inject paid-audit failure after stock/quota/ledger writes and require full rollback.
New code/schema/tests are UNVERIFIED until this change's full matrix executes.


Checkout d532f0e: [CI39594655416](https://github.com/soldiermr98-commits/shopnext/actions/runs/39594655416)
all seven jobs SUCCESS. New lifecycle change (not yet executed): actor-checked graph,
strict paid no-op, once-only stock/quota release, actual-paid wallet refund, append-only
journal/audit; scheduler queues bounded100-row expiry and100-row COD review, with each
row revalidated under the same locks. Unpaid cancellation releases reserved coupon,
paid cancellation/refund keeps redeemed usage. Receipt rejection leaves reservation
until retry/expiry; receipt upload/storage/API still pending. Delivered COD is unpaid
until explicit admin collection. No loyalty earning formula invented.


Lifecycle bf11063 CI39595334260 all7 jobs SUCCESS. New HTTP concern: owned checkout/
quote/options, own paginated order list/detail/minimal tracking, customer cancel,
staff transition endpoint with fresh domain authorization, private sanitized receipt
upload/read and admin approval. Receipt storage existence is checked by the lifecycle;
failed journal rolls back state and deletes newly uploaded file. Order list preloads
all timelines in one query. Policies, FormRequests, real CSRF and per-IP/user limits
are used; invoice exposes signed rounding_adjustment. New API regressions CI pending.

API first run39596127122 failed three multi-actor browser fixtures: Sanctum's
RequestGuard cached the initial test actor across requests when only the web guard
was replaced. Fixtures now forget guards before switching actors (as existing L1
browser tests already do); ownership/receipt/cancel assertions and production checks
are unchanged. Full matrix rerun required; this red is not accepted evidence.


Order/receipt API9205c58 CI39596445555 passed all7 jobs. New concurrency concern:
five REAL separate-PHP-process scenarios, distinct database connections on committed
fixtures. A coordinator holds real owner rows until every child operation has started,
then releases the gate; recorded start/end intervals must overlap, all connection IDs
and PIDs must differ, and actual database fingerprints must match. Workers call the
production Checkout/OrderLifecycle (wallet via Ledger), not a lock simulation. Wallet
race uses distinct pending-wallet order fixtures and distinct administrators to avoid
mistaking cart-version or a shared admin actor lock for a balance check. No RefreshDatabase
transaction hides fixtures. proc_open absence or a barrier failure FAILS explicitly;
there is no sequential fallback. Each matrix uploads safe proof JSON with no credentials.
These five scenarios remain UNVERIFIED until the new full CI actually executes them.


First real race run39597201549 failed last-stock with an unexpected QueryException;
four other actual concurrent scenarios passed on inspected PHP8.2/MySQL. It is NOT
green. Review found missing-key FOR UPDATE in checkout held unique-index gaps across
different buyers while each waited on the shared SKU, creating insertion-lock cycles.
Remove that unnecessary range lock: the already-held owner row serializes idempotency
keys, and lookup is the first consistent read after that owner lock in checkout's
transaction. Keep all stock/coupon/user locks and all race workers/assertions. Add
safe SQLSTATE/driver-code-only diagnostics (never SQL/messages/credentials). Rerun the
ENTIRE matrix; no claim of an observed driver number without diagnostic evidence.


Real concurrency fix3a41437 CI39597673255: ALL7 GREEN; all five separate-process
scenarios actually executed in EACH of six PHP/database jobs. Proof summaries recorded
in ci/l2-real-concurrency-verified-matrix.json; full per-worker evidence in six CI
artifacts. No simulation, skip or assertion reduction. Read-only published catalog
projection now enables real product/variant IDs in the financial frontend and shares
PricingService active price selection; catalog management remains out of scope.
This small catalog integration change's tests/CI are pending.


### Financial frontend integration gate (CI pending)
Catalog1f952f1 CI39598522400 passed all seven jobs before this concern. Existing
stepper/card/grid styling retained; financial cart/checkout/order controls now call
same-origin cookie/CSRF APIs. Browser stores IDs/quantities/version and server quote,
NOT locally computed money. Shipping remains unknown until owned saved address and
configured method are quoted; no hardcoded free-shipping threshold or tariff.
Exact server line totals, all discounts, included/added VAT and signed adjustment
are rendered directly, including zero. No multiplication/discount/tax rounding in
financial UI. A stable attempt key is reused after a network error; checkout's
transaction clears its own cart, and the browser never follows it with a cart PUT.
Pending COD/receipt orders are never labeled paid. Owner detail, paginated list,
minimal private tracking, customer cancellation and private image receipt upload
are wired. Old SQL timestamps are explicitly interpreted as UTC and rendered in
Asia/Tehran, including historical DST; date-only/invalid input is not guessed.
Stale cart responses are identity-scoped; order/tracking responses are owner-scoped.
Missing product/error/empty list does not load another product/demo orders. Fake
wallet top-ups, points conversion, refund/profile/address/review writes and invented
invoice legal IDs are disabled/removed rather than reported as persisted.
Saved-address creation/catalog management and general storefront content remain L3;
no actual tariffs or legal identity have been supplied. Financial checkout correctly
fails closed without that data. Account wallet-history view is explicitly unwired,
not a fake successful ledger read; actual balance comes from authenticated server.
Local client typecheck/build and12 HTTP/store/formatter unit tests passed; archived
reference typecheck/171 tests passed. These use fetch doubles, NOT a rendered browser
or MySQL replacement. Full frozen-lock seven-job CI for this change is pending;
real-host/browser/TLS/RTL/a11y/restore remain UNVERIFIED. Final finding table/docs/tag
are still pending, so this is NOT L2 completion.


Frontend840d2de CI39601233392: ALL7 green (explicit job status verified).
Follow-up marks deferred wallet/address/return controls disabled/labeled and adds
H10/M11 invoice-adapter regression for unpaid zero, authoritative totals and absence
of fabricated legal IDs. This follow-up's full matrix is pending; no tag yet.


## Current verified code gate
40abc65 / CI39601812389: all seven jobs SUCCESS. Exact backend counts and all five
executed real races per PHP/database job are in ci/l2-code-verified-matrix.json.
Client13 transport/store/formatter tests, archived171 tests, both typechecks and
production frontend build also executed locally. CI installs the frozen Bun lock
and verifies typechecks, tests and build independently. Browser/host is UNVERIFIED.
Final documentation-commit CI is recorded by the annotated completion tag, not
predeclared as successful here. No gateways/SMS/loyalty formula were implemented.
