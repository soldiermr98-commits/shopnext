# Replacement contract derived from legacy

> **2026-10-21 update:** GitHub Actions now provides a real PHP8.2/8.3 + MySQL8
> environment. Laravel12/Filament5 were actually Composer-resolved; skeleton and
> initial constrained schema are tested (24 Pest cases). L1 is IN PROGRESS, not
> complete. Older statements below that no Laravel app exists describe the L0
> checkpoint only. See [current CI evidence](CI_RESULTS.md).

Date: 2026-10-20. **Specification, not implemented Laravel behavior.**
L0 layout/archive exists; L1 runtime is blocked (see `backend/README.md`). L2 is
not approved. Launch remains **NO-GO**. English terms describe required behavior,
not an endorsement of prototype financial rules or fabricated UI claims.

## 1. Evidence and precedence

Sources actually inspected: `AUDIT_REPORT.md` (29 findings + Phase A addendum),
`SECURITY_FOUNDATION.md` (resource matrix), `DATABASE_LEGACY.md` (14 original
tables / 175 declared columns, historical source inventory),
`legacy/server/db/database.ts` (now also `auth_sessions`),
`legacy/server/security/{auth,settings,validation}.ts`,
`legacy/tests/security.test.ts` (171 executable cases), and the retained React
storefront/admin reference source. Old `server/`, `src/`, `tests/` line citations
refer to the pre-move layout. Use `git log --follow` to trace renamed sources.

Requirements override unsafe observed behavior. Laravel is a replacement, not an
adapter around sql.js and not a mechanical replay of every successful legacy call.
Never import old passwords/default accounts/provider settings automatically.
Historical audit statuses apply only to Node; even "resolved in Phase A" must be
independently ported and tested in Laravel. Tests of an exploit must assert rejection,
not perpetuate the exploit as expected behavior.

## 2. Scope boundaries

**L0:** archive Node/sql.js/history and React admin, separate React/Vite storefront,
reserve backend directory, document business/security/hosting contracts, self-host
runtime assets. Fonts/icons are local; original photo import is NOT complete:
23 source image URLs were replaced with an explicit local placeholder because
CDN downloads are unavailable here. See `client/assets/README.md` and inventory.

**L1 (required, NOT implemented yet):** Laravel/Pest/Pint/strict PHP foundation,
MySQL migrations/models, Sanctum cookie authentication, six-role policies,
encrypted settings DTOs, FormRequests/security perimeter/upload validation,
admin activity logging, Filament shell/cron-health widget, scheduler/database queue,
`deploy-check`, real MySQL/Pest tests. No Filament business resources yet.

**L2+ (requires owner approval):** authoritative pricing, coupons/checkout/stock
transactions, gateway/SMS adapters, financial transitions/ledger, business Filament
resources and replacement of mock account/content actions. The acceptance tests
below for these domains are specifications/backlog, NOT executed/skipped Pest tests.
Do not implement a fake payment, OTP or financially unsafe compatibility endpoint.

Compatibility: target PHP 8.3, minimum 8.2. Official framework 12.x declares ^8.2;
13.x declares ^8.3. Therefore use Laravel 12 for the requested minimum, with
Filament 5 (root packages permit ^8.2 and Illuminate 12), subject to real Composer
resolution/lock and lifecycle review. Do not claim Laravel 12 is the global latest.
Sources: official GitHub `laravel/framework` composer.json branches `12.x`, `13.x`,
`filamentphp/filament` `packages/{panels,support}/composer.json` branch `5.x`.
Set Composer platform PHP 8.2.0; actually test both 8.2/8.3 against MySQL.

## 3. Domain and data invariants

- Canonical stored money: **integer Toman**, never floats, mixed Rial/Toman or
  client-controlled authoritative totals. All money DTOs explicitly name the unit.
  Later gateway boundary converts Toman × 10 to integer Rial with overflow checks,
  validates provider currency/amount, and stores unit + immutable quoted amount.
  Tax inclusion/exclusion, rounding, shipping thresholds and coupon precedence
  are UNAPPROVED business decisions; conflicting prototype formulas are not policy.
