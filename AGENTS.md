# Shopnext handoff — L2 in progress, 2026-10-21

## Latest owner continuation (2026-10-21)
-745c526 checkpoint approved; continue ALL remaining L2 before l2-complete/L3 gate.
- Latest explicit COD clarification supersedes the older pending-COD exception:
  ALL COD exempt from30-minute expiry. Owner chose configurable7-day no-shipment
  auto-FLAG for admin, NEVER auto-cancel. Admin explicit cancel restores stock.
- Current unverified change: Checkout one transaction with idempotent intent, owned
  cart/version/address, locked shared PricingService, stock/coupon reservation,
  immutable SQL snapshots, append-only actor timeline and atomic full-wallet start.
  PaymentMethod is domain interface only; no external adapters. Checkout d532f0e
  CI39594655416 passed all7 jobs (199/6662 each). Lifecycle bf11063
  CI39595334260 passed all7. Order/receipt API9205c58 CI39596445555 passed all7
  after fixing cached test RequestGuard identity between distinct browser actors.
  Real parallel harness3a41437 CI39597673255 passed ALL7, five races EACH database/PHP.
  Evidence docs/ci/l2-real-concurrency-verified-matrix.json +six CI proof artifacts.
  Current read-only catalog IDs integration (for financial frontend) CI pending.
- Next concerns after FULL green: lifecycle/cancel/refund/paid/expiry; real parallel
  workers; order APIs/receipt/manual approvals; storefront wiring; final docs/tag.

## Standing rules / gate
- Fixed branch arena/c101d8c3-shopnext ONLY. Small commits; push and inspect FULL
  green CI after EVERY commit before next concern. Read red logs/annotations and
  fix without test bypass. Unexecuted = UNVERIFIED. Never print secrets.
- L1 completed/tagged l1-complete on7acd649; owner explicitly APPROVED L2.
  Implement the financial core/manual methods/API/minimal storefront financial wiring.
  NO gateway adapters, SMS integrations or Filament business resources. Final L2
  requires full matrix green and l2-complete tag, THEN stop for L3 approval.
- Latest approved rounding: exact rationals through auto/fixed-coupon allocation/VAT;
  round once per final line. Integer coupon allocation DISPLAY ONLY; signed explicit
  rounding_adjustment. Two1-Toman lines auto50% +fixedcoupon1 ->final0, not1.
- Latest approved merge: login succeeds on limit conflict; preserve BOTH carts,
  all-or-nothing merge rejection and explicit conflict; checkout valid account cart only.
- docs/PRICING.md records other approved pricing, full-wallet/manual/COD/expiry defaults.
  No tariffs/zone mapping supplied: fail closed. L2 is NOT complete. Money04cdcab
  CI39578549164 and schema66b2187 CI39579280000 both seven-job SUCCESS. This new pricing
  checkpoint4a76d51 passed CI39581254064 (7/7 green, each matrix173/6437). Pending: cart/login merge, order/reservation,
  wallet/order integration, manual payments, expiry, APIs/UI, real concurrency.
- Legacy users.wallet_balance is an IMMUTABLE OPENING SNAPSHOT, not live balance.
  New User accessor uses Ledger SUM, so AuthController identity now reports live balance.
  Ledger primitives63088db passed CI39582169761 (7/7, each matrix180/6482).
  Exact recorded evidence: docs/ci/l2-wallet-primitives-verified-matrix.json.
  Ledger does NOT mark paid/refunded or orchestrate stock/coupon/order transitions.
- Current change: CartService +login/register merge (secure token HASH persistence,
  optimistic versions, all-or-nothing preserve-both conflict, explicit auth/cart DTO).
  Cart domain/login8080bfe passed CI39583400561 (7/7, each matrix187/6525).
  First2202ee7 was red only because JSON test omitted withCredentials; fixed fixture,
  not production cookie encryption or assertions. Forced password rotation defers merge.
- Current change: CartRequest/CartController, named throttle and CSRF-protected
  GET/PUT /api/cart, POST /api/quote, authenticated POST /api/cart/merge retry;
  Secure HttpOnly host-only Strict guest cookie issued on first successful mutation.
  Tests enforce real CSRF and browser cookie readback.03238d6 passed CI39584222988
  (7/7 SUCCESS, each matrix192/6615); evidence docs/ci/l2-cart-api-verified-matrix.json.
  Storefront financial wiring and order/checkout APIs remain NOT implemented.
