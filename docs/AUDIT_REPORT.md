# Phase 3 audit report

> **L0 migration notice (2026-10-20):** retained historical evidence; old paths now
> map into `legacy/` and `client/`. L0+L1 are authorized, stopping before L2; older
> Phase B wording below is superseded. Laravel L1 is NOT implemented. See
> [current replacement specification](SPEC_FROM_LEGACY.md) and [L0 evidence](L0_RESULTS.md).

> **Phase A implemented (2026-10-20).** This report preserves Phase 3 evidence;
> original "OPEN", access tables and line references below are historical, not
> current test results. The [Phase A status update](#phase-a-status-update--2026-10-20)
> and [security foundation](SECURITY_FOUNDATION.md) take precedence. Launch stays NO-GO.

Date: **2026-10-20**. Audited source: `0d39bd0` (application code still `0d436ba`).
Scope: report only, no application fixes. All findings below are **OPEN** unless
explicitly described as a passed check or UNVERIFIED. Tests of unsafe behavior
are evidence of failure, not approval of that behavior.

References: [real execution output](TEST_RESULTS.md), [masked full-history scan](SECRET_HISTORY.md),
[decision memo](DECISION_MEMO.md), [architecture](ARCHITECTURE.md), [API](API.md),
[database](DATABASE.md), [frontend](FRONTEND.md), [actual flows](FLOWS.md).

## Executive assessment

**Health: 2/10 for a production e-commerce system. NOT LAUNCH-READY.**
Installation/type-check/build work and the UI has useful structure, but unauthenticated
admin access, trusted client pricing, absent payment verification, non-durable
financial/persistence semantics and missing tests are release blockers. The score
is a qualitative architectural/security assessment, not a benchmark or CVSS score.
No amount of visual polish compensates for the demonstrated financial failures.

Top five risks: (1) admin identity bypass, (2) price/quantity/stock manipulation,
(3) fake paid wallet/COD and absent gateway verification, (4) write-loss/corruption
and non-atomic order creation, (5) exposed settings/order data and weak OTP/session
boundaries. Top five missing capabilities: verified payment lifecycle, real SMS/OTP
delivery, durable wallet/returns/account services, persistent admin content/marketing/
taxonomy operations, and validated media upload/storage/optimization.

## 1. Execution summary

Frozen Bun install: exit 0, 253 packages, 0 emitted warnings/errors. Type-check
(`npm run lint`): exit 0, 0 errors/warnings; **not an ESLint run**. Build: exit 0,
0 errors, 1 large-chunk warning; main JS 1,072.91 kB / gzip 273.40 kB, CSS 67.95 /
gzip 11.48 kB, HTML 2.31 / gzip 0.99 kB. `npm test`: exit 1, missing test script;
zero tests executed. Bun advisory query: `{}`, exit 0; zero returned advisories,
not a clean-security guarantee. Full outputs/versions/method in TEST_RESULTS.md.

Runtime harness imported unmodified apiRouter/repositories into loopback-only
Express and wrote only external synthetic fixture DBs. All admin endpoint tests
below were executed, not inferred from UI guards. No public dev server started.
History scan unshallowed clone first and covered all 4 locally reachable commits;
24 candidate snapshots across 8 paths, including placeholders/default/demo values;
only .env.example found. No confirmed live-provider key claim; validity UNVERIFIED.
See SECRET_HISTORY.md for commit+path-only tables; no raw secret values retained here.

## 2. Every admin endpoint: effective authentication and role matrix

**12 contexts per endpoint**, 132 requests total. Each row: no credentials (A),
invalid Bearer (I), expired correctly signed JWT (E), correctly signed JWT with
unknown user ID (U), invalid cookie (K), accepted demo-admin token (D), then real
JWTs for six synthetic database users. Valid mutation bodies and existing fixture
IDs were used, not 400/404 responses mistaken for authorization checks.

| Endpoint | Auth required (effective) | Server role check | A/I/E/U/K/D | customer/support/content_editor | shop_manager/admin/super_admin | Verdict |
|---|---|---|---|---|---|---|
| GET /api/admin/dashboard | NO | Present, bypassable | 200/200/200/200/200/200 | 403/403/403 | 200/200/200 | FAIL |
| GET /api/admin/products | NO | Present, bypassable | 200/200/200/200/200/200 | 403/403/403 | 200/200/200 | FAIL |
| POST /api/admin/products | NO | Present, bypassable | 200/200/200/200/200/200 | 403/403/403 | 200/200/200 | FAIL |
| PUT /api/admin/products/:id | NO | Present, bypassable | 200/200/200/200/200/200 | 403/403/403 | 200/200/200 | FAIL |
| DELETE /api/admin/products/:id | NO | Present, bypassable | 200/200/200/200/200/200 | 403/403/403 | 200/200/200 | FAIL |
| GET /api/admin/orders | NO | Present, bypassable | 200/200/200/200/200/200 | 403/403/403 | 200/200/200 | FAIL |
| PUT /api/admin/orders/:id/status | NO | Present, bypassable | 200/200/200/200/200/200 | 403/403/403 | 200/200/200 | FAIL |
| GET /api/admin/customers | NO | Present, bypassable | 200/200/200/200/200/200 | 403/403/403 | 200/200/200 | FAIL |
| GET /api/admin/settings | NO | Present, bypassable | 200/200/200/200/200/200 | 403/403/403 | 200/200/200 | FAIL |
| PUT /api/admin/settings | NO | Present, bypassable | 200/200/200/200/200/200 | 403/403/403 | 200/200/200 | FAIL |
| GET /api/admin/logs | NO | Present, bypassable | 200/200/200/200/200/200 | 403/403/403 | 200/200/200 | FAIL |

`server/api.ts:60–66` wraps all eleven routes in requireAdmin. The same three
privileged roles access every resource; there is no per-action permission matrix.
A valid customer JWT is denied, but dropping that token grants access—role checking
alone does not provide security. No API is secured by the client-side layout.

### Exact default-admin conditions

- `server/api.ts:17–23`: Bearer value used when header begins with Bearer;
  otherwise cookie token used. Missing/unrecognized headers can leave token empty.
- `:25–29`: fixed demo tokens directly select seeded admin/sample customer.
- `:32–41`: JWT verification exceptions are swallowed; no rejection follows.
- `:35–37`: valid JWT returns DB user only if decoded id exists and lookup succeeds.
- `:44–45`: empty token, invalid/expired token, missing decoded id, or nonexistent
  DB user all fall through to seeded admin. Missing-id variant is statically
  confirmed; no separate request for that variant was needed in the matrix.
- `:46–47`: outer resolver exception also tries seeded admin (static evidence;
  this exception path was not fault-injected).
- `:61`: requireAdmin adds another seeded-admin fallback if resolver returns null.
  If admin genuinely absent and no permitted user resolves, middleware returns 403;
  the bypass relies on the normally seeded admin existing.
- `:51–56`: requireAuth additionally substitutes sample customer on null, then 401
  only if no resolved/fallback user exists.
- `src/components/layout/AdminLayout.tsx:43–57`: missing/non-privileged client user is replaced by a
  synthetic super_admin + recognized demo token. `:87–100` also exposes a demo
  switch function. Browser-only promotion complements, not causes, server bypass.

## 3. Every admin screen: buttons/forms and persistence truth

Classification is by **server persistence**, not whether a control animates:
- **REAL**: mutation reaches API and DB (not a claim that business rules are safe).
- **LOCAL-ONLY**: React/store/browser-only state or effects, including localStorage,
  clipboard/download/navigation and read-filter submission; no server persistence.
- **FAKE**: apparent business operation with only a success toast/no action, or an
  inert preview button. Explicit preview controls are distinguished from deception.

Read-only Dashboard/Customers/Logs have **no page-level button/form elements**;
reads use real APIs with fallbacks. Shared AdminLayout chrome controls are browser
state/navigation/logout/demo-switch controls, not persistent admin workflows.
Detailed per-button/form inventory follows later in this report. Repeated mapped
buttons share their single source element/classification; no instance is silently
counted as a distinct implementation. Input controls edit drafts unless stated.

| Screen | Business controls and actual behavior | Classification / source |
|---|---|---|
| Dashboard | Database KPIs mixed with hardcoded chart/conversion; no buttons/forms | Read-only, src/pages/admin/AdminDashboardPage.tsx:30; server/api.ts:666–703 |
| Products | Add/edit modal; save product; delete; search/category filter | Save/delete REAL (:81–112); form drafts/open/close LOCAL-ONLY; search LOCAL-ONLY read requery (:48–51) |
| Categories/brands | Create/edit/delete both; featured/order/parent fields | All mutations LOCAL-ONLY, src/pages/admin/AdminCategoriesPage.tsx:93–203; initial categories GET is real |
| Orders | Status/tracking form; filter; export CSV | Status submit REAL (:47–61); filter LOCAL-ONLY read requery; CSV LOCAL-ONLY browser download (:75–85), not a fake download |
| Customers | Table only | Read-only, src/pages/admin/AdminCustomersPage.tsx:14 |
| Marketing | Coupon enable/create/delete; banner create/edit/delete; flash controls/save | Coupon/banner LOCAL-ONLY (:136–272); flash inputs LOCAL-ONLY; flash apply FAKE toast-only (:528–533) |
| Content | Blog create/edit/delete; static-pages visit links | Blog LOCAL-ONLY (:85–136); page links navigate actual static routes, no editor/persistence |
| Media | Add URL, delete, filters/select/details; copy URL | LOCAL-ONLY (:119–154), clipboard is browser effect; no upload or server deletion despite labels |
| Theme | Presets/colors/reset/dark/publish; font/radius; preview buttons | LOCAL-ONLY (:80–101); publish writes localStorage; font/radius do not apply globally; preview buttons inert FAKE (:346–358), illustrative only |
| Payment | Enable/default/config form + sandbox checkbox; tabs | All LOCAL-ONLY, src/pages/admin/AdminPaymentPage.tsx:184–232; no actual config or gateway testing |
| SMS | Provider save; charge credit; template toggle/edit; send simulator; tabs | Provider save FAKE (:147–150); charge/templates LOCAL-ONLY (:153–169,228–236); simulator LOCAL-ONLY with fake delivered claims (:172–212) |
| Settings | General/shipping form save; gateway display | Save REAL (:23–36); draft changes LOCAL-ONLY; SEP read-only display is hardcoded, not provider health |
| Logs | Table only | Read-only, src/pages/admin/AdminLogsPage.tsx:14 |

All form input/select/textarea changes are draft state. Non-button business
switches: marketing flash active/time/percentage (`:480–525`), SMS pattern enable
checkboxes (`src/pages/admin/AdminSmsPage.tsx:320–326`), payment enable/sandbox, and theme color/font/
radius inputs are LOCAL-ONLY. Settings fields and product fields persist only
through their REAL submit handlers, not on each change. Clipboard success is not
awaited, so a permission failure may still show a success toast.

## 4. Storefront mock/hardcoded domain datasets

This inventory covers data-bearing constants AND inline domain fixtures—not just
variables named mock. Static translated UI labels/icons/sort names are legitimate
code/config, not all candidates for a CMS. Below lists content/config that should
be server/admin/account-backed or explicitly demo-only in a production store.

| Location | Dataset / hardcoded behavior | Required source or replacement |
|---|---|---|
| src/lib/fallbackData.ts:6–16 | FALLBACK_CATEGORIES | API error/empty state; never silently substitute catalog |
| same :17–40 | FALLBACK_BANNERS | Published marketing content |
| same :41–69 | FALLBACK_BLOGS | Published blog API |
| same :70–211 | FALLBACK_PRODUCTS incl images/prices/stocks/ratings | Authoritative catalog; missing resource must stay missing |
| same :212–233 | FALLBACK_SETTINGS | Safe public settings DTO, not provider/demo settings |
| src/lib/api.ts:182–213 | Hardcoded dashboard metrics/chart fallback (admin data shipped in storefront bundle) | Real metrics/error state |
| src/store/authStore.ts:4–18,34–38,62–86 | DEMO_USER_SOHRAB, auto customer identity/wallet/points/profile | Authenticated session; guest=null |
| src/store/cartStore.ts:37–100,102–118 | INITIAL_CART_ITEMS and initial demo coupon | Empty new cart; actual account/cart/coupon validation |
| same :317–322 | Shipping threshold/fee fixed constants | Server quote/config |
| storefront/AccountPage.tsx:83–96 | DEFAULT_CUSTOMER | Actual current user, no fabricated fallback |
| same :97–123 | INITIAL_ADDRESSES | User address API |
| same :124–173 | INITIAL_WISHLIST product data | Account wishlist API |
| same :174–212 | INITIAL_TRANSACTIONS wallet activity | Durable financial ledger |
| same :213–239 | INITIAL_NOTIFICATIONS | Account notifications/events API |
| same :240–269 | INITIAL_COUPONS | Eligible validated user coupons |
| same :270–282 | INITIAL_RETURNS | Authorized return/refund API |
| same :383–452 | DEMO_ACTIVE_ORDER / DEMO_DELIVERED_ORDER and fallback displayOrders | Actual orders/empty state |
| same :331–360,462–521 | Default profile/bank/review/return fields, wallet charge and club-point conversion offers/pseudo transactions | Verified profile, ledger and loyalty policy; clear drafts instead of personal demo values |
| same :622–675, review/club/invoice JSX later in file | Review submission, return item/refund amount, profile/password success claims; fixed club tiers/rules and tax seller identity | Reviews/returns/profile/security APIs; admin loyalty/legal settings |
| storefront/HomePage.tsx:20–36,256–300,382–406,445–489 | Resetting countdown, promotional editorial blocks/images/copy, benefits, brand strip, newsletter fake success | Published campaign expiry, brand/content/home data; real newsletter opt-in |
| storefront/ShopPage.tsx:80 | Fixed brandsList | Brand taxonomy API; not unrelated display list |
| storefront/ProductDetailPage.tsx:347–365 | Same two review identities/dates/ratings/text on every product | Product-specific approved reviews |
| same :125–155,235–290 | Stock/service/guarantee/promotion presentation copy | Product/policy settings as applicable; do not imply unsupported services |
| storefront/CheckoutPage.tsx:13–23 | Partial IRAN_PROVINCES city list | Maintained complete shipping-zone dataset/config (could be versioned reference data) |
| same :31–49,282–311 | Recipient/address/identity defaults, delivery slots, enabled methods, shipping/coupon formulas | Account address, fulfillment availability, enabled validated methods, server quote |
| storefront/CartPage.tsx:215–293 | Shipping/checkout service promises and quote display | Approved store policy and server quote; cart items themselves are local-store snapshots |
| storefront/OrderSuccessPage.tsx:119–155 | Hardcoded seller legal name/identifiers/address and invoice presentation | Real legal settings and verified invoice policy, never invented fiscal identity |
| storefront/AccountPage.tsx:2270–2435 | Invoice seller/tax/payment display template and demo fallbacks | Same verified legal/invoice service, not a second independent invoice model |
| storefront/OrderTrackingPage.tsx:40–53 | Linear fixed delivery steps (does not model failed/cancelled/refunded fully) | Server state/history projection; fixed translations may remain in client |
| storefront/StaticPages.tsx:8–47,61–98,162–189 | About/story/stats, contact details, FAQ entries | Approved CMS/store contact/policy settings |
| components/shared/TopNavBar.tsx:47–286 | Brand/support/promotional text, hardcoded nav/mega-menu links | Public store config/menu/content API |
| components/shared/Footer.tsx:6–126 | Contact/address/hours, menus/social/trust/service claims | Approved store/menu/legal settings; trust badges need actual authorization |
| components/layout/StorefrontLayout.tsx:71–82 | /wishlist navigation with no route | Correct account hash/real route; not an implemented wishlist endpoint |
| index.html:6–35 | Same SEO metadata/JSON-LD domain, payment/currency claims for all routes | Valid deployment/domain and per-page/product SEO data |

Seeded database content is separate from frontend constants: `server/db/database.ts`
contains sample products/users/categories/brands/orders/coupons/blogs/banners/settings,
not production inventory. `server/api.ts:677–685` also fabricates the sales time
series; `:693` conversion rate is hardcoded. `orders` fallback to sample customer's
records (`:611–613`) and repository missing-item title/image fallbacks (`server/db/repository.ts:544–560`)
are additional server-side fabricated data sources exposed through the UI.

## 5. sql.js suitability and recommendation

`server/db/database.ts:9–27`: one in-process SQLite image; every repository execute
(`server/db/repository.ts:25–29`) synchronously exports the ENTIRE image and overwrites the
same file with writeFileSync. No atomic temp-file/rename/fsync protocol, shared DB
lock/WAL across processes, per-order transaction or durable outbox. Write errors
are swallowed. Startup read failure creates a new image (`server/db/database.ts:42–49`);
seeding depends only on user count (`:276–282`). No migration versioning.

**Observed:** fault-injected write failure still returned settings success, changed
memory and left disk unchanged. Two independent image/export model lost the first
writer's change when stale second image exported. These are documented in
TEST_RESULTS.md. Crash/truncated-file recovery and real concurrent worker load were
not simulated and remain UNVERIFIED; their risk follows from the write design.

**Concurrency nuance:** synchronous SQL/write sections in a single Node process
run serially on the event loop; this audit does NOT claim simultaneous in-thread
SQL execution. However multi-statement operations lack transactions, async boundaries
can permit interleaving, duplicate HTTP/retry requests repeat mutations, and multiple
Node/PM2 workers each hold their own stale image and overwrite each other. A crash
between stock change/order/log writes leaves partial durable state even with just
one process. IDs derived from Date.now and random short order numbers lack a
reliable collision/retry strategy. Full exports block all requests as DB grows.

**Recommendation: reject this persistence design for production order handling.**
sql.js itself is useful for prototypes/offline read workloads; these findings target
this deployment/write mechanism, not every possible sql.js application. Prefer
PostgreSQL with server transactions, FKs/check constraints, migrations, idempotency
keys and explicit stock/order/ledger ownership. Native file-backed SQLite with
transactions/foreign keys/WAL can be acceptable for a strictly single-instance
small deployment after capacity/recovery testing; merely changing the library is
NOT sufficient. No multi-process cluster on the current export file. No DB migration
or replacement has been applied. See decision memo for effort/risk trade-offs.

## 6. Security/correctness coverage and non-findings

- **Auth/RBAC/IDOR:** executed matrix and cross-user order read confirm failures.
- **CSRF/CORS:** wildcard Origin and cookie auth, no CSRF token/origin checks;
  sameSite=lax helps against some cross-site requests but is not full protection.
  Wildcard CORS does NOT by itself permit credentialed cross-origin reads because
  Allow-Credentials is not enabled. Anonymous bypass makes many attacks not need
  cookies at all. Browser cross-origin exploit was not executed.
- **XSS/rich text:** no dangerouslySetInnerHTML/eval/innerHTML sink found; blog
  content is rendered as escaped paragraph text (`src/pages/storefront/BlogPages.tsx:133–136`). No
  confirmed stored-rich-text XSS exploit. URLs/CSS inputs lack a unified validation
  policy; a future rich HTML editor must sanitize explicitly. No security headers/CSP.
- **SQL injection:** most values are bound. Product sort is allowlisted, limits
  Number-converted. usersRepo.update interpolates column keys (`server/db/repository.ts:90–96`)
  but inspected controllers pass fixed keys, not raw req.body; no reachable SQL
  injection confirmed. Do not label this as a proven exploit. Validation still missing.
- **Uploads:** no upload endpoint exists, so no implemented upload validation or
  optimizer to certify; media UI accepts URLs. Future upload attack surface missing.
- **Payments:** no provider request/callback/verify endpoint. Cannot replay a
  non-existent verify route; absence is the blocker, not a falsely tested gateway.
  Official URLs/error codes, Rial conversion, sandbox/IP constraints UNVERIFIED.
- **Dates:** 4,018 conversion comparisons pass; no demonstrated Jalali algorithm
  defect. Browser-local date getters (not Tehran) and invalid/non-ISO demo dates
  remain a correctness risk. Fixed-timezone browser tests not performed.
- **Accessibility/RTL:** icon-only buttons lack consistent accessible names, labels
  often not linked by htmlFor, no established modal focus trapping. These are
  static observations, not a WCAG certification or measured visual RTL failure.
- **Performance/SEO:** executed bundle result confirms one large eager bundle;
  product formatter N+1 queries and synchronous full exports are static bottlenecks.
  No load benchmark, Core Web Vitals or search-index test was executed.

## 7. Decision memo and next-session priorities

**Recommendation: keep UI, replace backend/domain core incrementally** (not a
framework fashion rewrite). Both repair and replacement are L overall; the memo
compares each area and reuse boundaries, with no fabricated LOC reuse percentage.
[Read full decision memo](DECISION_MEMO.md). No direction has been approved yet.

Best next five tasks, subject to approval:
1. Contain deployment and implement fail-closed identity, remove demo elevation,
   authorize every resource/action and add the 132-context matrix as regression tests.
2. Approve transactional DB/domain schema, migration/backups and shared currency/
   tax/shipping/quote contracts; make durability failures fail the request.
3. Implement authoritative pricing, validated stock reservations and idempotent
   order state machine, rejecting unsupported methods and negative quantities.
4. Add one officially verified gateway adapter with persisted amount/authority,
   idempotent callback/reconciliation tests; then real OTP/SMS adapters/queue.
5. Wire highest-value admin/account writes and remove fake data/success, alongside
   media validation, production deployment tests and release acceptance criteria.

Phases 4 (final documentation/header pass) and 5 (detailed approval-only cleanup
plan) remain pending. The audit does not authorize their fixes or replace approval.

## Appendix A. Exhaustive page-level button/form source elements

Every `<button>` and `<form>` in all 13 admin page files is enumerated by its opening line. Mapped controls repeat this classification for each item. Shared layout buttons are enumerated too. Links and non-button switches are described in section 3; native browser effects stay LOCAL-ONLY under the strict DB-persistence definition. Classification is static handler tracing; not an automated browser click test.

### AdminCategoriesPage

`src/pages/admin/AdminCategoriesPage.tsx`

| Opening line | Element / operation | Class |
|---|---|---|
| 223 | Button: Open create category | LOCAL-ONLY |
| 231 | Button: Open create brand | LOCAL-ONLY |
| 244 | Button: Categories tab | LOCAL-ONLY |
| 256 | Button: Brands tab | LOCAL-ONLY |
| 327 | Button: Open category edit | LOCAL-ONLY |
| 334 | Button: Delete category from state | LOCAL-ONLY |
| 385 | Button: Open brand edit | LOCAL-ONLY |
| 392 | Button: Delete brand from state | LOCAL-ONLY |
| 412 | Button: Close category modal | LOCAL-ONLY |
| 420 | Form: Category form submit | LOCAL-ONLY |
| 499 | Button: Cancel category edit | LOCAL-ONLY |
| 506 | Button: Save category draft to state | LOCAL-ONLY |
| 526 | Button: Close brand modal | LOCAL-ONLY |
| 534 | Form: Brand form submit | LOCAL-ONLY |
| 582 | Button: Cancel brand edit | LOCAL-ONLY |
| 589 | Button: Save brand draft to state | LOCAL-ONLY |

### AdminContentPage

`src/pages/admin/AdminContentPage.tsx`

| Opening line | Element / operation | Class |
|---|---|---|
| 154 | Button: Open new blog | LOCAL-ONLY |
| 166 | Button: Blogs tab | LOCAL-ONLY |
| 178 | Button: Static pages tab | LOCAL-ONLY |
| 229 | Button: Open blog editor | LOCAL-ONLY |
| 235 | Button: Delete blog from state | LOCAL-ONLY |
| 298 | Button: Close blog modal | LOCAL-ONLY |
| 306 | Form: Blog form submit to state | LOCAL-ONLY |
| 384 | Button: Cancel blog edit | LOCAL-ONLY |
| 391 | Button: Publish blog to state only | LOCAL-ONLY |

### AdminCustomersPage

`src/pages/admin/AdminCustomersPage.tsx`

No button/form elements; read-only API view.

### AdminDashboardPage

`src/pages/admin/AdminDashboardPage.tsx`

No button/form elements; read-only API view.

### AdminLogsPage

`src/pages/admin/AdminLogsPage.tsx`

No button/form elements; read-only API view.

### AdminMarketingPage

`src/pages/admin/AdminMarketingPage.tsx`

| Opening line | Element / operation | Class |
|---|---|---|
| 291 | Button: Open create coupon | LOCAL-ONLY |
| 299 | Button: Open create banner | LOCAL-ONLY |
| 312 | Button: Coupons tab | LOCAL-ONLY |
| 324 | Button: Banners tab | LOCAL-ONLY |
| 336 | Button: Flash-deals tab | LOCAL-ONLY |
| 396 | Button: Toggle coupon active state | LOCAL-ONLY |
| 408 | Button: Delete coupon from state | LOCAL-ONLY |
| 452 | Button: Open banner editor | LOCAL-ONLY |
| 458 | Button: Delete banner from state | LOCAL-ONLY |
| 528 | Button: Apply campaign timer (toast only) | FAKE |
| 546 | Button: Close coupon modal | LOCAL-ONLY |
| 554 | Form: Coupon form submit to state | LOCAL-ONLY |
| 627 | Button: Cancel coupon | LOCAL-ONLY |
| 634 | Button: Save coupon to state | LOCAL-ONLY |
| 654 | Button: Close banner modal | LOCAL-ONLY |
| 662 | Form: Banner form submit to state | LOCAL-ONLY |
| 721 | Button: Cancel banner | LOCAL-ONLY |
| 728 | Button: Save banner to state | LOCAL-ONLY |

### AdminMediaPage

`src/pages/admin/AdminMediaPage.tsx`

| Opening line | Element / operation | Class |
|---|---|---|
| 173 | Button: Open URL-entry modal | LOCAL-ONLY |
| 191 | Button: Filter media (mapped) | LOCAL-ONLY |
| 238 | Button: Copy URL (mapped; clipboard) | LOCAL-ONLY |
| 250 | Button: Delete local media (mapped) | LOCAL-ONLY |
| 272 | Button: Close details | LOCAL-ONLY |
| 312 | Button: Copy selected URL | LOCAL-ONLY |
| 322 | Button: Delete selected local entry, not server file | LOCAL-ONLY |
| 329 | Button: Close details footer | LOCAL-ONLY |
| 346 | Button: Close URL-entry modal | LOCAL-ONLY |
| 354 | Form: Submit URL-entry form to state | LOCAL-ONLY |
| 399 | Button: Cancel URL entry | LOCAL-ONLY |
| 406 | Button: Save URL entry to state | LOCAL-ONLY |

### AdminOrdersPage

`src/pages/admin/AdminOrdersPage.tsx`

| Opening line | Element / operation | Class |
|---|---|---|
| 75 | Button: Download current orders as CSV (browser) | LOCAL-ONLY |
| 103 | Button: Status filter/read requery (mapped) | LOCAL-ONLY |
| 183 | Button: Open order-status editor (mapped) | LOCAL-ONLY |
| 215 | Button: Close status modal | LOCAL-ONLY |
| 223 | Form: Submit order-status API mutation | REAL |
| 268 | Button: Cancel status edit | LOCAL-ONLY |
| 275 | Button: Save order status/tracking via API | REAL |

### AdminPaymentPage

`src/pages/admin/AdminPaymentPage.tsx`

| Opening line | Element / operation | Class |
|---|---|---|
| 259 | Button: Gateways tab | LOCAL-ONLY |
| 271 | Button: Transactions tab | LOCAL-ONLY |
| 348 | Button: Select local default gateway | LOCAL-ONLY |
| 355 | Button: Open gateway configuration | LOCAL-ONLY |
| 420 | Button: Close gateway editor | LOCAL-ONLY |
| 428 | Form: Gateway configuration form to state | LOCAL-ONLY |
| 472 | Button: Cancel gateway edit | LOCAL-ONLY |
| 479 | Button: Save gateway configuration to state | LOCAL-ONLY |

### AdminProductsPage

`src/pages/admin/AdminProductsPage.tsx`

| Opening line | Element / operation | Class |
|---|---|---|
| 128 | Button: Open new product | LOCAL-ONLY |
| 139 | Form: Search form/read requery | LOCAL-ONLY |
| 147 | Button: Submit search/read requery | LOCAL-ONLY |
| 233 | Button: Open product editor (mapped) | LOCAL-ONLY |
| 240 | Button: Delete product via API (mapped) | REAL |
| 271 | Button: Close product editor | LOCAL-ONLY |
| 279 | Form: Product create/update form via API | REAL |
| 374 | Button: Cancel product edit | LOCAL-ONLY |
| 381 | Button: Save product via API | REAL |

### AdminSettingsPage

`src/pages/admin/AdminSettingsPage.tsx`

| Opening line | Element / operation | Class |
|---|---|---|
| 42 | Form: Settings form via API | REAL |
| 224 | Button: Save settings via API | REAL |

### AdminSmsPage

`src/pages/admin/AdminSmsPage.tsx`

| Opening line | Element / operation | Class |
|---|---|---|
| 228 | Button: Simulate balance recharge | LOCAL-ONLY |
| 243 | Button: Patterns tab | LOCAL-ONLY |
| 255 | Button: Provider tab | LOCAL-ONLY |
| 267 | Button: Simulator tab | LOCAL-ONLY |
| 279 | Button: Logs tab | LOCAL-ONLY |
| 349 | Button: Open pattern editor | LOCAL-ONLY |
| 365 | Form: Provider-config form (toast only) | FAKE |
| 380 | Button: Choose provider (mapped) | LOCAL-ONLY |
| 437 | Button: Submit provider config (toast only) | FAKE |
| 457 | Form: Simulator form | LOCAL-ONLY |
| 499 | Button: Run timer-based SMS simulation | LOCAL-ONLY |
| 605 | Button: Close pattern editor | LOCAL-ONLY |
| 613 | Form: Pattern form submit to state | LOCAL-ONLY |
| 638 | Button: Cancel pattern edit | LOCAL-ONLY |
| 645 | Button: Save pattern in state | LOCAL-ONLY |

### AdminThemePage

`src/pages/admin/AdminThemePage.tsx`

| Opening line | Element / operation | Class |
|---|---|---|
| 117 | Button: Toggle browser dark mode | LOCAL-ONLY |
| 127 | Button: Revert draft CSS colors | LOCAL-ONLY |
| 134 | Button: Publish browser-local theme only | LOCAL-ONLY |
| 346 | Button: Illustrative preview add-to-cart (inert) | FAKE |
| 352 | Button: Illustrative preview details (inert) | FAKE |

### AdminLayout

`src/components/layout/AdminLayout.tsx`

| Opening line | Element / operation | Class |
|---|---|---|
| 130 | Button: Toggle mobile sidebar | LOCAL-ONLY |
| 139 | Button: Toggle desktop sidebar | LOCAL-ONLY |
| 189 | Button: Toggle browser dark mode | LOCAL-ONLY |
| 201 | Button: Toggle notification popover | LOCAL-ONLY |
| 234 | Button: Toggle user menu | LOCAL-ONLY |
| 264 | Button: Logout cookie API + local auth state (no DB write) | LOCAL-ONLY |
| 275 | Button: Promote client to demo admin | LOCAL-ONLY |
| 357 | Button: Close mobile sidebar | LOCAL-ONLY |

Inventory totals: **101 page button/form source elements**, plus **8 layout buttons**. No source changes or persistence assertions are inferred solely from a button label.

## 8. Prioritized findings — all OPEN, no fixes applied

Evidence notation: **R** = reproduced runtime, **S** = verified source,
**U** = external/deployment behavior UNVERIFIED. Each suggested fix is a proposal,
not a change made in this audit. Severity assesses production impact assuming the
application is reachable; do not expose it to obtain further proof.

### Critical

| ID | Evidence / file:line | Finding and impact | Suggested fix and verification |
|---|---|---|---|
| C01 | R+S; server/api.ts:15–66; src/components/layout/AdminLayout.tsx:43–57 | All 11 admin endpoints accept absent/invalid/expired/unknown-subject auth; fixed demo admin accepted; layout promotes guests/customers. Full catalog/order/settings/customer compromise. | Fail closed, remove demo branches/promotion, explicit session and role policy. Regression-test all 132 contexts plus missing/disabled users and cookies. |
| C02 | R+S; server/api.ts:478–506 | Supplied item/variant prices and unchecked quantities drive order totals. A unit price of 1 succeeds; quantity -3 increases stock. | Server catalog/variant lookup, integer-positive quantity/schema checks, authoritative quote, availability constraints; tampering/negative/zero/overflow tests. |
| C03 | R+S; server/api.ts:550–577; src/pages/storefront/CheckoutPage.tsx:94–97 | Wallet/COD marked paid without collection/debit; wallet remains awaiting_payment; no gateway request/redirect/callback/verify exists. UI success is not receipt of money. | Implement ledger/payment state machine, provider adapters, persisted order-bound authority/amount/unit, verified idempotent paid transition. Sandbox/replay/wrong-amount/refund tests. |
| C04 | R+S; server/db/database.ts:19–27,42–49; server/db/repository.ts:25–29; server/api.ts:503–505,583–595 | DB write errors swallowed; stock/order/log saved separately; disk failure still returns 200. Independent workers overwrite stale full DB images; crashes can leave deducted stock without order. | Transactional durable DB with fail-fast writes, migrations and backups; atomic stock/order/idempotency flow. Fault/crash/multi-worker/restore tests. Current sql.js export design rejected for production orders. |

### High

| ID | Evidence / file:line | Finding and impact | Suggested fix and verification |
|---|---|---|---|
| H01 | R+S; server/api.ts:121–174; src/components/shared/AuthModal.tsx:28,57 | Fixed predictable OTP, ignored expiry, no rate/attempt limit, no SMS; UI URLs mismatch. Expired code authenticated after 10-minute clock advance. | Secure random hashed one-use OTP, expiry/attempt/resend limits, provider adapter, matched paths. Test expiry/replay/bruteforce and provider failures. |
| H02 | R+S; server/api.ts:607–630 | Public full order detail and cross-user reads expose recipient/address/items; own-order list can substitute sample user's orders. | Authenticate/authorize owner or scoped admin, remove foreign fallback; minimize public tracking, add enumeration throttles. Test cross-user/guest access. |
| H03 | R+S; server/api.ts:849–884; server/db/repository.ts:683–695 | Settings GET selectively masks, PUT echoes secrets; no encryption/scoped DTO. Anonymous settings mutation/read follows C01; mask round-trip overwrites real values. | Write-only secret fields/secure store, public-vs-private DTOs, strict settings schema, preserve omitted values; test no secret echo and nested edits. |
| H04 | S + bundle check; server/api.ts:12; server/db/database.ts:290–293; src/components/shared/AuthModal.tsx:125–135; src/pages/admin/AdminSmsPage.tsx:127; src/pages/admin/AdminPaymentPage.tsx:41–112 | Default signing/password/demo/provider-shaped literals in source/history and frontend bundle; production validity of provider identifiers U. | Remove credential literals from client, require secure secret provisioning, rotate any real reused values; review history safely. Never publish values or silently assume placeholders are harmless. |
| H05 | R+S; server/api.ts:252–270 | Password change permits omission of old password; combined with C01 can reset seeded admin anonymously. Valid customer test changed password without old one. | Require recent authenticated reauthentication/old-password check; separate secure recovery token flow; invalidate sessions and test denial without proof. |
| H06 | R+S; server/api.ts:404–442,526–540; src/store/cartStore.ts:303–322; src/pages/storefront/CheckoutPage.tsx:45–49 | Expired/exhausted coupon accepted; count not updated; checkout ignores percentage cap; three shipping models disagree; VAT recorded but excluded from total without explicit policy. | One server quote/calculation service, atomic redemption/eligibility/date/limit checks; approve tax inclusion, rounding, currency policy; table-driven boundary tests. |
| H07 | R+S; server/api.ts:811–835; server/db/repository.ts:501–537 | Arbitrary order status persisted; delivered implies paid, no allowed transitions/refund/stock compensation. | State transition service, permission checks, verified financial state separate from fulfillment, atomic compensation. Test invalid transitions and retries. |
| H08 | S; server/db/database.ts:58–273; server/db/repository.ts:215–308 | No FKs/CHECKs; product/variants created/deleted in separate commits; no durable order-item referential policy. JSON snapshots reduce relational protection. | Constrained schema/migrations and transactions; explicit snapshot vs reference rules, soft-delete/protection. Test partial failures/orphans and deletion of ordered items. |
| H09 | S; server.ts:20–34; server/api.ts:77–207,301–329,707–718 | No login/OTP/order/track/admin mutation rate limits or strict request schemas; uncapped storefront limit and invalid admin pagination can expand resource use. | Per-route identity/IP limits, size/type/range bounds and payload schemas, generic safe error model. Test invalid/large bodies, request floods and bounded pagination. |
| H10 | S; src/pages/storefront/AccountPage.tsx:462–496,622–675; src/pages/admin/AdminSmsPage.tsx:147–212; src/pages/admin/AdminMarketingPage.tsx:528–533 | Security/financial/contact/content actions claim success without backend persistence/delivery. Account password UI does not even call the real password API. | Remove misleading success, disable incomplete actions or wire tested services; clear demo labeling until durable read-back passes after reload. |

| H11 | S + executed npm test; package.json:6–13 | No automated test suite or CI gate for authorization, pricing, coupons, stock, payment verification or durability. Type-check/build pass despite reproduced release-blocking behavior. | Add deterministic unit/integration/security tests for each invariant before fixes roll out; provider sandbox/contract tests and failure-injection/restore gates. Never count absent test script as passed tests. |

### Medium

| ID | Evidence / file:line | Finding and impact | Suggested fix and verification |
|---|---|---|---|
| M01 | R+S; server/api.ts:301–356; server/db/repository.ts:137–209 | Published-status filtering absent; draft detail returned publicly. Admin status filter destructured but unused. | Separate public/admin visibility queries, validate filters; test draft/scheduled privacy. |
| M02 | S; src/store/authStore.ts:35–48; server/api.ts:95–103; server.ts:20–34 | JWT duplicated in JS-readable storage; no CSRF token/origin policy, broad CORS, no CSP/security headers. sameSite=lax/HttpOnly help only part of model. | Define cookie-only or well-scoped bearer strategy, CSRF/origin enforcement where cookies used, restricted CORS/security headers; browser cross-origin/XSS regression tests. No confirmed rich-text XSS claimed. |
| M03 | S; src/lib/api.ts:63–139,174–296; src/store/authStore.ts:62–86 | Catch-all read fallbacks conceal auth/server failures and substitute wrong resources/demo identity; fake account orders when empty. | Typed errors and genuine loading/empty/error states; gate demo mode explicitly outside production; missing resource/offline/auth-error tests. |
| M04 | S; src/store/themeStore.ts:62–121; src/pages/admin/AdminThemePage.tsx:80–101,265–282 | Theme "public" publication local only; background/surface/radius unused by injection; font selector only local. | Server versioned theme/public DTO, safe token validation and full variable mapping, atomic publish/revert; cross-browser/user persistence tests. |
| M05 | S + R build; src/App.tsx:12–38; server/db/repository.ts:312–314; server/db/database.ts:22–24 | Eager single JS chunk 1,072.91 kB; variant N+1 queries and synchronous full-image export block scaling. | Route splitting, bounded eager data/variant joins, transactional storage; bundle budgets and load/query-count tests. |
| M06 | S; index.html:6–35; server.ts:61–66 | Static SEO/JSON-LD domain and claims on all routes; no per-product meta, sitemap, robots or HTTP 404 handling. | Verified site config, dynamic metadata/SSR/prerender strategy, sitemap/robots/redirect policy; crawl/status checks. |
| M07 | S; src/lib/persian.ts:103–126; src/pages/storefront/AccountPage.tsx:383–452 | Browser timezone decides displayed Jalali date; demo dates not ISO. No demonstrated conversion algorithm failure (4,018 passed). | Store UTC ISO, format explicitly Asia/Tehran; midnight/DST/invalid/date-only tests; preserve passed conversion coverage. |
| M08 | S; server/db/repository.ts:267–302; src/pages/admin/AdminProductsPage.tsx:92–109 | Product update ignores variants/attributes/brandId/type/video/tags; stale variants and stock can diverge from product. | Explicit validated product/variant command DTOs, transactional reconciliation; create/edit/reload/variant stock tests. |
| M09 | S; src/pages/admin/AdminOrdersPage.tsx:75–84 | CSV interpolates unescaped customer fields, commas/newlines and spreadsheet formulas; corruption/formula-injection risk. Browser spreadsheet execution U. | Proper CSV escaping and formula neutralization, export least PII; test formula/comma/quote/newline values. |
| M10 | S; package.json:6–12; server.ts:14–15; .gitignore:1–8 | No test/migration/backup/CI/production manifest; runtime depends on devDependency tsx; dotenv not initialized; data/ not ignored. | Reproducible production runtime/env provisioning, isolated persistent volume/backups/restore/CI, safe ignore rules. Verify clean deploy and recovery; changes require approval. |
| M11 | S; src/components/shared/Footer.tsx:6–126; src/pages/storefront/OrderSuccessPage.tsx:119–155; src/pages/storefront/AccountPage.tsx:2270–2435 | Fixed legal identity/trust/invoice/service claims and fake review fixtures may misrepresent store or tax compliance. | Replace with verified legal/policy/review data; no official tax-invoice claim without compliance validation. Test settings propagation/content review. |

### Low

| ID | Evidence / file:line | Finding and impact | Suggested fix and verification |
|---|---|---|---|
| L01 | S; src/pages/admin/AdminCategoriesPage.tsx:327–340; src/pages/storefront/ProductDetailPage.tsx:109–120,242–255; src/components/shared/AuthModal.tsx:142–386 | Icon-only controls/labels/modals lack consistent accessible naming, associated labels and verified focus behavior. No browser WCAG/RTL test executed. | Accessible labels/linked controls, keyboard/focus traps and announcements; browser/a11y/RTL review. |
| L02 | S; src/components/layout/AdminLayout.tsx:9–21,103–121; src/App.tsx:12–38; src/pages/storefront/AccountPage.tsx:1–2655 | Duplicate admin view dispatch/imports; large account component mixes fake business flows and UI; unused imports/dependencies complicate ownership. | After correctness fixes, remove duplicate routing, split domain views/hooks, verify unused dependencies before deletion. Route and snapshot tests. |
| L03 | S; src/components/layout/StorefrontLayout.tsx:71–82; src/App.tsx:78–114 | Mobile wishlist link points to missing /wishlist route; account wishlist is a hash tab, compare absent. | Approved route/link contract and real wishlist service; navigation tests on mobile/desktop. |

## Final verdict and approval boundary

**Health 2/10; launch verdict: NO-GO.** Passing build/type-check does not validate
authentication, payments, durable orders or provider compatibility. All Critical
and High findings remain open. At minimum close those release blockers, remove
fabricated business claims, add regression/provider tests, and pass a deployment/
restore/security acceptance review before reconsidering launch.

Recommended direction: **retain UI, replace backend/domain core incrementally**.
Repair-in-place remains an option only with the same production invariants and
substantial L-level work, not a superficial patch. Await owner approval of the
approach and individual changes. No application fixes, refactor, history rewrite,
secret rotation, real payment or SMS operation was performed in this phase.


## Phase A status update — 2026-10-20

Owner approved keeping UI and incrementally rewriting backend/domain core; only
security foundation was authorized. Source changed in small commits with type-check/
build after each implementation step. **171 security tests now pass** on an isolated
DB. See [current contract and real outputs](SECURITY_FOUNDATION.md). The original
132-request Phase 3 failure table above is preserved as baseline evidence, not the
current outcome: all 11 admin operations now reject absent/invalid/expired/missing-
user/session auth with 401 and enforce resource-specific 403 rules. Independent
role expectations and malformed-body cases are checked in the committed suite.

| Finding | Current status | Phase A evidence / remaining scope |
|---|---|---|
| C01 | RESOLVED for tested bypass paths | No default/demo identities; AdminLayout guard only; cookie session and independent 11-endpoint role matrix. |
| C02 | PARTIAL | Zod rejects negative/non-integer/oversized quantities; **client price authority still unsafe**, no calculation rewrite. |
| C03 | OPEN | Payment/ledger/COD/gateway behavior not rewritten. |
| C04 | PARTIAL | Disk errors now fail requests and restore memory; private atomic file replacement; multi-statement orders/multi-worker write loss still unresolved. |
| H01 | MITIGATED / TRANSPORT OPEN | Predictable OTP auth removed; endpoints fail closed 503, schemas + rate limit. Real SMS/OTP service not implemented. |
| H02 | PARTIAL | Order detail owner/admin auth and foreign-order fallback fixed; public tracking projection/enumeration review remains. |
| H03 | API EXPOSURE RESOLVED; AT-REST OPEN | GET/PUT allowlisted masked/isSet DTOs, explicit newValue, no secret echo/error reflection; private DB still plaintext. |
| H04 | PARTIAL | Authentication defaults/presets removed; strong external JWT/bootstrap secrets. Historical/default deployed credentials/provider-looking UI literals not rotated. |
| H05 | RESOLVED for tested flows | Current-password proof, bcrypt 12, mandatory bootstrap change, atomic revoke-all + new session. |
| H06 | OPEN | Coupon expiry/redemption, authoritative quote, tax/shipping policy unchanged. |
| H07 | PARTIAL | Invalid status enums rejected; state machine/payment/fulfillment coupling still unsafe. |
| H08 | OPEN | No relational/financial database rewrite; additive auth_sessions table is not order integrity. |
| H09 | PARTIAL | Zod for all 30 operations, bounded pagination/payloads, login/OTP/register/refresh/password limits. Order/track/global abuse limits and distributed store remain. |
| H10 | PARTIAL | Actual password change/logout and no fake OTP success; other fake business panels remain outside scope. |
| H11 | PARTIAL | Committed 171-case security suite; financial/payment/provider/restore coverage and CI still pending. |
| M01 | OPEN | Product publication visibility not part of this phase. |
| M02 | PARTIAL / HARDENED | HttpOnly Secure Strict cookies, origin/metadata CSRF defense, allowlisted CORS, Helmet. Browser/TLS/a11y/XSS certification not performed. |
| M03 | PARTIAL | No fabricated auth identity or settings fallback; other catalog/dashboard/account mock fallbacks remain. |
| M04 | OPEN | Theme publication unchanged. |
| M05 | OPEN | Large eager bundle/full-image and N+1 behavior remain. |
| M06 | OPEN | SEO/HTTP page status unchanged. |
| M07 | OPEN | Explicit Tehran timezone not implemented. |
| M08 | OPEN | Full product/variant editing semantics not rewritten. |
| M09 | OPEN | CSV format/formula handling unchanged. |
| M10 | PARTIAL | dotenv/env contract, isolated runner, ignored data files; deployment/backup/migration/CI work remains. |
| M11 | OPEN | Legal/trust/mock content unchanged. |
| L01 | OPEN | New password labels are associated, but full UI accessibility audit/fixes pending. |
| L02 | OPEN | Legacy view duplication/large components unchanged. |
| L03 | OPEN | Wishlist route unchanged. |

### Current launch/approval verdict

**Still NO-GO.** The original 2/10 was a Phase 3 baseline score, not a new post-fix
certification. Authentication/settings improvements do not close Critical financial
or transactional blockers. No new overall score is asserted without their follow-up
verification. Do not expose inherited prototype accounts/data merely because these
tests pass; old stored password hashes require secure provisioning/rotation.

No payment adapter/callback, SMS transport, pricing/coupon/tax/shipping formula or
financial order-core rewrite was made. Positive quantity/status schema checks and
order ownership protection are security boundary changes, not a claim of financial
correctness. **Stop and await explicit Phase B approval.**
