# L3a catalog/media/stock implementation — FULL CI verified

Catalog mutations serialize through actor + shared taxonomy mutex, then bounded
sorted records, with fresh per-action policies and same-transaction redacted audit.
Media URLs remain canonical48hex PNG; variants48hex WebP are served with explicit
MIME/nosniff. New uploads register MediaAsset metadata, never private receipts.
Virtual folder names are labels, never used as filesystem paths. MediaUsage reads
live references (including drafts/trash and JSON galleries) in9 aggregate queries
for an entire page, avoiding stale usage counters and row-by-row list queries.
Delete quarantines files atomically under the catalog mutex with rollback restore.
Replace backs up/atomically renames the safe PNG, keeps its URL and rejects stale
conversion jobs by content hash. WebP processing releases each image before the
next variant, max3 bounded outputs, same ImageBudget preflight as upload.
No healthy worker: only ≤1MP and execution-time0/unlimited or≥15s converts inline;
otherwise database queue retains pending PNG. Codec/resource errors retain PNG
and discard partial derivatives; authorized retry is explicit. Queue/host failures
must never delete a committed catalog reference.

StockAdjustment is the ONLY new admin inventory write contract: positive bounded
amount + explicit direction + reason + actor + replay key. Sorted root then
variant locks match checkout/cancel order. Atomic batches≤50 append immutable SQL
entries and redacted activity events, or roll back everything. The ledger records
adjustments, not fabricated historic checkout movements. Available-stock checkout
reservations/release remain the existing financial implementation. Date storage is
Gregorian UTC; forms/display retain the ONE verified Jalali library.

Full matrix/frontend CI39892158598 passed all8 jobs,432 tests per SQL target. Historical L1/L2 architecture follows.

# Architecture — L1 and L2 implemented; deployment unverified

2026-10-21. L1 and L2 financial code are CI-verified; deployment/browser acceptance
remains UNVERIFIED. [L2 acceptance and boundaries](L2_ACCEPTANCE.md). Exact pricing,
versioned carts, ledger, checkout/lifecycle, APIs, real parallel SQL harness and
minimal financial frontend are implemented. No gateway/SMS/business Filament resources.
Historical Node architecture: [ARCHITECTURE_LEGACY](ARCHITECTURE_LEGACY.md).

## Request and deployment boundaries

```text
HTTPS one canonical origin
  /assets /fonts /css /js /images -> built local public assets
  /api/auth/*                    -> web CSRF + cookie-only Sanctum + FormRequests
  /api/admin/settings            -> staff permission + SettingsRequest + Settings DTO
  /api/admin/media               -> staff permission + MediaRequest + safe raster service
  /media/{random}.png            -> validated private-storage delivery fallback
  /admin                         -> native Filament login/profile/settings/dashboard
  /livewire /sanctum /up          -> framework infrastructure
  other extensionless GET paths  -> private prebuilt SPA HTML, never /api or /admin errors
```

Only `public/` is exposed. Private sibling `app/` contains vendor, .env, storage,
application and SPA HTML. Public index explicitly sets its public path. CLI supports
SHOPNEXT_PUBLIC_PATH when public is renamed to public_html. Missing SPA build is
503, not the Laravel welcome page or a fabricated working shop.

Application-owned endpoint inputs use FormRequests; mutating auth/settings/media
requests reject unknown fields. Read requests bound optional search text and do
not use arbitrary query input. Native Filament/Livewire/Sanctum/health endpoints
retain their framework validators and CSRF/auth stacks, not counterfeit business APIs.
Global headers/trust/body controls also wrap errors and CORS preflights.

## Authentication / authorization

Customer browser cookies and readable XSRF proof, no bearer token issuance or JWT
refresh. Secure HttpOnly host-only Strict session cookie; authentication regenerates
session identity, logout/password rotation revoke sessions. OTP is503 until an
approved provider integration. All model policies default-deny unknown actions.
66 independent legacy role/action policy cases are NOT66 HTTP business endpoints.

Filament admits active super_admin/admin/shop_manager; initial-change users can
access only their password profile, not the dashboard/settings. Native staff flood
limiter is IP-wide, persistent database cache, five attempts/minute, uniform lockout
before credential lookup. No remember-me or external avatar/font provider.

## Settings and audit

Settings allowlist: integration_secret, mail_password, sms_api_key, payment_api_key.
These are dormant configuration slots, not integrations. Laravel `encrypted` cast
protects each value at rest. The service exposes only key/isSet/constant masked DTOs;
it has no secret getter. Explicit nonempty newValue is the only rotation path.
Omitted/null/empty string means no write; secrets are not trimmed. Filament clears
newValue in finally AND dehydrate, including validation payloads; deferred updates
and save are tested in the same Livewire request. Never change this input to live
sync without re-testing secrecy. Hidden model values are defense-in-depth, not encryption.