- Current hardening: financial JSON bound30,000 bytes, Money requires64-bit PHP,
  deploy-check integer64 and Persian cart validation messages.8178a52 passed
  CI39584953220 (all7 SUCCESS, each matrix193/6619); exact evidence recorded in
  docs/ci/l2-pricing-cart-wallet-hardening-verified-matrix.json.
- Before final L2: complete exact concurrent wallet/stock/coupon
  tests and all outstanding lifecycle/API/UI/docs. Do not create l2-complete early.
- Actual browser/host/TLS/RTL/a11y/backup restore UNVERIFIED. The tag is an
  implementation checkpoint, NOT launch/commerce certification.

## Executed evidence
- Code1c0d09c, run39539510764:7 jobs SUCCESS;160 Pest/1028 assertions per EACH
  PHP8.2/8.3 × MySQL8.0/MariaDB10.6/11.4, Pint/fresh/down/up/real SQL.
- Runtime8.2.34/8.3.35, DB8.0.46/10.6.28/11.4.13. GD+Imagick both exercised.
- Frontend Node22.22.3/Bun1.4.3:7 tests +171 archived tests, typecheck/build.
- PHP8.2/MySQL also fresh no-dev ZIP + extracted private/public HTTP + real pending
  migration via runner/self-delete/replay. TLS SIMULATED, not browser acceptance.
- docs/ci/l1-complete-verified-matrix.json and docs/CI_RESULTS.md contain exact
  observed links/results; final tagged commit's checks are in workflow history.
- Laravel12.70.0/Filament5.10.3/Sanctum4.3.3/Pest3.8.7/Pint1.30.4 actually resolved.
- No local Composer/MySQL/pdo_mysql substitute. Native local PHP/Pint tools (when
  available in /home/user/.cache/shopnext-tools) provide syntax/style only.
- gh run watch --exit-status through start_process, then wait_for exit. Logs ZIP
  redirect may be blocked; use gh api check-runs/JOB_ID/annotations (bounded output
  includes failures/Pest summaries/runtime/migration/package smoke). Do not claim
  success from workflow presence alone. workflow_dispatch permission previously403.

## Source map
- backend/database/migrations + docs/LEGACY_SCHEMA_MAP.json:14 tables175 mapped
  columns, normalized items/pivots/composite FKs, UTC DB sessions, canonical Toman.
- Models/User, Support/Permissions, Policies: guarded role/flags, all18 default-deny
  model policies,66 independent role/action POLICY cases (NOT business endpoints).
- AuthController/AuthRequest/CookieOnly, client/src/lib/authFetch.ts: real cookie/
  CSRF lifecycle, no bearer/JWT/demo fallback; separate login/OTP/password limits.
- Filament/Auth: staff native login/hidden remember, forced proof/rotation/revoke.
  StaffAuthTest includes persistent-cache flooding, same lockout before user lookup,
  correct-password blocking and decay recovery. No external avatars/fonts.
- Services/Settings, Data/SettingStatus, Models/Setting: encrypted cast; <=4096-byte
  nonempty newValue only, omitted/null/empty preserves; no getter, constant DTO.
  Reserved _admin_bootstrap_lock is a nonsecret SQL marker outside service keys.
- Filament/Pages/SecureSettings: deferred wire:model and save must share a request;
  finally+dehydrate clear secret. Never hydrate old values or use live input sync
  without equivalent success/validation/error snapshot secrecy proofs.
- Observers/AdminActivity: actor/IP/time/create-update-delete, safe-field allowlist,
  default redact before/after. No request bodies/secret values. Bulk query-builder
  mutations bypass events; future domain services MUST provide transaction audit.
  MediaController explicitly audits upload, deletes file if logging fails.
- Middleware: exact hosts, explicit proxy IP/CIDRs (no wildcard/forwarded Host),
  StrictCors,3MiB body cap, CSP/error headers. Native admin/livewire CSP has scoped
  inline/eval exception; storefront scripts self only. Never relax all routes.
- MediaRequest/SafeUpload:2MiB/2048px raster MIME+extension+image validation,
  re-encode GD or Imagick to random PNG in private storage, /media fallback.
  SVG/executables blocked; no public upload execution. RichText/SanitizedHtml
  protects rich content/description on write AND read, not arbitrary plain fields.
