# Laravel backend — L1 implementation checkpoint

Laravel12.70.0 / Filament5.10.3 / Sanctum4.3.3; PHP minimum8.2, target8.3.
Full schema, cookie auth/roles/staff lifecycle, encrypted write-only settings,
redacted audit, security perimeter, safe uploads/rich text, bounded cron/database
queue/heartbeat and deploy-check are implemented and CI-executed.

160 Pest tests/1,028 assertions per PHP8.2/8.3 × MySQL8/MariaDB10.6/11.4 job.
See [evidence](../docs/CI_RESULTS.md), [schema](../docs/DATABASE.md),
[auth](../docs/L1_AUTH.md), [security](../docs/SECURITY.md),
[deployment](../docs/HOSTING.md) and [manual acceptance](../docs/ACCEPTANCE.md).

`composer install`, `vendor/bin/pint --test`, `vendor/bin/pest --ci` locally require
real supported PHP/extensions and dedicated mysql-driver shopnext_ci_test/testing.
Never use SQLite or a production database as a substitute. CI is authoritative
where local PHP pdo_mysql/Composer/database are unavailable.

Build from repository root with `bash tools/build-deploy.sh`; do not upload this
source tree into a public directory. Publish local Filament assets during build.
First administrator comes only from private ADMIN_* environment values via
`shopnext:provision-admin`; no default/reset password or production seed.

Run one `schedule:run` cron each minute; it drains the bounded database worker
in process and verifies a queued pulse. Do not add a second persistent worker.
`deploy-check` returns nonzero for failed readiness; stale heartbeat is expected
before the first successful cron. All host/browser acceptance remains UNVERIFIED.
No L2 or commercial resources/services are authorized.