Model observer records admin create/update/delete, model/table, subject, actor,
IP/time and before/after. Only explicitly safe metadata values are retained; unknown
fields default to [REDACTED]. Settings and password values are always redacted.
Uploads explicitly record a safe media event and delete the file if audit fails.
Settings writes/audit share a transaction. Bulk query-builder writes bypass model
events: future L2 services MUST NOT use them to mutate admin-owned domain records
without equivalent transaction-bound audit. Internal bootstrap/heartbeat SQL is not
a business-admin mutation. No generic log reader/business resource is exposed.

## Security and operational services

- Strict storefront script CSP uses self only; native Filament/Livewire alone has
  documented inline/eval exceptions. No runtime CDN/connect/font allowlist.
- Exact CORS origins, host allowlist, explicit proxy IP/CIDR trust; wildcard proxy
  trust is ignored. 3 MiB bodies; raster2 MiB/2048px, random names, re-encoded PNG.
- RichText/SanitizedHtml use locked Symfony HTML sanitizer on content/description
  model writes and reads. SVG/script/iframe/events/unsafe schemes are removed;
  non-rich text must still be escaped by renderers.
- Single scheduler callback uses database-cache overlap lock2min and calls the
  bounded worker in process (no proc_open/Supervisor/Redis requirement).
- Every tick enqueues QueuePulse and runs database queue:work --stop-when-empty
  --max-time=50 --timeout=40 --tries=3; heartbeat separates cron and processed pulse.
- deploy-check inspects actual runtime, config, DB, storage, queue and heartbeat.
- ZIP builder installs no-dev vendor fresh; inactive runner template is outside
  public. Offline activation uses hash-only private config, one-hour token and
  atomic single-use claim; authorized execution unlinks itself before migrations.

## Scope and acceptance

No L2 services, external calls, commercial Filament resources or data import.
Legacy Node/sql.js code is reference-only, excluded from releases. New encrypted
settings are supported; legacy plaintext settings need an explicit future importer,
not automatic decryption/fallback. Runtime CI is not browser, TLS or shared-host
certification. See [acceptance](ACCEPTANCE.md) and [CI](CI_RESULTS.md).


## Executed L2 cart/quote sequence (not an order/payment sequence)

```mermaid
sequenceDiagram
    participant Browser
    participant CartAPI
    participant CartService
    participant PricingService
    participant SQL
    Browser->>CartAPI: PUT items + optimistic version + CSRF
    CartAPI->>CartService: authenticated owner OR encrypted guest cookie
    CartService->>SQL: begin; lock owner/cart; check version
    CartService->>PricingService: validated IDs/quantities; locked mode
    PricingService->>SQL: settings shared; sorted SKU locks/current prices
    PricingService-->>CartService: exact economics, rounded integer DTO
    CartService->>SQL: replace item IDs/qty, increment version, commit
    CartAPI-->>Browser: persisted snapshot; new guest secure HttpOnly cookie if needed
```

```mermaid
sequenceDiagram
    participant Browser
    participant Auth
    participant CartService
    participant SQL
    Browser->>Auth: login + CSRF + guest cookie
    Auth->>Auth: credentials, customer/active checks, rotate session
    Auth->>CartService: merge persisted guest into owned account
    CartService->>SQL: begin; user lock; sorted cart locks; validate combined quantities
    alt valid whole merge
        CartService->>SQL: write account; delete guest; commit
        Auth-->>Browser: authenticated + merged; expire guest cookie
    else business limit/stock conflict
        CartService->>SQL: rollback entire merge (both carts/versions preserved)
        Auth-->>Browser: authenticated + explicit conflict/errors; retain guest cookie
    end
```

Forced password rotation defers merge; cart APIs enforce active customer permissions.
Wallet primitives lock user rows/current SUM and append entries, never update the old
balance snapshot. They require a caller transaction and do NOT mark orders paid.
Order/reservation/payment/expiry sequences are intentionally NOT claimed implemented;
those are the next L2 concern, with stock/coupon/ledger changes in one transaction.


## L2 transactional boundaries

```mermaid
sequenceDiagram
    participant UI as Cookie/CSRF storefront
    participant API as Checkout FormRequest/policy
    participant TX as Checkout transaction
    participant SQL as InnoDB
    UI->>API: owned cart version/address, method, coupon, idempotency key
    API->>TX: validated intent (NO client money)
    TX->>SQL: owner mutex; account cart; existing-key intent lookup
    alt same key and intent already committed
        SQL-->>UI: original immutable order
    else new intent
        TX->>SQL: lock rules/coupon; sorted product/variant rows
        TX->>TX: shared exact PricingService reprice/validate
        TX->>SQL: order/items/address/pricing snapshots; stock/coupon reserve
        opt FULL wallet
            TX->>SQL: authoritative ledger debit + paid state atomically
        end
        TX->>SQL: actor event + audit; clear cart/version; COMMIT
        SQL-->>UI: authoritative order (manual methods still unpaid)
    end
    Note over TX,SQL: Any failure rolls back ALL effects; deadlock retry bounded5
```