- Normalize Iranian phone inputs (Persian/Arabic digits, approved country-code
  representation) to one unique server form; validate email/phone lengths and
  canonicalization before unique enforcement. Case-fold email/coupon/slug rules
  must be explicit and tested under the chosen collation. Blank optional emails
  become NULL, not shared empty strings. Cross-product/variant SKU namespace
  uniqueness needs an explicit design (separate-table unique indexes alone do not
  enforce a global namespace). No money/stock/quantity accepts NaN/fractions/overflow.
- Original entities: users/customers, addresses, categories, brands, products,
  variants, orders, coupons, blog posts, banners, activity logs, settings,
  transactions and returns. Users own addresses/orders/returns. Products have
  variants, brands and categories. Categories form a tree (reject cycles).
  Orders retain immutable item, customer and shipping snapshots separate from
  live relations. Normalize `order_items` and product/category membership;
  JSON can retain bounded descriptive attributes, never replace core FKs.
- InnoDB/utf8mb4, explicit timestamps UTC; render dates in Asia/Tehran/Jalali,
  Persian numerals at presentation only. No ambiguous localized date persistence.
- Require ordered migrations; FK types match; indexes cover phone/email/slugs/SKU,
  order number/tracking lookup, order customer+created_at/status, variant product,
  pivots, transaction order/authority/status, log actor/time, queue/session lookups.
  Unique coupon code, unique order number and nullable provider authority scoped
  to gateway; domain enums/checks must not silently admit arbitrary states.
- RESTRICT deleting a product referenced by order_items; RESTRICT deleting a
  customer referenced by orders. Also retain order items/financial records on
  order deletion; choose archive/soft delete over destructive finance cascades.
  Safe cascades only for truly dependent nonfinancial rows (sessions, unused
  address/pivot rows; unused product variants only after reference checks).
  Category children/product brands must use explicit RESTRICT or nullable SET NULL
  with nullable columns, never dangling IDs. Soft deletion does not replace FKs.
- Unsigned or enforced checks for nonnegative money/stock/counts; quantity > 0,
  percentages 0..100, rating 0..5, sale price <= base price where applicable.
  Cross-row financial equality is a later transaction/service invariant, not
  something falsely certified by a single CHECK. Verify server support for CHECK
  enforcement (MySQL >=8.0.16; pick/test an exact supported MariaDB version).
- Production never runs demo seeders automatically. Development seeders must fail
  closed outside local/testing. Admin provisioning is a separate guarded operation
  with environment-supplied one-time credentials and mandatory password change.
  No provider credentials or real PII in fixtures; no implicit migration of legacy DB.

## 4. Authentication, permissions and API perimeter

Use Sanctum's **stateful SPA session cookie flow**, not the legacy JWT scheme:
GET `/sanctum/csrf-cookie`, send credentials and `X-XSRF-TOKEN` on mutations,
rotate session/CSRF at login, invalidate session at logout/password change. Session
cookie HttpOnly/Secure, SameSite=Lax or Strict (explicitly choose/test same-origin
Strict deployment); XSRF-TOKEN is intentionally JS-readable, not an auth token.
No Bearer/demo/localStorage authentication fallback. The present client still uses
legacy `/api/auth/refresh`; L1 must replace transport/CSRF integration, not claim it
already works with Sanctum. Test expired sessions return guest state, not fake login.

Use database sessions (preferred for revocation), database/file cache, Laravel
password hashing with an explicit cost/password-length policy. Preserve Phase A's
minimum 14-character/72-byte bcrypt constraint unless a new hashing policy is
approved. Require old password for any authenticated change, revoke other sessions,
regenerate current session, and prevent mass assignment of role/password flags.
Force initial admin change before all privileged access. Secrets come from env;
never log env values or passwords. Unknown login/user errors must be indistinguishable.

Login/OTP limits must be bounded by normalized identity and trusted-proxy-aware IP,
shared database/file state across PHP requests. OTP send/verify remain **503** until
a real SMS service is authorized; validation and throttling still apply. No fixed
code, simulated success, unsafe debug backdoor, or provider calls in this phase.

