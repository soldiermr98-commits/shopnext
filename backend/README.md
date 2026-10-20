# Laravel backend — L1 in progress, NOT production ready

Official Laravel 12 skeleton was generated and tested in GitHub Actions, not in
the restricted local sandbox. Actual Composer solver on PHP 8.2 selected:

- Laravel framework **v12.70.0**
- Filament **v5.10.3** (resolved automatically, not preselected from constraints)
- Pest **v3.8.7**, Pint **v1.30.4**

Committed `composer.lock`, platform PHP8.2.0, strict PHP source, default migrations,
Pest bootstrap and a MySQL-specific runtime assertion are present. Bootstrap run:
https://github.com/soldiermr98-commits/shopnext/actions/runs/39500721877
It ran actual Composer resolution, platform checks, migrate:fresh, Pint and Pest
on PHP8.2/MySQL8. The separate matrix workflow must verify every subsequent commit
on PHP8.2 and8.3. No Laravel result is inferred from the171 legacy tests.

Initial constrained domain tables and 24 Pest tests/42 assertions now pass on both
PHP8.2/8.3 with MySQL8. See ../docs/CI_RESULTS.md for exact coverage/limitations.

**Not implemented:** complete field mapping/models, Sanctum/CSRF/frontend
transport, admin bootstrap/password gate, six-role policies, encrypted settings,
security/upload perimeter, Filament panel/heartbeat, bounded queue/scheduler and
deploy-check. No business resources/pricing/checkout/payment/SMS are authorized.
The installed Filament package is NOT an operational admin panel.

Target shared host: PHP8.3 minimum8.2, MySQL, minute cron/database queue, no Redis,
Supervisor/Docker/root/persistent workers. See ../docs/HOSTING.md and
../docs/SPEC_FROM_LEGACY.md. Do not run skeleton demo seeders on production.
