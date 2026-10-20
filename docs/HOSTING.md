# Shared-host deployment contract and runbook

> **Current 2026-10-21:** Laravel/Sanctum/Filament auth now exists and is six-way CI
> verified; publish local Filament assets with `php artisan filament:assets` and
> provision first staff privately with `shopnext:provision-admin` (see L1_AUTH.md).
> deploy-check, scheduler/heartbeat and bounded worker wiring below are STILL PLANS,
> not implemented commands. Do not deploy this as a complete L1/production shop.

> **2026-10-21 update:** GitHub Actions now provides a real PHP8.2/8.3 + MySQL8
> environment. Laravel12/Filament5 were actually Composer-resolved; skeleton and
> initial constrained schema are tested (24 Pest cases). L1 is IN PROGRESS, not
> complete. Older statements below that no Laravel app exists describe the L0
> checkpoint only. See [current CI evidence](CI_RESULTS.md).

2026-10-20 — **Plan only until L1 is implemented and verified.** No `artisan`,
`deploy-check`, migrations, queue worker or Filament dashboard exists yet. Commands
below describe the required future release, not commands runnable in this checkout.

## Confirmed host facts / unresolved checks

Owner confirmed selectable PHP 8.x (target **8.3**, minimum **8.2**), MySQL/MariaDB,
real cron, and intl, mbstring, pdo_mysql, openssl, ctype, json, tokenizer, xml,
fileinfo, zip, curl and gd/imagick. Shared hosting must NOT require Redis, Supervisor,
Docker, root, persistent queue workers or a Node process. Frontend and vendor are
built before upload; PHP serves requests. SSH/terminal is **UNCONFIRMED**.

Still UNVERIFIED on actual host: exact MySQL/MariaDB version, CHECK enforcement,
CLI PHP path/version/extensions vs web PHP, cron overlap/time limits, disabled
functions (`proc_open` especially), memory/file/upload limits, writable directories,
symlink permission, mod_rewrite/front-controller routing, TLS, backups/restore and
SMTP/SMS/gateway outbound reachability. Do not infer these from extension availability.
No control-panel-brand assumptions are built into code or paths.

## Runtime and private layout

```text
/home/ACCOUNT/shopnext/backend/    # app, vendor, .env, storage, bootstrap outside webroot
/home/ACCOUNT/public_html/         # ONLY public contents; no .env/vendor/private storage
```

Preferred: document root points at `backend/public`. Otherwise copy public files
(including `.htaccess`) to `public_html`; adjust **all relative bootstrap paths** in
the release's actual public/index.php to the private application, including
maintenance.php, vendor/autoload.php and bootstrap/app.php. Do not blindly paste an
index.php from a different Laravel version. Deny dotfiles, directory listing and
PHP execution under uploaded media. Never move the whole backend into webroot or
rely only on `.htaccess` to hide secrets.

Use one HTTPS origin for storefront, `/api`, `/sanctum` and `/admin` where possible.
Expose Laravel/Filament routes before the storefront SPA fallback; never route
`/api` errors or `/admin` to SPA index. Serve frontend built files without replacing
Laravel's front controller. Missing asset returns 404, not index.html. Exact SPA
rewrite/fallback controller is part of L1 integration, not configured today.
For a development preview bind Vite 0.0.0.0; browser uses relative URLs and Vite
proxy targets the backend internally, never browser-facing localhost API URLs.

Protect APP_KEY, preserve it between deploys, back it up separately from encrypted
DB. Restrict env/backup/log file permissions to account access (no 0777). Writable
only `storage/` and `bootstrap/cache/`; executable application/upload permissions
must follow host isolation. File/database cache; database sessions recommended;
HttpOnly Secure session, tested SameSite and CSRF; exact CORS list, APP_DEBUG=false,
APP_ENV=production, correct APP_URL/proxy trust. No secrets in logs, screenshots,
CLI arguments pasted into support tickets, frontend VITE_* or release archives
shared publicly. Never commit production env or export it in diagnostics.

## Discover the CLI binary (terminal and no-SSH)

In a terminal, `command -v php` and `php -v` are only starting points. Confirm full
path, PHP_BINARY, version, loaded INI, modules and pdo_mysql; the web version can
differ. Use `php -r 'echo PHP_BINARY," ",PHP_VERSION,PHP_EOL;'` and `php -m` privately.
Ask host support for the selected PHP 8.3 **CLI** full path if needed.

