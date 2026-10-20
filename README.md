# Shopnext / Digistyle — Laravel migration

Persian RTL React/Vite storefront retained from the Stitch prototype. The owner
approved replacing Node/Express/sql.js with Laravel/MySQL + Filament on ordinary
PHP shared hosting. **Launch: NO-GO. L2 is NOT approved.**

## Actual status (2026-10-20)

- **L0 preparation implemented:** history-preserving source relocation, legacy
  regression suite retained, React admin archived, specifications/hosting runbook.
- Storefront fonts/icons are self-hosted with upstream licenses and hash checks.
  Original external photographs could not be downloaded; 23 distinct embedded
  image URLs now use a visibly labeled local placeholder. This is **not** a full
  image mirror or pixel-identical photography. See [asset inventory](client/assets/README.md).
- **L1 NOT implemented / runtime blocked.** `backend/` contains a status README,
  not a Laravel application. No Composer lock/vendor, MySQL migrations, Sanctum,
  Filament, scheduler, deploy-check or Pest execution exists yet.
- Sandbox has no system PHP/Composer/MySQL. A temporary PHP 8.3.31 was obtained
  outside Git but lacks pdo_mysql; dependency resolution is blocked by network
  access restrictions. Do not substitute legacy/SQLite results for MySQL tests.

## Layout

```text
client/                React/Vite storefront + shared legacy client contracts
backend/               reserved Laravel destination (not scaffolded)
legacy/server/         archived Express/sql.js backend, entry index.ts
legacy/tests/          isolated 171-case Phase A regression suite
legacy/client-admin/   former React admin source; not a runnable build target
legacy/shared/         frozen legacy TypeScript contracts
client/assets/         font provenance and original external-image inventory
client/public/         local fonts/licenses and explicit image placeholder
```

Node 22.22.3 and Bun 1.4.3 were used. Only `bun.lock` is authoritative; do not
introduce a second package lock. From the repo root:

```bash
bun install --frozen-lockfile
npm run typecheck       # both storefront + legacy; not PHP/static analysis
npm test                # 3 static asset tests + 171 legacy tests; NOT Pest
npm run build           # storefront only => client/dist/
npm run dev             # Vite storefront only, 0.0.0.0; no API backend
npm run test:legacy     # isolated legacy regression suite only
```

`npm run lint` is an alias for TypeScript checking, not ESLint/Pint. There is no
root production `start` command. The retained storefront still expects the legacy
API/auth transport and has non-auth demo fallbacks: a rendered page is not a working
Laravel shop. `/admin` is not yet Filament. Do not deploy the archived Node server.

Latest real code verification: **3 asset tests + 171 legacy tests passed**;
both typechecks/build passed. JS 533.87 kB (gzip 136.61), CSS 62.59 kB (10.68),
HTML 2.00 kB (0.88); one >500 kB chunk warning remains. No browser/TLS/RTL/provider
or Laravel/MySQL acceptance is claimed.

## Required foundation (L1 outstanding)

Target PHP **8.3**, minimum **8.2**: Laravel 12 compatibility line, Filament 5 subject
to real Composer resolution. Laravel 13 requires 8.3 so cannot preserve the 8.2
floor. MySQL/MariaDB with constrained migrations, integer **Toman**, Sanctum stateful
cookie/CSRF auth, six-role server policies, encrypted settings, database queue and
minute cron; no Redis/persistent workers/Docker/root on host. OTP remains 503 until
real transport. No pricing/checkout/payment/SMS or business Filament resources now.

## Read first

- [Replacement specification / every audit finding as a required test](docs/SPEC_FROM_LEGACY.md)
- [Shared-host deployment, no-SSH alternative, queue/cron and offline install](docs/HOSTING.md)
- [Architecture and actual vs target state](docs/ARCHITECTURE.md)
- [Database / proposed ER and deletion rules](docs/DATABASE.md)
- [Security status and outstanding acceptance](docs/SECURITY.md)
- [L0 verification evidence](docs/L0_RESULTS.md), [changelog](docs/CHANGELOG.md), [agent handoff](AGENTS.md)

[Historical audit](docs/AUDIT_REPORT.md), [Phase A security](docs/SECURITY_FOUNDATION.md),
[legacy architecture](docs/ARCHITECTURE_LEGACY.md) and
[legacy schema](docs/DATABASE_LEGACY.md) are retained as evidence. Their old paths,
Node JWT behavior and approval wording do not describe the new target stack.
