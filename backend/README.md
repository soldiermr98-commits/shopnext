# Laravel backend destination — L1 NOT implemented yet

This directory is reserved for the new backend. It does not contain a Laravel app,
Composer lock/vendor, migrations, Sanctum, Filament or Pest yet. Never deploy it as one.

Compatibility checked against official source on 2026-10-20:
- Laravel framework 12.x requires PHP ^8.2; use this maintained compatibility line
  if the owner's minimum PHP 8.2 requirement is retained (deployment target 8.3).
- Laravel 13.x requires PHP ^8.3 and therefore cannot claim minimum 8.2 support.
- Filament 5.x panels/support require PHP ^8.2; support permits Illuminate
  ^11.28|^12.0|^13.0. Actual transitive compatibility must be resolved and locked
  by Composer with config.platform.php=8.2.0, not assumed from these root ranges.

Host facts: PHP 8.3 target, all listed extensions confirmed by owner, MySQL/MariaDB,
real minute cron, no persistent workers/Redis/root required. SSH availability pending.

Sandbox blocker: system PHP/Composer/MySQL are absent. A temporary PHP 8.3.31 CLI
was obtained outside the repo, but it has no pdo_mysql. Composer/Packagist resolution
and a MySQL test server remain unavailable. No L1 success/test claim is made.
See ../docs/HOSTING.md and ../docs/SPEC_FROM_LEGACY.md for the implementation contract.