| Existing admin resource (11 actions total) | super_admin | admin | shop_manager | content_editor | support | customer |
|---|---|---|---|---|---|---|
| Dashboard GET | allow | allow | allow | deny | deny | deny |
| Products GET/POST/PUT/DELETE | allow | allow | allow | deny | deny | deny |
| Orders GET + status PUT | allow | allow | allow | deny | deny | deny |
| Customers GET | allow | allow | allow | deny | deny | deny |
| Settings GET/PUT | allow | allow | deny | deny | deny | deny |
| Activity logs GET | allow | allow | deny | deny | deny | deny |

These are the **Phase A corrected matrix**, not the earlier permissive audit
matrix. No new privileges for content_editor/support without approval. Use Spatie
or an equivalent audited centralized implementation; model policies must cover all
models and default-deny unspecified actions. Both route middleware and server
policies apply; hidden Filament navigation is not authorization. Owner policies
for address/order detail cannot fall back to another customer's records.

Every implemented operation has bounded FormRequest rules (including query/path,
strict nested keys, anti-role-injection); authentication/authorization happens before
business validation. Expected outcomes: guest 401 JSON on protected API reads,
wrong-role 403, allowed valid operation 200 (or documented REST creation status),
validation 422; CSRF invalid/missing on stateful mutations 419. Do not mislabel 419
as successful auth testing: seed valid CSRF for the permission matrix, test missing
CSRF separately. Unknown routes 404 and no raw exceptions/SQL/secret reflection.

Security headers (CSP tested with local Vite/Filament assets, nosniff, frame protection,
referrer policy; HTTPS HSTS only on real TLS), exact CORS origins with credentials,
trusted proxy configuration, no wildcard credentialed origins. Upload FormRequests
must enforce MIME by content/size/dimensions/extensions, reject executable/polyglot
payloads/SVG unless safely sanitized; random filenames, authorized storage paths,
non-executable upload directory and no path traversal. Serve local media only:
reject foreign CDN URLs in API/media DTOs and sanitize persisted client cart assets.

Settings: encrypted casts backed by protected APP_KEY, ciphertext verified by direct
DB read. Rotation needs a backup/re-encryption plan. Public DTO allowlists safe
settings; private credentials return only `{masked, isSet}`. Accept secret updates
only as explicit `{newValue: "..."}`; omissions preserve ciphertext; reject mask
round-trips and unknown/nested credential keys. Never serialize decrypted models,
log request bodies or echo stored/new secrets in success, validation, errors or
activity logs. Redact actor changes to field names, not credential values.

## 5. Test-port plan and real baseline

Current **171 Node tests**, not Pest: invalid-auth matrix 66; resource/role matrix
67 (includes independent policy equality); auth lifecycle 8; settings secrecy 3;
perimeter/validation 9; persistence/security review 7; malformed admin JSON 11.
Preserve independent expected permission data, valid bodies/real existing fixture
IDs, and cleanup/isolation. Do not test the policy against a copy of itself.

Port behaviors, not JWT internals: Laravel sessions replace signed-expiry/refresh
replay specifics. Keep missing/forged/expired/deleted-user/revoked-session denial,
password proof/first-login gates, cookie/secrecy/limiter/validation tests. Do not
create business endpoints/resources solely to report 171 migrated tests in L1:
where endpoints are deferred, test their model policies now, mark HTTP integration
backlog explicitly, then port real route/action cases when authorized in L2.

Pest must use dedicated disposable **MySQL/MariaDB**, never production or sql.js/
SQLite, with an explicit test DB name guard. Apply migrate:fresh only there. Assert
FK/unique/check violations through direct DB writes bypassing validation; negative
stock and orphan/deletion tests; up/down migration round trips; UTF-8/Persian values,
Toman round trips and index metadata. Test least privilege, auth/CSRF/CORS, masked
settings and ciphertext, upload rules, rate limits over time, forced password changes,
no secret logs, no dev seeding in production, deploy-check failure cases and scheduler
heartbeat. MySQL/MariaDB and PHP version outputs belong with actual Pest output.

## 6. Every audit finding becomes an acceptance test

**All entries below are required tests, not claims of implementation or execution.**
L1 = foundation component only. L2 financial core is now AUTHORIZED and in progress;
other domain/resource/UI/provider scopes remain deferred. No l2-complete tag yet.

