# Phase 1 — Discovery and inventory

Date: 2026-10-20. Baseline: `0d436ba8cb2c2884931f2bebb868f342b5869d3e`.
Scope: source/static inspection and npm registry metadata; no application changes.
This is not the completed architecture or security audit. Runtime behavior remains
**UNVERIFIED** until execution in Phase 3. Existing README claims are not evidence.
See [dependency inventory](DEPENDENCIES.md), [file inventory](FILE_INVENTORY.md),
and [handoff](../AGENTS.md).

## Status vocabulary

- COMPLETE: verified end-to-end implementation; no area receives this label from static inspection alone.
- PARTIAL: real code/data path exists but important portions are absent or unsafe.
- STUB: visible UI/demo/local state, not a production implementation.
- MISSING: no implementation found in tracked source.
- BROKEN: code directly contradicts a required safety/functional invariant.

## Actual structure and stack

Single TypeScript repository, not separate client/server packages. React 19,
React Router 7, Zustand 5, Tailwind 4 via Vite 8, Express 4, sql.js (SQLite WASM),
bcryptjs, JWT. Exact locked versions and all direct dependencies are tabulated separately.
No Next.js, ORM, payment SDK, SMS SDK, upload processor or migration framework found.

| Location | Responsibility |
|---|---|
| `src/main.tsx`, `src/App.tsx` | React root and eager route tree |
| `src/pages/storefront/` | 11 source files, 13 storefront routes |
| `src/pages/admin/` | 13 admin section components |
| `src/components/layout/` | Storefront/admin shells |
| `src/components/shared/` | Navigation, footer, authentication modal, cart drawer, breadcrumbs, stepper, toasts |
| `src/store/` | Auth, cart, theme, toast Zustand state |
| `src/lib/` | HTTP wrapper, fallback catalog/settings, Persian utilities |
| `server.ts` | Express entry, database boot, API and health routes, Vite/static serving |
| `server/api.ts` | Monolithic router, auth helpers and controller logic |
| `server/db/database.ts` | Schema, synchronous disk export, embedded seed |
| `server/db/repository.ts` | SQL access/mapping and repositories |
| `shared/types.ts` | Shared domain interfaces (not runtime validation) |
| `index.html`, `src/index.css` | Static metadata/RTL/fonts and Tailwind design tokens |
| `vite.config.ts`, `tsconfig.json` | Build and compiler configuration |
| `bun.lock` | Only tracked dependency lockfile (format version 2) |
| `metadata.json` | App metadata |
| `public/`, `scripts/`, `tests/`, standalone `seed/` | MISSING |
| CI, Docker, process manager, ESLint config | MISSING from tracked tree |

The exact tracked tree, including filenames, is in FILE_INVENTORY.md.

## Entry points and boot requirements

`server.ts:17–76` boots Express, parses bodies (JSON limit 10 MB) and cookies,
initializes SQLite, mounts `/api`, exposes `/health`, then mounts Vite in development
or serves `dist` in production. Binds `0.0.0.0`. Development port is always 3000;
production reads `PORT` with a 3000 fallback.

Requirements inferred from code/locked package engines: Node 22.12+ (Node 22.22.3
available here), a package manager, writable working directory for `data/`, and
registry access for installation. Bun is not installed in this audit environment.
No Node version file or package-manager pin exists.

Candidate fresh setup (not yet executed; **UNVERIFIED**):

```sh
bun install --frozen-lockfile
# Export NODE_ENV and a privately generated JWT_SECRET in your process environment.
bun run dev
# Production frontend build, then run the TS server with dev dependencies present:
bun run build
NODE_ENV=production bun run start
```

Do not mistake `vite preview` for the API server. `npm ci` cannot work without an
npm lockfile. `npm install --package-lock=false` is an alternative for testing,
but resolves ranges rather than reproducing bun.lock exactly.

Seed: startup creates tables with `CREATE TABLE IF NOT EXISTS`; when users count
is zero it runs the embedded Persian sample seed (`database.ts:276–289`). No
separate seed command or versioned migration runner exists. Database location is
`<cwd>/data/digistyle.db`; all writes export the in-memory SQLite database to disk.
**Do not run against production data or expose this app publicly.** `data/` is not
ignored by the baseline `.gitignore`; never stage generated databases.

Default credential definitions exist at `server/db/database.ts:290–293` (values
intentionally masked here). A must-change flag exists but enforcement is not
established. Phase 4 quick start must reference secure provisioning instead of
publishing secret values. Existing README should not be treated as a safe runbook.

### Commands (package.json)

