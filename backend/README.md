# Laravel12 backend — L1a/auth slice verified, overall L1 incomplete

Real Composer lock: framework12.70.0, Filament5.10.3, Sanctum4.3.3, Pest3.8.7,
Pint1.30.4. Platform PHP8.2.0; target8.3. The6-job PHP8.2/8.3 × MySQL8/MariaDB10.6/
11.4 matrix passes131 Pest tests/728 assertions, Pint and fresh/down/up migrations.

Implemented: full14-table/175-column mapping and normalized relations, model
policies/independent6-role matrix, customer Sanctum HttpOnly/Secure/Strict cookies
and enforced CSRF, OTP503/limits, password/session lifecycle; staff Filament login,
password-only profile and gated dashboard; guarded env-only admin provisioning.
No business resources. Actual CI links/limitations: ../docs/CI_RESULTS.md and
../docs/L1_AUTH.md. Schema mapping: ../docs/LEGACY_SCHEMA_MAP.json.

Build/deploy must publish local assets with `php artisan filament:assets`; generated
files are ignored, never a runtime CDN. Private env/key, HTTPS, database sessions,
file/database cache required. First admin: `shopnext:provision-admin` reads private
ADMIN_* config, never default passwords/CLI arguments; initial rotation mandatory.

NOT implemented: settings encryption/write-only DTOs, complete security/header/CORS/
upload perimeter, activity logs, deploy-check, bounded scheduler/queue/heartbeat.
Browser/TLS/host acceptance UNVERIFIED. No pricing/payment/SMS/checkout services.
Do not deploy as a complete shop; do not seed demo users on production.