Without SSH, configure a temporary private cron command with the candidate full
path, e.g. `/FULL/PATH/php -v > /home/ACCOUNT/private/php-cli-check.log 2>&1` and
`/FULL/PATH/php -m >> /home/ACCOUNT/private/php-cli-check.log 2>&1`. Read the private
log through authenticated file manager/FTP, verify CLI version/extensions, then
remove the diagnostic cron/log. Never publish phpinfo or `.env` diagnostics.
Every production cron must use the verified full binary and application paths;
cron PATH is not the interactive shell PATH. This discovery procedure is host-agnostic.

## Build a deterministic release off-host

On a trusted connected build machine (matching PHP floor/extensions), resolve
Composer dependencies **once**, commit the real composer.lock, and run tests against
isolated MySQL/MariaDB, Pint and platform checks. Production artifact installation:
`composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction`,
`composer check-platform-reqs --no-dev`. Never run `composer update` on production;
never use `--ignore-platform-reqs` to hide incompatibility. Development/Pest belongs
in build/test environment, not host. All authored PHP declares strict_types=1;
Pint is a format check, not a static type checker or a security test.

Current frontend lock is **bun.lock** (no package-lock): use the pinned Bun version
from build evidence and `bun install --frozen-lockfile`, then `npm run typecheck`,
`npm test`, `npm run build`. Tests require a compatible Node 22+ environment.
Artifacts contain `client/dist/`, local fonts/icons/licenses, built Filament assets,
backend vendor and app, not legacy/data, node_modules, test DBs or private env.
Release manifest should record commit, runtime/tool versions, lock hashes, artifact
hash and test evidence. Do not upload the unimplemented `backend/` as a release.

## Iran / intermittent-network installation

- Runtime must not request external CDN scripts/styles/fonts/icons. Current fonts
  are vendored with licenses/hashes; photography is a documented local placeholder,
  **not** a completed image mirror. Validate future API/media/localStorage paths;
  browser offline/network inspection remains required before claiming zero hotlinks.
- Warm Composer's configured `cache-dir` and Bun/npm caches in a connected build
  environment using the exact committed locks. Keep signed/hashed release archives
  and dependency cache backups private. A warm cache is not proof of offline success:
  test install in a clean workspace with networking disabled before promising it.
- Prefer a trusted organization-controlled Composer/npm mirror, via user/build
  configuration (not hard-coded runtime URLs). Verify upstream integrity/dist hashes,
  license provenance and TLS; never disable TLS or use an untrusted public mirror
  just to bypass outages. Verify an actual clean install before labeling a mirror
  supported. Custom mirrors/caches are **not configured or tested in this sandbox**.
- If the host has no dependency network/terminal, ship complete vendor/frontend ZIP
  from that trusted build. Exclude env; provision privately on host. Node/Composer
  are not required on the production host when the validated artifact is complete.

## Deployment with SSH / terminal (future implemented release)

1. Backup DB + private storage + APP_KEY securely; test restore in isolation. Record
   maintenance/rollback window, schema compatibility and last known good artifact.
2. Upload/extract private release, preserve env/storage, set selected web and CLI PHP.
   Inspect platform requirements under host CLI; do not seed demo records.
3. Enter maintenance, switch release atomically if possible (otherwise prevent
   mixed-file requests), run `php artisan migrate --force` using full verified PHP.
   Review migrations for MySQL implicit DDL commits; backup/restore may be required
   instead of rollback, never promise transactional migration rollback.
4. Build config/route/view caches only when compatible; rebuild per-host config so
   cached local env/paths are not shipped. Run guarded one-time admin provisioning
   from environment, remove its bootstrap secret after use; keep APP_KEY unchanged.
5. Set public paths/rewrites, run `storage:link` if permitted, check local assets and
   auth/CSRF, run `deploy-check`, exercise cron/queue, inspect private redacted logs.
6. Leave maintenance only after smoke tests; retain previous artifact and backup.
   Never run migrate:fresh, test fixtures or automatic seeders on production.

### No SSH: private temporary cron alternative (no public migration runner)

Build/upload complete artifact via authenticated FTP/file manager, including vendor.
Use temporary **private cron** commands with full PHP and artisan paths for supported
one-time commands. For migration, use an outside-webroot guarded shell script (or
private PHP wrapper if shell is unavailable): verify a private marker is absent,
activate maintenance, invoke artisan migrate --force, write a completion marker only
on exit 0, keep failure code/log private; serialize invocation using available lock
or a private atomic lock directory, fail closed on overlap. An interrupted run needs
operator inspection before retry. Do not silently touch marker on failure.