| Finding | Required regression / acceptance test | Phase |
|---|---|---|
| C01 | All 11 protected actions × invalid auth/6 roles; no default/demo elevation; disabled/deleted users and revoked sessions rejected; UI cannot promote guest. | L1 policies/auth; L2+ action ports |
| C02 | Reject zero/negative/fractional/oversized quantity; ignore client prices; resolve variant belonging to product; fail insufficient stock and integer overflow. | L1 input primitives; L2+ quote/checkout |
| C03 | COD remains unpaid until collection; wallet requires atomic debit; callback cannot pay without matching persisted authority/amount/unit + provider verify; replay is idempotent; refund tested. | L2+ |
| C04 | Inject write/commit failure: no 2xx, stock/order/log rollback; concurrent last-item orders cannot oversell; crash recovery and restore preserve confirmed records. | L1 DB rollback primitive; L2+ order/load/restore |
| H01 | OTP endpoints 503 while disabled and throttle requests; later test random hashed one-use codes, expiry/resend/attempt limits, replay and provider failure. | L1 disabled boundary; L2+ SMS |
| H02 | Guest/foreign customer cannot read order/addresses; empty own list stays empty; public tracking projects minimal fields and resists enumeration. | L1 owner policy; L2+ routes |
| H03 | GET/PUT/errors/logs contain no generated secret; omitted fields preserve; masked round-trip rejected; unknown/nested secret keys rejected; stored value is ciphertext. | L1 |
| H04 | Clean build/config contains no credentials/default password; startup/provisioning rejects missing secrets; no demo accounts in production; inherited credentials require explicit remediation, not silent reset. | L1 config/provisioning + deployment |
| H05 | Password change without/wrong old password denied; hash/cost verified; initial-change gate enforced; old sessions revoked; failed persistence preserves old usable credentials. | L1 |
| H06 | Expired/exhausted/future coupons rejected; cap/minimum/rounding/tax/shipping boundary matrix; concurrent redemption respects limit; displayed quote equals persisted total. | L2+ |
| H07 | Reject invalid enum/transition, delivered does not imply paid; retries cannot double-restock/refund; fulfillment/financial states remain separate. | L1 enum primitive; L2+ transitions |
| H08 | Direct SQL orphan/negative writes fail; unique keys collide; deleting ordered product/customer fails; product/variant partial failure rolls back; snapshots survive approved edits. | L1 schema; L2+ product command |
| H09 | Oversized/malformed/unknown body/query/path rejected safely; pagination capped; identity/IP flood throttled across requests; no raw SQL/exception disclosure. | L1 implemented routes; L2+ checkout/tracking |
| H10 | No mocked successful financial/contact/content/security action; persistence/delivery success requires durable read-back after reload; unfinished controls disabled/labeled. | L1 real password/logout; L2+ other UI |
| H11 | CI or reproducible external run fails on auth/schema regressions; run real Pest/MySQL; later gate financial/provider/recovery failures; absent tests never reported green. | L1 + L2+ |
| M01 | Draft/scheduled/unpublished products absent from public lists/detail/search until approved publish time; admin access separately authorized. | L2+ |
| M02 | Secure/HttpOnly session and readable XSRF cookie; CSRF attack denied, whitelist CORS only, origin/proxy spoof tests; local CSP compatible; browser XSS/TLS review not replaced by headers. | L1 server; browser acceptance later |
| M03 | 401/403/404/offline/500 render true states, not demo identity/wrong product/customer orders; demo data explicitly gated out of production. | L1 auth; L2+ catalog/account |
| M04 | Publish validated theme tokens atomically; cross-browser/user reload observes server version; all tokens map safely; revert restores prior version. | L2+ |
| M05 | Measure build budget, lazy routes, bounded query count/eager variants; load/concurrency tests prove no full-image blocking/lost updates. | L0 measurements; L2+ optimization |
| M06 | Configured legal domain/meta per product, canonical URLs/sitemap/robots, missing slug HTTP404 and redirects verified by crawler; no false payment/currency claims in JSON-LD. | L2+ |
| M07 | Persist UTC; explicit Asia/Tehran formatting at midnight, historical DST, leap dates, invalid/date-only input; retain 4,018 historical conversion cases as separate executable coverage when ported. | L2+ |
| M08 | Create/edit/reload all variant/attribute/brand/type/video/tag fields; reconcile stock and variant deletion atomically; stale variant data impossible. | L2+ |
| M09 | CSV cells with formulas, comma, quote, CR/LF correctly escaped/neutralized; export contains only authorized necessary PII. | L2+ |
| M10 | Clean offline-capable artifact deploy, migrate/rollback/restore, correct PHP CLI vs web, cron heartbeat/queue drain, private files/uploads, no debug/dev deps/automatic seeds. | L1 deploy tooling; deployment acceptance |
| M11 | Verified legal/trust/review settings propagate; no fabricated invoices/reviews/payment/tax-compliance promises; content owner sign-off recorded. | L2+ |
| L01 | Keyboard-only modal/focus trap/restore, accessible icon labels/inputs, announcements and Persian RTL mobile/desktop review. | L2+ |
| L02 | Archived admin never included in storefront chunk; approved routes resolve once; later split account domain views and verify unused dependency removal. | L0 archive; L2+ cleanup |
| L03 | Mobile/desktop wishlist/compare links target approved real routes or are disabled, no missing-route demo behavior. | L2+ |