| Script | Actual command | Meaning |
|---|---|---|
| dev | `tsx server.ts` | Full development server |
| start | `tsx server.ts` | Same entry; NODE_ENV selects serving mode |
| build | `vite build` | Frontend only; no backend compilation/type check |
| preview | `vite preview` | Built frontend preview, no Express API |
| clean | `rm -rf dist server.js` | Deletes named artifacts; Unix shell command |
| lint | `tsc --noEmit` | Type check, NOT a style/security linter |
| test, typecheck, seed, migrate | absent | No scripts for these |

### Environment inventory (names only)

| Name | Evidence | Real effect |
|---|---|---|
| NODE_ENV | `server.ts:14`, `server/api.ts:98,182,228` | Production serving and secure cookie flag |
| PORT | `server.ts:15` | Production-only listening port |
| JWT_SECRET | `server/api.ts:12` | JWT signing/verification; unsafe hardcoded fallback |
| DISABLE_HMR | `vite.config.ts:17,19` | Vite HMR/watch controls |
| GEMINI_API_KEY | `.env.example:4` | Documented only; no source consumer found |
| APP_URL | `.env.example:9` | Documented only; no source consumer found |

No `import.meta.env` usage found. `dotenv` is declared but not imported/configured;
copying `.env.example` alone is not verified to load server settings. Neither
JWT_SECRET nor NODE_ENV/PORT appears in that example. Payment and SMS config is
represented in settings/seed or UI state, not provider env adapters.

## Feature inventory

Paths below are relative to `src/pages/` unless qualified. A working view is not
proof of secure persistence. Static verification only; browser/accessibility and
provider interoperability are UNVERIFIED.

