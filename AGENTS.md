# Shopnext handoff — current 2026-10-21

## Rules / scope
- Fixed branch arena/c101d8c3-shopnext only; no new/switch branches.
- Owner approved L0+L1. Stop before L2; no pricing/checkout/payment/SMS/business
  Filament resources. Current work: L1a + auth/roles/Filament slice of L1b verified.
  Overall L1 remains incomplete; NO-GO. User's last message ended at Staff: Filament.
- Small commits. AFTER EVERY COMMIT push and wait for full CI green BEFORE next
  concern. Red: read actual failure annotations/logs and fix, don't bypass tests.
- Read code first, never print secrets. English specifications/Persian conversation.

## Verified runtime and tests
- .github/workflows/backend.yml: PHP8.2/8.3 × mysql8.0/mariadb10.6/mariadb11.4; real
  services/extensions, cache+locked Composer, Pint, fresh migration and Pest. Frontend
  frozen Bun, typecheck,7 Node tests +171 legacy tests, build. No skip/fail-optional.
- Code531d4e9 green run39506373318:131 Pest/728 assertions in EACH six-way job.
  Actual runtimes8.2.34/8.3.35; MySQL8.0.46, MariaDB10.6.28/11.4.13.
- Actual lock framework12.70.0, Filament5.10.3, Sanctum4.3.3, Pest3.8.7, Pint1.30.4.
- Local /home/user/.cache/shopnext-tools/{php,pint}: nativePHP8.3.31/Pint1.30.4,
  syntax/format verified. Still no local Composer/MySQL/pdo_mysql. Tests run in CI.
- gh run logs redirect blocked outside allowlist. Fetch /actions/runs/ID/jobs and
  /check-runs/JOB_ID/annotations with gh api. Bounded annotations include full Pest
  root failures, counts, runtime. Use start_process gh run watch then wait exit.
- workflow_dispatch API403 from integration; normal git push works. CI-generated
  lock was verified via a no-op push commit because GITHUB_TOKEN pushes don't start
  push workflows. Never claim unexecuted automatic CI for bot commits.

## Source map
- backend/database/migrations/: ordered full schema; docs/LEGACY_SCHEMA_MAP.json maps
  every175 legacy column, test re-reads original DDL and asserts actual DB columns.
- app/Support/{Permissions,Phone}: fixed6-role matrix, phone normalization.
- app/Policies/: all18 application models explicitly mapped; unknown actions denied,
  no super_admin universal bypass; initial-change/inactive gates, owner read policies.
- app/Http/{Controllers/AuthController,Requests/AuthRequest,Middleware/CookieOnly}:
  actual auth endpoints; role/flags not fillable; global Sanctum token retrieval off.
- app/Providers/Filament/AdminPanelProvider, app/Filament/: native staff login,
  password-only profile and gated dashboard. No resources. Local avatar/default
  bundled font; artisan filament:assets required (CI publishes, generated ignored).
- app/Console/Commands/ProvisionAdmin: private env-only first admin, transactional
  nonsecret settings lock, no resets/default passwords, must-change flag.
- client/src/lib/authFetch.ts: Sanctum CSRF/credentials, one419 retry, no401 refresh;
  client/tests/auth-transport.test.mjs + offline.test.mjs are7 native Node tests.
- legacy/: archived Express/sql.js, frozen contracts,171 independent tests; admin
  reference excluded from active build, not runnable separately. Never deploy.

## Critical invariants / limits
- Money integer Toman throughout; CHECK rejects RIAL transactions. FK RESTRICT
  financial history; immutable item snapshots; variants/returns have composite FKs.
- SKU uniqueness per products/variants table (separate namespaces, not global).
- Cookie __Host-shopnext_session HttpOnly/Secure/Strict/no Domain; readable XSRF.
  Web CSRF stack always applies to auth routes; no Bearer or personal token issuance.
  Test EnforcedCsrf overrides Laravel unit-test bypass. Session config120min idle,
  not old JWT15min/refresh7days. Password14+chars,<=72bytes, old proof required.
- Super_admin/admin/manager: dashboard/products/orders/customers; settings/logs only
  super_admin/admin. content_editor/support/customer denied privileged matrix.
  Filament admission only active first3 roles; first-login profile allowed, dashboard
  and privileged models gated until change. Remember-me hidden/non-dehydrated.
-66 independent POLICY matrix tests, NOT11 implemented business HTTP endpoints.
  Native staff flood/browser TLS/network/RTL/a11y acceptance UNVERIFIED.
- Secret model $hidden is NOT encryption. Settings casts/endpoints/masked newValue
  DTOs, activity logging, security headers/CSP/CORS/proxy/upload perimeter, deploy-check,
  bounded cron/queue/heartbeat widget STILL PENDING. No L1 completion claim.
- Shared host target8.3/min8.2, confirmed extensions, real cron; no Redis/persistent
  workers/Supervisor/Docker/root. CLI vs web PHP/proc_open/SSH/symlink unresolved.
-23 original remote images NOT mirrored; placeholders explicit. Dynamic media/old
  localStorage and catalog/account mocks remain. No real provider calls/data import/
  credentials rotation/deletion. Admin env must be removed after provision.

## References
README.md and backend/README.md current; docs/L1_AUTH.md, CI_RESULTS.md,
LEGACY_SCHEMA_MAP.json, DATABASE.md, HOSTING.md, SPEC_FROM_LEGACY.md.
Older audit/Phase A/L0 evidence retained but path/stack/approval claims historical.