## 7. Completion gate

L1 is complete only after Composer resolves a real lock, migrations and Pest execute
on real MySQL/MariaDB, Pint/type checks pass, storefront CSRF/session integration
is verified, deploy-check/scheduler/Filament health exist, and evidence distinguishes
passed vs unverified. Current state meets none of those Laravel execution gates.
Do not deploy or begin L2 based on the legacy 171 tests or this specification.


## Current L2 financial checkpoint status — partial, not acceptance

Executed evidence: CI_RESULTS.md and ci/l2-*-verified-matrix.json. Only the named
sequential SQL/domain/API regressions below are covered; no parallel-order claim.

| Finding | Current executed slice | Still required before L2 completion |
|---|---|---|
| C01 | Typed settings/admin credit permission checks; cart owner/token separation | Fresh owner/role checks for checkout/manual approval/order mutations |
| C02 | Shared quote ignores client money; strict positive integer IDs/quantities; variant/stock/caps/overflow; real cart API | Locked final checkout repricing/persisted quote equality |
| C03 | Authoritative append-only SUM balance; full-debit/actual-paid-refund primitives; replay guards | Atomic order/payment workflow, manual methods and true parallel wallet test; gateways NOT in L2 |
| C04 | Injected wallet/audit/caller failure rollback; atomic preserve-both cart merge | Complete stock/order/coupon/log rollback, last-stock concurrency; real-host recovery unverified |
| H02 | L1 owner policy only | Order list/detail/tracking routes and enumeration/foreign-owner rejection |
| H06 | Coupon validity/scope/min/cap/stack; exact rounding, VAT/shipping boundary tests | Atomic usage reservations, parallel last-capacity use, persisted checkout equality |
| H07 | L1 enum constraints only | Approved state graph, manual paid, once restock/refund and expiry/COD exception |
| H08 | Real SQL constraints/append-only/immutable opening wallet snapshot | Created order snapshots stable against catalog edits, complete reservation service |
| H09 | Cart/quote FormRequest, actual CSRF, encrypted secure cookie and exact60/61 throttle boundary | Checkout/order/tracking request/limit/error/pagination tests |
| H10 | Real cart persistence/readback and explicit login conflict; no fake cart prices | Storefront financial contracts; remaining prototype flows not commerce acceptance |
| H11 | All seven jobs executed for each green checkpoint, six real PHP/DB combinations | Real concurrent stock/coupon/wallet workers and final full L2 green gate |

M01 public catalog, M05 measured query/load budgets and unrelated legacy findings are
NOT claimed complete by published-SKU validation or pricing property loops. Browser,
TLS, RTL/a11y, host and restore acceptance remain UNVERIFIED. No SMS/gateway adapters
or Filament business resources were added or authorized by these checkpoints.
