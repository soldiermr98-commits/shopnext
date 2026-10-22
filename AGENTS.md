# Latest continuation — Jalali integration, not L3a completion

- Process gates/artifacts verified. Atomic race-result publication fixed actual
  partial-JSON read; original five real SQL races and all financial assertions intact.
- ONE candidate runtime trial GREEN:85db44e, CI39728458608 (eight gates+trial).
  Twelve shipped-JS selection/midnight/timezone cases, Livewire SQL save/reload25
  assertions. Retain ariaieboy/filament-jalali3.1.0; no second package trial.
- Composer-generated production lock captured/verified from CI39730442729:
  SHA256 d5edf8d6dc1944ddac6829f743caa33e24e7738b669ccf7d48886e9a82091138;
  only ariaieboy/filament-jalali3.1.0 and ariaieboy/jalali1.1.0 added. Existing
  versions unchanged. Temporary resolver/trial jobs removed, original eight remain.
- Current integration commit adds AdminDate field/column/infolist helper and
  permanent regression tests. Runtime status PENDING until its CI is inspected.
- Continue without owner checkpoint approval: after ALL8 green, taxonomy (categories
  first, then brands and attributes/terms) -> products -> media -> stock adjustments.
  No business catalog/media/stock action implemented yet; no completion tag.
- Host, end-to-end browser, visual RTL, a11y, TLS and restore remain UNVERIFIED.

# Shopnext handoff — L3a in progress, 2026-10-22

## Current state and authorization — L3a active, 2026-10-22
- Owner approved L2 and authorized ONLY L3a foundation/catalog; STOP after verified
  l3a-complete and request approval before L3b-L3e. No L4-L6 gateway/SMS/OTP or
  credential pages, SEO server-side injection or deployment authorization.
- Fixed ACTIVE branch arena/b4d40ed7-shopnext, based on merged main686e57f.
  Never use the old merged session branch or push directly to main.
- L2 immutable l2-complete=5120dad, CI39602866142 ALL7 success,218 tests/job.
  All financial contracts in docs/PRICING.md and L2_ACCEPTANCE.md remain binding.
- Every small commit MUST pass all eight backend.yml jobs (fast style + six PHP8.2/8.3 x
  MySQL8/MariaDB10.6/11.4 plus frontend) before the next concern. Red -> diagnose
  and fix without bypass. Unexecuted = UNVERIFIED; never print secrets.
- Every panel screen/action/widget must have a real service/policy and Pest test,
  per six-role legacy matrix. Maintain docs/ADMIN_PANEL.md action/test inventory.
  No fake success or stock/wallet/order-total/status field editing. Stock/wallet
  adjustments require reason/actor/audit; order changes use OrderLifecycle.
- L3a: shell, categories/tree/reorder/SEO/image, brands, attributes/terms, products
  (all four types, variants/matrix, relations/content/SEO/schedules/bulk actions),
  media/folders/replace/alt/usage protection; catalog soft delete/restore.
- Persian/RTL/local Vazirmatn, Persian digits/Toman/Jalali edge conversion; Gregorian
  UTC storage. Jalali3.1.0 passed ONE actual runtime trial on Filament5.10.3; metadata alone
  is NOT runtime/browser compatibility. No unreviewed new CDN/dependency.
- No N+1, bounded/paginated lists, deferred heavy widgets. Safe validated media,
  queued WebP/thumbnails plus safe sync fallback; no SVG/executables/in-use delete.
- End L3a: README/ARCHITECTURE/DATABASE/ADMIN_PANEL/CI_RESULTS/CHANGELOG/AGENTS,
  exact CI evidence, REAL/test table and UNVERIFIED list; then tag and STOP.
- Shell98cfd43 CI39724414478 ALL7 green,226 tests/job and6844/6845 assertions;
  all5 real L2 races executed per job. docs/ci/l3a-shell-verified-matrix.json.
- Owner approved06c0371 shell and instructed CONTINUE L3a to completion, no new
  approval between concerns. First process fix: fast independent Pint --test job,
  matrix gated on it, redacted logs/artifacts/summaries. This adds an eighth job;
  preserve original six SQL/PHP +frontend gates and require ALL8 green.
- Jalali candidate gets ONE runtime iteration only. If not green, fall back to
  Jalali read-only display +standard Gregorian picker with adjacent Jalali preview;
  document tradeoff. No iterative dependency troubleshooting.
- Implementation order NOW: taxonomy -> products -> media -> stock adjustments.
  Stock still NEVER editable directly; reasoned service actions only. Do not reorder
  scope based on older plans. Resources/actions need tests and ADMIN_PANEL rows.
  No resources/stock services/Jalali picker complete yet. Do NOT tag L3a.
- Pint can use --format=agent through tools/ci/pint-check.sh; --test exit retained.
  JSON lacks final newline: annotation MUST start a fresh line. Prior missing
  diagnostics were transport, not waived tests. Exact fixed style rule was
  self_static_accessor in final CronHeartbeat. Native local PHP/vendor absent;
  no local PHP runtime proof. ZIP logs can EOF; use check-run annotations.
- Host/browser/TLS/RTL/a11y/restore remain UNVERIFIED. Respect L2 exact rational
  pricing, full wallet/manual methods, ALL COD minute-expiry exemption,7day warning
  only, preserve-both cart conflicts and fail-closed unconfigured shipping.

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
