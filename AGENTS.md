# Agent handoff — Shopnext / Digistyle

## Active task / approval boundary
- Fixed branch `arena/c101d8c3-shopnext`; never switch/create another branch.
- Owner approved L0 + L1 Laravel migration, superseding old Phase B stop.
- L0 source separation/docs/static asset preparation implemented; **L1 NOT started
  as a Laravel application**. Stop before L2; no pricing/checkout/payment/SMS or
  business Filament resources. Production remains NO-GO.
- Read code before editing, English specs/Persian user communication, small commits,
  real tests after changes. Never print secrets or count Node tests as MySQL/Pest.

## Current layout / commands
- client/: React/Vite storefront, shared/types.ts; no active React admin routes.
- legacy/server/: archived Express/sql.js code (index.ts entry); legacy/shared copy.
- legacy/tests/: 171 isolated Phase A regression cases, random fixture secrets.
- legacy/client-admin/: archived UI, not compiled/runnable as a separate app.
- backend/: README only; no artisan/composer.json/lock/vendor/migrations/Pest yet.
- bun.lock only; Node22.22.3/Bun1.4.3 verified. bun install --frozen-lockfile.
- npm run dev/build: storefront only. No root start/API backend/Filament yet.
- npm run typecheck: client + legacy. lint alias is not ESLint/Pint.
- npm test: 3 local-asset checks + 171 legacy tests. test:legacy selects old suite.
- Latest build JS533.87kB/gzip136.61, CSS62.59/10.68, HTML2.00/0.88; >500kB warning.
- No live preview, browser/TLS/RTL/a11y/provider verification has been performed.

## L1 blocker / next step
- System PHP, Composer and MySQL absent; temporary native PHP8.3.31 outside Git at
  /home/user/.cache/l1-tools/php/php works but lacks pdo_mysql. Cache may not persist.
- Allowed egress excludes Packagist/getcomposer.org; GitHub release-assets download
  failed. No resolved Composer lock/vendor or MySQL service. Do not fake those.
- Need usable PHP8.2/8.3+pdo_mysql, Composer dependency resolution/cache and isolated
  MySQL/MariaDB test DB (or verified external CI execution). L1 remains incomplete
  until scaffold/features/actual Pest tests exist. Do not deliver untested claims.
- Laravel13 requires8.3, incompatible with mandated8.2 floor. Plan Laravel12 PHP^8.2
  target8.3 + Filament5, subject to actual Composer resolution/platform matrix.

## Required constraints
- Shared host: PHP/MySQL/real minute cron. No Redis, persistent workers, Supervisor,
  Docker/root on deployment host. Database queue; bounded --stop-when-empty
  --max-time=50 per minute, overlap lock. max-time is not a hard per-job timeout.
- All required host extensions owner-confirmed (intl/mbstring/pdo_mysql/openssl/
  ctype/json/tokenizer/xml/fileinfo/zip/curl/gd-or-imagick). SSH and proc_open unknown.
- Discover full CLI binary via private cron; may differ from web PHP. App private,
  only public exposed, host-agnostic terminal and no-SSH artifact/cron deployment.
- Money integer Toman, gateway Rial conversion later. No invented tax/shipping rules.
- Sanctum session/CSRF replaces legacy JWT/refresh; client transport not ported yet.
- Six-role policy matrix: super_admin/admin all existing resources; shop_manager
  dashboard/products/orders/customers, NOT settings/logs; remaining3 denied.
- Settings encrypted, masked/isSet read DTO, explicit newValue writes, never log/echo.
- OTP503 until real SMS; env-only bootstrap/no defaults/force password change.
- MySQL FKs/uniques/checks/indexes, RESTRICT ordered product/customer, dev-only seeds.
- deploy-check + real scheduler heartbeat + Filament shell widget required in L1.

## Local assets / known limits
- Vazirmatn and Material Symbols vendored, licenses/hash provenance in client/assets.
- 23 original remote image URLs inventoried but NOT mirrored; active source uses
  explicit local SVG placeholder (including former avatars/banners). Do not claim
  photography preserved. Need licensed owner-approved local replacements.
- Future API media/old persisted cart URLs still need same-origin validation.
- Legacy financial/state/persistence flaws and mock business panels remain; no
  Laravel launch, migration, providers, credential rotation or owner-data deletion.

## References / precedence
- docs/SPEC_FROM_LEGACY.md: full L1 contract + all29 audit findings as required tests.
- docs/HOSTING.md: constraints/deploy/no-SSH/private cron/offline/deploy-check plan.
- docs/ARCHITECTURE.md, DATABASE.md, SECURITY.md: actual vs target, ER, security.
- docs/L0_RESULTS.md, CHANGELOG.md: executed evidence vs outstanding work.
- *_LEGACY.md, AUDIT_REPORT.md, SECURITY_FOUNDATION.md: historical evidence. Old
  server/src/test paths map into legacy/client; old approval wording is superseded.