Review log/exit status and migrations table, remove temporary cron/script/marker,
complete smoke tests and disable maintenance with another guarded private command.
If host cannot execute artisan safely through cron, obtain host support/manual
migration assistance — **do not publish a web shell or unauthenticated one-time
migration endpoint**. No such wrapper is included until tested with L1. Schedule
cron at least one minute apart with exit guards; no credentials in command text.

## Database queue and scheduler — bounded, not persistent

Required configuration: database queue (`jobs`, `failed_jobs`, optionally batches),
file/database cache for scheduler locks, database sessions. Queue tables exist before
scheduler use. Every delayed task uses scheduler/queue, never in-request sleeping or
persistent daemons. Exactly one scheduler entry every minute:

```cron
* * * * * cd /home/ACCOUNT/shopnext/backend && /FULL/PATH/php artisan schedule:run >> /home/ACCOUNT/private/scheduler.log 2>&1
```

Laravel scheduler must record heartbeat and invoke
`queue:work --stop-when-empty --max-time=50` each minute with `withoutOverlapping`
and a tested lock expiry. Choose job timeout/attempts/retry_after so failed work
cannot execute twice concurrently (`retry_after` greater than effective timeout).
Set tries/backoff consciously, surface failed_jobs, and test poison/retry behavior.
`--max-time=50` is checked **between jobs**, not a hard kill of a long-running job;
PCNTL is not guaranteed. Jobs must be short/bounded/chunked with provider connection/
read timeouts; measure duration below host limits. Test crash/overlap recovery;
external locking/`proc_open` must not be assumed available.

`Schedule::command` may require proc_open. If disabled, implement/test a bounded
in-process command invocation in the scheduler under the same lock, or obtain host
support. Do not claim a cron shell command is universally portable until tested.
Private cron logs need rotation/retention; no full request bodies or secrets.

Heartbeat table records UTC started_at and completed_at, worker last success/failure
separately; a scheduler start must not falsely certify queue drain. Future Filament
shell widget: “cron last ran X minutes ago”, distinguish never-ran/stale/failed,
restrict to authorized operational roles (not public API), show UTC source + Tehran
presentation. With minute cron, warn after a configurable small threshold (e.g. 3
minutes), test server clock drift and stale locks. Keep audit/heartbeat writes bounded.

## Required `artisan deploy-check` acceptance (not present yet)

Nonzero exit on required failure; a redacted report, never dump env/config values:

- PHP floor/target, CLI binary/version/INI and required extensions, actual web/CLI
  version confirmation; check 64-bit integer support, file limits/disabled functions.
- env exists privately, APP_KEY valid, production/debug/URL/cookie/CORS/proxy settings
  safe; private app root/public webroot separation; no default bootstrap secrets.
- storage/bootstrap cache writable and not world-writable; private logs/backups.
- DB connection/version/charset/InnoDB/CHECK support, migrations up to date, required
  FKs/indexes/uniques; don't mutate production data to test constraints.
- database queue/session/cache selected, queue/failed-job tables, no unsupported
  persistent driver, stale jobs/locks surfaced; safe empty diagnostic job optional.
- heartbeat fresh, completed timestamps honest; never-ran is warning/failure until
  operator performs first cron, not fabricated as success.
- storage symlink readable if used; if forbidden, use an explicit authenticated or
  public-safe storage controller/copy workflow with traversal/visibility/MIME checks,
  not broad access to private storage. Report selected fallback and verify it.
- required local asset existence, upload PHP execution denied, production seeded
  demo data absent; warning vs blocking classification documented per check.

## Pre-launch / rollback checklist

- [ ] Implement L1 and pass real Pest/MySQL, PHP8.2/8.3 matrix and platform checks.
- [ ] Confirm host CLI/web runtime and all unresolved checks above.
- [ ] Verify encrypted settings + preserved APP_KEY + restore drill.
- [ ] Verify private roots, TLS, cookies/CSRF, CORS, local assets/media and uploads.
- [ ] Verify cron heartbeat/queue lock/retry/failed jobs on real shared host.
- [ ] Provision administrator securely; force password change; no demo seeding.
- [ ] Capture redacted deploy-check/smoke evidence, no secrets in artifact/logs.
- [ ] Obtain L2 approval separately; close critical finance/provider/stock blockers.

None of the target-host checks/deploy commands has been executed here. A rollback
must restore the compatible prior code+schema/data snapshot and preserved key;
reverting PHP files alone cannot undo a destructive migration. Laravel foundations
and green legacy tests do not make checkout/payments production-ready.
