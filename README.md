# Shopnext / Digistyle — verified Laravel foundation in progress

Persian RTL React/Vite storefront; Laravel12/Filament5 replacement for PHP shared
hosting. **Launch NO-GO. L1 is not complete; L2 is not approved.**

## Current verified state — 2026-10-21

- PHP8.2 AND8.3 × MySQL8.0/MariaDB10.6/MariaDB11.4 CI (six real DB jobs).
- All14 legacy tables/175 columns explicitly mapped, normalized item/pivot tables,
  FKs/deletion rules/unique/index/unsigned/CHECK integrity, integer **Toman**.
- Sanctum cookie-only SPA auth/CSRF, password/session lifecycle, rate-limited login
  and disabled503 OTP; frontend transport ported, no JWT refresh/demo identity.
- Six-role policies for all application models, independent legacy permission matrix.
- Filament staff login/password-only profile/dashboard shell, environment-only
  one-time admin provisioning and forced password change. **No business resources.**
- **131 Pest tests/728 assertions per matrix job**, Pint and migrations green;
  frontend7 local-asset/transport tests +171 archived security tests/typecheck/build.
- Actual lock: Laravel12.70.0, Filament5.10.3, Sanctum4.3.3, Pest3.8.7, Pint1.30.4.
  Dependency resolution happened on real PHP8.2 in CI, not inferred from constraints.

[Real run links/failures/results](docs/CI_RESULTS.md) · [Auth contract](docs/L1_AUTH.md)
· [Full schema mapping](docs/LEGACY_SCHEMA_MAP.json) · [Hosting](docs/HOSTING.md).

## Not done / UNVERIFIED

Encrypted settings endpoints/casts/masking, full security/header/CORS/upload perimeter,
admin activity logs, deploy-check, bounded queue/scheduler/heartbeat widget and actual
host/browser/TLS/RTL/a11y acceptance. Provider/pricing/checkout/financial services and
Filament business resources require L2 approval. Original photographs were NOT
mirrored:23 embedded image URLs are inventoried and replaced with explicit local
placeholders. Catalog/account mock fallbacks and storefront/API routing integration
are not certified as a functioning shop. Green auth tests do not authorize launch.

## Layout and commands

```text
client/                React/Vite storefront, local assets and auth transport tests
backend/               Laravel12 app, actual Composer lock, models/policies/Pest
legacy/server/         archived unsafe Express/sql.js server; never deploy
legacy/tests/          isolated171-case Phase A suite, NOT Laravel coverage
legacy/client-admin/   archived React admin reference, not compiled
```

Node22.22.3/Bun1.4.3; `bun.lock` is authoritative, no second npm lock:

```bash
bun install --frozen-lockfile
npm run typecheck
npm test                 #7 frontend +171 legacy, NOT Pest
npm run build            #client/dist; storefront only
npm run dev              #Vite only; not a working backend/proxy integration
```

Backend (trusted PHP8.2/8.3 build environment, MySQL-family disposable test DB):

```bash
cd backend
composer install --prefer-dist --no-interaction
composer check-platform-reqs
# Provision a PRIVATE .env and APP_KEY; HTTPS needed for Secure browser cookies.
php artisan filament:assets --no-interaction
vendor/bin/pint --test
# ONLY dedicated shopnext_ci_test + APP_ENV=testing (never production):
php artisan migrate:fresh --force
vendor/bin/pest --ci
```

CI config supplies the isolated database/runtime. Local sandbox has temporary PHP
and Pint for syntax/formatting but no Composer/MySQL/pdo_mysql; local Pest execution
is not claimed. Backend API uses same-origin relative URLs; deployment must serve
`/api`, `/sanctum`, `/admin`, local public assets and storefront without exposing
private backend files. Shared-host runbook still includes planned—not implemented—
operational commands; read its status warning before deploying anything.