```mermaid
sequenceDiagram
    participant Actor as Owner / authorized staff / scheduler
    participant L as OrderLifecycle transaction
    participant SQL as InnoDB + append-only journal
    Actor->>L: named allowed action, reason/validated receipt
    L->>SQL: sorted owner/actor mutexes, order lock; fresh auth/state/expiry
    alt card receipt
        L->>SQL: private sanitized raster reference; pending_verification
    else admin confirms COD collection/card receipt
        L->>SQL: paid + actual paid amount; reserved coupon to redeemed
    else cancel / expire / refund
        L->>SQL: once-only stock release; unpaid quota release
        opt actually paid
            L->>SQL: actual paid amount credited once to wallet; redeemed coupon retained
        end
    end
    L->>SQL: actor timeline + audit; COMMIT
    Note over L,SQL: Repeated paid/refund/release has no repeated financial effect
```

Advisory cart prices are not reservations. Checkout's owner mutex serializes own
idempotency keys; missing-key lookup is deliberately NOT a next-key FOR UPDATE
range lock across buyers. Real separate processes/connections exercise stock,
coupon, wallet, paid replay and cancel/pay races on committed data in every SQL job.
Frontends never calculate totals; signed rounding reconciliation is part of invoice
projection. Private receipts never travel through public media routes. Cron enqueues
bounded100 expiry +100 COD-warning candidates, rechecked while locked. No persistent
worker/Redis/Supervisor is required. Production cron/hard timeout is UNVERIFIED.


## L3a authorized, in progress — shell slice
Panel locale is fa through scoped persistent AdminLocale middleware; storefront/API
locale is not globally changed. Custom Vazirmatn explicitly uses LocalFontProvider,
never Filament's custom-font CDN fallback. Cron stays lazy/read-only and checks
permission inside status(), not only menu visibility. Six-role/Persian/query-bound
regressions executed in CI39724414478 ALL7 green on98cfd43. No new business resource yet.
Full action/status plan and date-picker evaluation: ADMIN_PANEL.md.

## L3a taxonomy service foundation — not a finished editor

Categories owns category mutations behind fresh per-transaction role checks,
a taxonomy SQL mutex, explicit policy and actor-aware transactional audit. No
Filament write bypass or category screen is introduced in this service sub-step.
SafeUpload raster output can be referenced only when the local media file exists;
free-form URLs, SVG and path traversal are rejected. Parent labels are eager-loaded
on30-record pages. SEO metadata is stored only (no L4-L6 SSR injection). Service and actual category editor
runtime validation passed CI39734575452/39734581936. Brands now adds shared
CatalogAccess (fresh actor + taxonomy mutex) and CatalogAudit (transaction-required,
default-redacted actor audit); new brand-service runtime verification is pending.

## L3a attributes — domain sub-step, not a finished screen

Attributes service owns master/term CRUD with product-management policies,
CatalogAccess fresh actor locks and taxonomy mutex, CatalogAudit actor/redaction,
scoped uniqueness and cross-owner validation. Existing terms prevent unsafe master
type changes; product usage protects term deletion. New SQL composite ownership and
hex constraints complement (not replace) Persian service validation. Attribute
screens, product assignment/matrix, media registry and stock actions are not
implemented by this service sub-step. Runtime status remains pending its own CI.

## L3a product metadata foundation — pending runtime

Products metadata service uses CatalogAccess actor/mutex, policy checks and explicit
atomic CatalogAudit for create/update/soft-delete/restore. Inventory is prohibited
in this contract; zero new stock uses the existing SQL default. CatalogInput rejects
float/exponent/decimal coercion, normalizes Persian/Arabic digits to canonical
bounded Toman integers. Product now sanitizes the actual full_description column
(the legacy description alias remains compatible). CatalogPublication centralizes
effective UTC schedule/trash availability for catalog and pricing, without changing
financial fractions, tax/coupon/shipping/wallet/order mechanics or inventing a cron
publish mutation. Matrix, content graph, bulk actions and UI remain next sub-steps.

## L3b order-admin read boundary (implementation, runtime pending)

Separate panel capability namespace leaves legacy/customer API authorization
unchanged. Read service fresh-authorizes and uses explicit projections, not raw
Order/User serialization. Support sees masked phones and no address/receipt paths;
admin/manager receive allowlisted immutable address data. Item snapshots are
scalar-allowlisted; items and actor timeline paginate independently. List filters
bind parameters, use existing Jalali→UTC picker, and paginate30 rows without
per-order relationship lookups. No financial writes in this slice.