| Area | Status | Evidence and what actually exists / missing |
|---|---|---|
| Home | PARTIAL | `storefront/HomePage.tsx:13–45`: banners/categories/catalog/blog API reads; countdown initialized to fixed values; no home builder |
| Shop and search | PARTIAL | `storefront/ShopPage.tsx`, `server/api.ts:309–346`: query-based filtering/pagination; client API substitutes fallback catalog on failures |
| Product detail | PARTIAL | `storefront/ProductDetailPage.tsx`, `server/api.ts:350–377`: product/related API, variants and cart selection; full reviews backend absent |
| Cart | PARTIAL | `src/store/cartStore.ts:102,199–261`, `storefront/CartPage.tsx`: localStorage persistence, coupon API; not a server cart |
| Checkout | BROKEN | `storefront/CheckoutPage.tsx:31–94`, `server/api.ts:465–506`: demo recipient defaults; server trusts client prices and decrements stock before payment |
| Account | PARTIAL | `storefront/AccountPage.tsx:368,462–484`: real orders read alongside local wallet/addresses/reviews/returns/profile simulations; `src/store/authStore.ts` starts with demo user |
| Blog | PARTIAL | `storefront/BlogPages.tsx:16,81`, server blog read endpoints; admin changes do not persist |
| Static pages/contact/FAQ | STUB | `storefront/StaticPages.tsx:53–57`: hardcoded pages, contact success toast without delivery/storage |
| Wishlist | STUB | Account page local/demo state; no wishlist table/API or dedicated route |
| Compare | MISSING | No route, API or persistence found |
| Tracking/success | PARTIAL | `storefront/OrderTrackingPage.tsx:23`, `OrderSuccessPage.tsx:28`: API reads; public order details lack ownership guard (`server/api.ts:616` onward) |
| Admin dashboard | PARTIAL | `AdminDashboardPage.tsx:30`, `server/api.ts:672–707`: some database KPIs, hardcoded sales series/conversion rate |
| Admin products | PARTIAL | `AdminProductsPage.tsx:81–105`, product CRUD endpoints; weak payload validation |
| Variations | PARTIAL | `shared/types.ts`, `server/db/repository.ts:254–257,312–328`: variant create/read persistence; complete editing/stock lifecycle absent |
| Categories/brands | STUB | `AdminCategoriesPage.tsx:62,93–138,161`: categories read API; mutations local, brands initialized from constants; no mutation API |
| Attributes | PARTIAL | Product JSON attributes/specifications and types; no managed attribute taxonomy/API |
| Media | STUB | `AdminMediaPage.tsx:125–151`: URL added to React array; size/format/dimensions invented; no file upload/optimization/storage |
| Orders | PARTIAL | `AdminOrdersPage.tsx:53`, API list/status mutations; no transition policy/payment verification/SMS |
| Customers | PARTIAL | `AdminCustomersPage.tsx:14`: real read endpoint; no complete customer management API |
| Coupons/banners/flash sales | STUB | `AdminMarketingPage.tsx:102–268`: initial constants/local state; coupon validation and seeded banners available separately; admin edits disconnected |
| Content/blog/pages | STUB | `AdminContentPage.tsx:50,85–132`: blog read, local editing; static-page constants; no persistent content mutations |
| Menus/home builder | MISSING | No builder schema/routes or renderer; navigation/home coded in components |
| Theme manager | PARTIAL | `AdminThemePage.tsx`, `src/store/themeStore.ts`: CSS variables live apply; publication is browser localStorage, not shared server settings |
| Settings | PARTIAL | `AdminSettingsPage.tsx:17–28`, `server/db/repository.ts:683–695`: persisted JSON shallow merge; selective GET masking, no encryption found |
| Roles/permissions | BROKEN | `server/api.ts:15–68`: coarse admin role list undermined by default-admin and demo-token paths; no granular permission management |
| Activity log | PARTIAL | `AdminLogsPage.tsx:14`, `server/db/repository.ts:698`: persisted selected actions, no comprehensive immutable audit trail |
| Backup/restore | MISSING | No backup API/script/UI; database export is persistence, not a backup policy |
| ZarinPal | STUB | `AdminPaymentPage.tsx`, settings types/seed and checkout labels only; no request/callback/verify implementation |
| Zibal | MISSING | No server provider adapter/verification route |
| Aghaye Pardakht | MISSING | No server provider adapter/verification route |
| COD | PARTIAL | `server/api.ts` order creation sets processing for `cod`; no settlement lifecycle |
| Card-to-card | MISSING | No receipt/reconciliation flow found |
| Wallet | STUB | `AccountPage.tsx:462–479`: client balance increments with fake transaction; checkout label without durable ledger/debit |
| Other gateway display | STUB | Payment UI contains gateway/transaction constants; display is not connectivity evidence |
| Melipayamak/Faraz/Kavenegar | STUB | `AdminSmsPage.tsx:123–212`: provider/pattern/log constants and timer simulator; save handler only toasts; no server delivery adapter |
| OTP | BROKEN | `server/api.ts:127–153`: predictable demo code; expiry stored, not checked by verification; no delivery/rate limit |
| SMS templates/logs/order notifications | STUB | Admin-only React state and fake delivered logs; no backend dispatch from order creation/status changes |
| Persian numerals/Toman | PARTIAL | `src/lib/persian.ts:10–39`: digit conversion and formatting; no validated gateway Rial conversion |
| RTL/i18n | PARTIAL | `index.html:2`, CSS and Persian strings; single hardcoded language, no translation catalog; visual RTL audit UNVERIFIED |
| Jalali/timezone | PARTIAL | `src/lib/persian.ts:44–127`: custom conversion; browser-local date getters, no explicit Asia/Tehran policy or tests |
| SEO | PARTIAL | `index.html`: static title/description/OG/OnlineStore JSON-LD with fixed domain; no per-product SSR/meta found |
| Sitemap/robots/redirects | MISSING | No tracked assets or corresponding backend routes; SPA catch-all is not an SEO redirect system |
| Security | BROKEN | Admin auth fallback above; settings and raw input routes need Phase 3 analysis; no rate-limit/CSRF middleware found |
| Automated tests | MISSING | No tracked tests, runner config or test script; build/type-check not yet run in Phase 1 |

## Important caveats for later phases

1. Payment and SMS adapters requested in the brief **do not exist** in the inspected server tree. Architecture diagrams must show missing steps, not invent them.
2. Authentication fallback makes this unsuitable for public exposure even as a demo with real data.
3. UI success messages often overstate persistence/delivery. Follow handlers to repository calls.
4. Seeded credentials and provider-looking identifiers require masked-location reporting; their real-world validity is UNVERIFIED. History scanning remains Phase 3 work.
5. No launch score is assigned until architecture, execution and the prioritized audit are complete.

## Phase boundaries

Phase 1 complete: tracked tree, dependency inventory, commands/env/boot constraints,
and feature status map. Phase 2 pending: exhaustive routing/API/schema, flow diagrams,
settings/adapters analysis. Phase 3 pending: prioritized security/correctness audit,
history scan, install/build/type-check/test execution. Phase 4 pending: final reference
manuals and nonfunctional source headers. Phase 5 pending: approval-only fix proposal.


## Phase 2 continuation note

Architecture analysis completed in the next separate commit; start with
[ARCHITECTURE.md](ARCHITECTURE.md). Earlier phase-boundary text above records the
Phase 1 snapshot. Additional source verification found the AuthModal OTP route
mismatch, AdminLayout synthetic admin promotion, missing `/wishlist` route despite
navigation link, and divergent cart/checkout/server formulas. These are documented
without fixes in the Phase 2 reference files. Phase 3 execution/audit remains pending.