- Console/CronTick, QueuePulse, Heartbeat, CronHeartbeat: one schedule:run cron,
  DB overlap lock2min, in-process bounded worker50s/timeout40, actual queued pulse.
  No Redis/proc_open/Supervisor/root/persistent-worker requirement. max-time is NOT
  a hard kill of a hung job; L2 provider jobs need I/O deadlines/idempotency.
- DeployHealth/DeployCheck: actual PHP/exts incl bcmath/gd-or-imagick, write probes,
  env/key/debug/origin, DB/version, cron/pulse, failed/overdue/stuck queue, storage
  symlink OR validated private delivery. Generic credential-safe diagnostics.
- tools/build-deploy.sh: committed HEAD only, no-dev vendor, local SPA+Filament
  assets, private app/public ZIP; real .env/uploads/test/legacy excluded.
- OneTimeMigrator + operations stub + local activate/invoke helpers: POST/native
  HTTPS/header256bit token/hash-only1h activation, atomic claim, unlink BEFORE
  operation, consume on failure, no redirect/token stdout/query. Inactive by default.
  Helper requires sibling app/public and local token outside both; no overwrite.
- tools/ci/deploy-smoke.py: actual ZIP/HTTP/fixture migration proof; CI-only HTTPS
  simulation never packaged. Generated ZIPs/cache/bytecode must stay ignored.

## Invariants / manual limits
- Integer Toman/UTC; financial history RESTRICT; addresses/sessions/membership safe
  cascade; SKU unique separately in product/variant namespaces. No live data import.
- __Host session Secure/HttpOnly/Strict/Path=/, no Domain; readable XSRF.120min
  session idle, NOT old JWT timing.14+ new password chars and <=72 bcrypt bytes.
- Staff active first3 roles; settings/logs only super_admin/admin; forced users
  profile only until proof. Customer /admin denied. No universal super_admin bypass.
- Legacy plaintext settings cannot be inserted into encrypted contract; future
  importer must be explicit. Persist/back up APP_KEY; never regenerate existing key.
- Host CLI/web PHP equivalence, exact proxy IPs/TLS/permissions/PCNTL/process limits,
  no-terminal FTP and key/DB/media restore are UNVERIFIED until owner checklist.
-23 original photos were NOT mirrored: placeholders explicit. Existing storefront
  catalog/account/checkout mocks are not trusted backend services. Legacy code is
  reference-only, excluded from build. Never start/deploy the archived Node server.

Read README, ARCHITECTURE, DATABASE, SECURITY, HOSTING, ACCEPTANCE, CI_RESULTS and
L1_AUTH before changing scope. Historical PhaseA/L0 docs are not current approval.


## Current L2 gate (already authorized; do not ask for L2 again)
- API9205c58 CI39596445555 ALL7 green. Real concurrency3a41437
  CI39597673255 ALL7 green: five real separate-process races EACH of six SQL/PHP
  jobs, 215 backend tests/job. Evidence docs/ci/l2-real-concurrency-verified-matrix.json.
- Read-only real SKU catalog1f952f1 CI39598522400 ALL7 green. No catalog management.
- Current concern: minimal financial frontend API wiring, not a redesign. No seeded
  cart, local money authority, fake paid state, fake wallet charge/loyalty conversion,
  fake financial write success, or fabricated legal invoice IDs. HTTP request/store
  unit tests use explicit fetch doubles: NEVER call them SQL/browser/concurrency proof.
  Local client typecheck/build/12 tests and archived typecheck/171 tests executed green;
  full seven-job CI for THIS concern must pass before the next concern.
- Remaining: final SPEC financial finding coverage/named regression reconciliation,
  PRICING formulas/examples + sequence diagrams, DATABASE/ARCHITECTURE/CHANGELOG/
  evidence/acceptance consolidation, final complete matrix, then l2-complete tag.
- Existing owned saved addresses + configured shipping data required; no fabricated
  address/region/tariff. Business CRUD, gateways, SMS remain out of scope. Disabled
  prototype account controls must never claim writes. Host/browser/TLS/RTL/a11y/
  recovery still UNVERIFIED; no production-commerce acceptance claim.
- After every commit wait for ALL7 backend.yml jobs GREEN. Never bypass a red.
- Final l2-complete only after acceptance; stop for L3 authorization then, not before.
