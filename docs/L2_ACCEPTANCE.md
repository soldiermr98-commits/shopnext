# L2 financial acceptance — implementation, evidence and limits

2026-10-21. Owner approved L1 and continuation of L2; contracts unchanged.
The financial implementation is complete. **`l2-complete` was published at
`5120dadbb1a60cf91877165c4ac09e1dbd783b2b` after ALL7 jobs passed in
[CI39602866142](https://github.com/soldiermr98-commits/shopnext/actions/runs/39602866142).**
Each backend job passed218 tests and6789/6790 assertions; every job executed all five
real parallel scenarios. Documentation/main integration is separately authorized;
no L3 implementation or production deployment is authorized by this merge.

## Executed evidence

- Checkout d532f0e / CI39594655416: ALL7 green.
- Lifecycle bf11063 / CI39595334260: ALL7 green.
- APIs/private receipts 9205c58 / CI39596445555: ALL7 green.
- Real concurrency 3a41437 / CI39597673255: ALL7 green, 215 tests/backend job.
- Published real-SKU reads 1f952f1 / CI39598522400: ALL7 green.
- Financial frontend 840d2de / CI39601233392: ALL7 green.
- Follow-up 40abc65 / [CI39601812389](https://github.com/soldiermr98-commits/shopnext/actions/runs/39601812389):
  ALL7 green, 217 tests/backend job, 6786 or6787 assertions depending on legal
  cancel/pay race outcome. Exact counts/results: [code manifest](ci/l2-code-verified-matrix.json).
- Local client13 tests/typecheck/build and archived171 tests/typecheck executed green.
  Client fetch doubles test transport/store/formatting, NOT SQL or a rendered browser.
- Final reconciliation names financial M05/M06/M08/H11 coverage explicitly and adds
  an M09/H02 no-export privacy boundary; final CI39602866142 executed these changes successfully.

Seven jobs = frontend plus PHP8.2/8.3 × MySQL8/MariaDB10.6/11.4, real migrations,
Pint, Pest, production frontend build and real no-dev upload-package smoke.
Every concern waited for all seven green before the next. Red39597201549 exposed
an unnecessary absent-key gap lock across stock buyers; remove it after the owner
mutex, retain strict assertions, rerun the full matrix. Red API39596127122 exposed
cached Sanctum identities in multi-actor tests; reset test guards, not production
policies. Neither failure was waived or converted into a simulated success.

## Five REAL parallel scenarios, EACH SQL/PHP job

| Scenario | Committed fixture and independent workers | Required result |
|---|---|---|
| Last stock | 8 buyers, 1 unit | exactly1 order; no oversell |
| Coupon capacity | 8 buyers, quota3 | exactly3 reservations; 5 rejected |
| Wallet spend | 6 distinct pending orders, 1 owner's sufficient balance for1 | exactly1 payment; nonnegative balance |
| Paid replay | 6 calls against same order | one paid effect/event, all retries strict no-op |
| Cancel + pay | owner cancel and admin pay | one valid linearized winner, no paid-cancelled inconsistency |

Workers bootstrap independent PHP/Laravel processes/connections against the SAME
committed `_test` database. Coordinator row-lock gate releases after operations have
started; assertions check different PIDs/connection IDs, same DB fingerprint and
overlapping operation intervals. Disabled proc_open, timeout, unexpected SQL error,
wrong database or missing evidence fails, never skips or runs sequential fallback.
Per-worker proof JSON is published in six run artifacts (7day retention); committed
[observed summaries](ci/l2-real-concurrency-verified-matrix.json) survive retention.
Assertions differ by1 for the valid alternative cancel/pay winner, not by missing tests.

## Every financial finding: named executable coverage and precise status

Names below are searchable Pest/Node titles, not a claim that every broader L2+
feature in the legacy audit was authorized here. **PASS(financial)** means executed
scope at the code gate; the final reconciliation also passed before tagging.

| Finding | Named regression / file | Status and boundary |
|---|---|---|
| C01 | `only owner can cancel early...`; `financial settings enforce roles...`; `rejects guests foreign orders...` in OrderLifecycleTest/PricingServiceTest/OrderApiTest | PASS financial owner, active/fresh role and approval gates. All-role L1 matrix retained. |
| C02 | `ignores every client monetary field...`; `rejects fractional negative overflow...`; `checkout reserves stock quota...` in PricingServiceTest/FinancialMoneyTest/CheckoutTransactionTest | PASS integer Toman/quantity/variant/caps, locked server repricing, snapshots. |
| C03 | `wallet checkout fully pays once...`; `refunds actual paid COD or card...`; REAL wallet/paid races | PASS full-wallet atomic debit, manual unpaid/verification/paid/refunded, once-only actual-paid wallet refund. Gateway callbacks NOT IMPLEMENTED/NOT authorized. |
| C04 | `rolls back order items stock quota ledger timeline and cart...`; `transition failure rolls back...`; REAL stock/cancel-pay races | PASS transactional failure/parallel invariants. Host crash/backup restore UNVERIFIED. |
| H02 | `rejects guests foreign orders tracking enumeration...`; receipt-read/CSV-denial tests in OrderApiTest; `stale in-flight cart response...` Node test | PASS private owner list/detail/minimal tracking/receipt; no fake empty-list purchases. |
| H06 | `preserves exact fixed coupon allocation...`; `returns explicit signed rounding reconciliation...`; `validates coupon dates scopes...`; REAL quota race | PASS scopes/exclusions/min/cap/windows/stacking, exact allocations/VAT/shipping, unpaid reservations and paid-retention policy. |
| H07 | `COD shipment delivery and repeated paid stay separate...`; `scheduled expiry releases unpaid...`; REAL paid/cancel-pay races | PASS allowed graph, fresh actor journal, idempotent effects; ALL COD minute-expiry exemption and warning-only7days. |
| H08 | `checkout reserves...immutable...snapshots`; FinancialSchemaTest + existing schema SQL tests | PASS financial constraints, append-only ledger/events, immutable snapshots, product/customer references. Product CRUD command partial-write port remains L3. |
| H09 | `bounds quote floods...` CartApiTest; `rejects guests...oversized pagination`; `stores sanitized private card receipt...`; `rejects SVG...` OrderApiTest | PASS financial FormRequests/CSRF/rate-limit middleware, capped pages, safe errors and raster receipts; load/TLS/browser review not claimed. |
| H10 | ServerCartTest login success/conflict/reload tests; `checkout API discards client prices...durable order`; Node transport/invoice tests | PASS server-authoritative financial UI; no seeded cart/demo order/fake payment/points/refund or durable-write claim. Deferred controls disabled/labeled. General content workflows remain L3. |
| H11 | `C04 H11 M05 REAL parallel eight buyers...`; mandatory backend.yml matrix/no-dev smoke | PASS executed CI gates with real SQL; absent tests never counted as green. |
| M01 | `exposes real published product IDs...` FinancialCatalogTest | PASS read-only public projection excludes draft/scheduled; management/publication workflow remains L3. |
| M02 | `enforces actual checkout mutation CSRF...`; guest cookie/CSRF tests; private receipt API | PASS server-side financial boundary. Real browser XSS/TLS/security acceptance UNVERIFIED. |
| M03 | `financial failures remain failures...`; stale identity Node test; real catalog/owner API tests | PASS no fallback product/order/identity in financial flows. General content prototypes outside this scope. |
| M05 | five REAL concurrent tests; batched order-page event query; bounded cron and catalog projections | PASS financial races/query boundaries. Broader lazy-route/full-image/browser load optimization UNVERIFIED/deferred. |
| M06 | `C02 H06 H10 M06 checkout API...` explicit `order.unit=TOMAN`; invoice formatter tests | PASS financial integer-Toman projection; no financial JSON-LD/payment-provider claims introduced. Domain/SEO/crawler acceptance deferred. |
| M07 | Node `financial timestamps use explicit Tehran midnight, historical DST and Persian leap date...` | PASS scoped UTC SQL/offset normalization, Tehran rendering, midnight/DST/leap/invalid/date-only cases. The 4,018 historical legacy converter cases are NOT claimed ported to Laravel or this formatter. |
| M08 | `H06 M08 quotes lowest active price and owns variant stock weight price...`; immutable checkout snapshot tests | PASS financial variant ownership/stock/prices/snapshots. Full product/attribute CRUD and variant deletion workflow deferred. |
| M09 | `M09 H02 does not fabricate or expose an unimplemented financial CSV export...` | PASS absent-export privacy boundary; CSV generation/escaping/PII authorization NOT IMPLEMENTED and must be tested before future enablement. |
| M11 | Node `H10 M11 immutable invoice adapter preserves zero paid/discount values...` | PASS financial truth/zero/actual-paid/signed adjustment; no invented tax IDs or official-invoice claims. Legal/trust/review content owner sign-off UNVERIFIED/deferred. |

H01/H03/H04/H05/M04/M10 retain their L1/current documented boundaries; SMS/OTP,
theme publishing and host acceptance are not silently added to L2. No gateway/SMS,
loyalty earning/conversion formula, or Filament business resource was implemented.

## Operating contract / intentional fail-closed states

- Real configured shipping tariffs and owned saved addresses are prerequisites.
  No tariff/zone/weight means error, never invented free shipping. Saved-address
  creation and catalog/financial-settings management UIs are not counterfeit APIs.
- Unpaid capacity counts immediately. Cancellation/expiry releases once; a paid
  refund retains redeemed coupon usage. Wallet refunds are NOT bank reversals.
- All COD is exempt from minute expiry. Configurable default7day unshipped warning
  never releases stock/coupon; authorized explicit cancellation is required.
  Card receipts remain expirable until actually approved paid. Default30min expiry.
- Minutely cron runs bounded database work, no persistent worker/Redis/Supervisor.
  Cron host execution/hard timeout, browser RTL/a11y, TLS, backup/restore and production
  data import remain UNVERIFIED. No deployment/launch-readiness claim follows this tag.
- Customer account wallet history is explicitly unwired; balance is authoritative
  server ledger data. No online top-up, mixed wallet payment, or invented points.

Pricing formulas and signed worked examples: PRICING.md. Transaction/payment
sequence diagrams: ARCHITECTURE.md. Tables/triggers/UTC: DATABASE.md. After the final
CI/tag, STOP and await L3 approval.
