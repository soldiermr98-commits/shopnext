# Shopnext — L1 foundation and L2 financial core

Persian RTL React/Vite storefront with Laravel 12, Sanctum and Filament 5 for
PHP shared hosting. **L1 and L2 implementations are CI-verified.**
The `l2-complete` tag points to `5120dad`; this is NOT production launch approval.
L3a foundation/catalog is now authorized and IN PROGRESS; later sub-phases need approval. [Financial coverage and limits](docs/L2_ACCEPTANCE.md).
Actual host/browser/TLS acceptance is **UNVERIFIED**: [run the checklist](docs/ACCEPTANCE.md).

## Implemented and executed

- Complete 14-table/175-column legacy schema mapping, normalized relations,
  FK/deletion/unique/CHECK integrity, integer **Toman**, UTC application and DB sessions.
- Customer cookie-only Sanctum/CSRF, login/password throttles, session revocation;
  OTP fails closed with 503. No JWT/bearer issuance or demo identity fallback.
- Six-role policies; native Filament staff login/flood lockout, forced initial
  password change, current-password proof and other-session revocation.
- Encrypted, write-only secret settings with constant masks/isSet; authorized
  Filament settings page. Empty/omitted newValue preserves the old value.
- Redacted admin model create/update/delete audit plus media-upload audit.
- Self-hosted CSP/security headers, strict CORS/host/proxy trust, 3 MiB body limit,
  validated/re-encoded raster uploads, SVG blocked, sanitized rich-text casts.
- Single scheduler cron, bounded database worker, queued heartbeat and dashboard
  stale warning; `php artisan deploy-check` with fail-closed readiness diagnostics.
- No-dev upload ZIP builder and optional, token-protected, self-deleting migration runner.

**218 Pest tests / 6,789–6,790 assertions in EACH of six real DB jobs**
at the tagged L2 gate ([CI39602866142](https://github.com/soldiermr98-commits/shopnext/actions/runs/39602866142)):
PHP 8.2/8.3 × MySQL 8.0 / MariaDB 10.6 / MariaDB 11.4. Frontend typecheck,
13 transport/store/formatter/local-asset tests +171 archived regressions and build pass separately.
The PHP8.2/MySQL job also builds/extracts the real ZIP and runs HTTP/runner smoke.
[CI links and evidence](docs/CI_RESULTS.md) · [Architecture](docs/ARCHITECTURE.md)
· [Schema](docs/DATABASE.md) · [Security](docs/SECURITY.md).

## L3a admin panel — in progress

Current slice: Persian/RTL shell, explicit local Vazirmatn and permission-gated
cron heartbeat. New code CI is pending; catalog/media/stock/Jalali controls are not
complete. [Screen/action/test inventory](docs/ADMIN_PANEL.md). No L3a tag yet.

## L2 financial implementation

- One exact rational integer-Toman pricing engine; server-only financial UI totals,
  VAT/coupon allocation and explicit signed rounding reconciliation.
- Versioned server carts, hashed guest tokens and preserve-both login merge conflicts.
- Atomic locked checkout, owned addresses, immutable snapshots, stock/coupon
  reservations and idempotent full-wallet or manual COD/card-to-card workflows.
- Once-only lifecycle/refunds to wallet, private sanitized receipts, owner APIs,
  actor timeline, bounded expiry and warning-only COD review.
- Five real separate-process same-database race scenarios in each of six SQL/PHP jobs.

## Layout and development

```text
client/     React/Vite storefront; local fonts/icons/image placeholders
backend/    Laravel, actual Composer lock, policies, infrastructure and Pest
legacy/     archived Express/sql.js/React-admin reference; NEVER deploy
tools/     release builder, offline runner activation and CI smoke scripts
```

```bash
bun install --frozen-lockfile  # Bun1.4.3; Node22.22.3; bun.lock authoritative
npm run typecheck
npm test
npm run build                # client/dist only, not a deployable PHP package
cd backend
composer install
vendor/bin/pint --test
# Pest refuses any DB except dedicated MySQL-driver shopnext_ci_test/testing.
vendor/bin/pest --ci
```

Minimum PHP8.2; target8.3. Actual locks: Laravel12.70.0, Filament5.10.3,
Sanctum4.3.3, Pest3.8.7, Pint1.30.4. Do not interpret Node/sql.js tests as PHP/DB proof.

## Build and deploy

```bash
bash tools/build-deploy.sh build/shopnext-l2.zip
```

The builder uses committed HEAD, a fresh no-dev vendor, local SPA/Filament assets,
private `app/` and sibling `public/`. No live .env, uploads, tests, Node runtime,
legacy server or active migration runner is included. Generated ZIPs stay out of Git.
[Terminal and no-terminal instructions](docs/HOSTING.md) include provisioning,
cron, environment configuration and the optional one-hour offline runner activation.

## Explicit non-goals / launch gate

No gateway adapters, SMS integration, loyalty formula or Filament business
resources were built. Real tariffs and owned saved addresses are required; missing
configuration fails closed. General CRUD/content and explicitly inactive prototype
controls remain outside L2. Original external photos remain local placeholders.
Real browser behavior, RTL/a11y, hosting permissions, CLI/web PHP equivalence, TLS
and backups/restore remain UNVERIFIED. Integration into `main` does not authorize
production deployment or later L3 sub-phases. L3a is authorized; STOP after its completion tag for approval.
