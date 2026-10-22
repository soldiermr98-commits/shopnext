# Shopnext handoff — L2 complete; main integration, 2026-10-22

## Current state and authorization
- L1 and L2 are complete implementation checkpoints. `l2-complete` is fixed at
  5120dadbb1a60cf91877165c4ac09e1dbd783b2b, CI39602866142 ALL7 SUCCESS.
  Each SQL/PHP job:218 tests,6789/6790 assertions (valid race outcome variation).
- docs/L2_ACCEPTANCE.md maps every financial finding, evidence and deferred scope.
- Owner authorized documentation refresh and PR merge into main, NOT L3 or deploy.
  Keep work on arena/c101d8c3-shopnext. Merge using an explicit numbered GitHub PR;
  never switch to or push directly to main. Do not move the completion tag.
- After each commit wait for ALL7 backend.yml jobs green before another concern;
  a red must be diagnosed/fixed, never bypassed. Read before writing; no secrets.
- Five REAL separate-process/connection same-DB scenarios run in each SQL/PHP job.
  Frontend fetch doubles are not SQL concurrency or rendered-browser evidence.
- Integer Toman, exact fractions through discounts/VAT, final-line half-up only;
  largest-remainder components are DISPLAY ONLY; signed rounding_adjustment.
- ALL COD exempt minute expiry; configurable default7day unshipped admin FLAG,
  NEVER automatic cancellation. Default non-COD unpaid/verification expiry30min.
- Full wallet only; no mixed payments. COD/card need explicit authorized payment
  confirmation; delivery never means paid. Actual-paid wallet refund once; redeemed
  coupon usage retained. No gateway/SMS/loyalty formula/business Filament resources.
- Preserve BOTH carts on login merge conflict. Checkout only valid owned account
  cart/version/address; configured tariffs required. No invented zones/free shipping.
- Host/browser/TLS/RTL/a11y/backup restore remain UNVERIFIED; tag/merge is not launch
  certification. STOP after integration and await explicit L3 approval.

## Historical L1 evidence (current L2 evidence linked above)

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
-23 original photos were NOT mirrored: placeholders explicit. Financial storefront flows use authoritative Laravel APIs;
  other explicitly inactive prototypes are not trusted backend services. Legacy code is
  reference-only, excluded from build. Never start/deploy the archived Node server.

Read README, ARCHITECTURE, DATABASE, SECURITY, HOSTING, ACCEPTANCE, CI_RESULTS and
L1_AUTH before changing scope. Historical PhaseA/L0 docs are not current approval.
