# Shared-host deployment — L1 runbook

2026-10-21. Code/ZIP/HTTP smoke is CI-executed; **the actual host, browser and TLS
remain UNVERIFIED**. Complete [ACCEPTANCE.md](ACCEPTANCE.md) before considering a
launch. L1 is tagged; L2 is authorized but IN PROGRESS, not a completed commerce
release. Use the intended verified tag, not an intermediate financial checkpoint.
No gateway/SMS integration is implemented. See PRICING.md for outstanding L2 gates.

## 1. Discover the real runtime first

Minimum PHP8.2, target8.3, **64-bit integer runtime required** for exact Toman. CLI/cron PHP can differ from web PHP. Identify the actual
absolute CLI binary using the host's available terminal or cron/version-output
facility; run that binary with `-v`, `--ini` and `-m` privately. Do not assume the
shell's `php` is the selected web version. No public phpinfo page.

Required extensions: intl, mbstring, pdo_mysql, openssl, ctype, json, tokenizer,
xml, fileinfo, zip, curl, **bcmath**, plus gd OR imagick. bcmath and all CLI/web
extension equivalence still require host verification. PHP extensions do not prove
server limits, cron execution, SSH, symlinks or outbound provider connectivity.
Supported CI DBs: MySQL8.0, MariaDB10.6 and11.4; use DB_CONNECTION=mysql for both
server families (the tested PDO path). Application and DB session timezone are UTC.

No Redis, Supervisor, Docker, root, persistent worker or Node process is required.
The scheduler's worker runs in-process, so proc_open is not required to start it.

## 2. Build OFF the host

Trusted Linux/macOS Bash or WSL build machine: Git, PHP8.2+ with extensions,
Composer2, Python3, zip/tar, Node22.22.3 and Bun1.4.3. Check out the intended release
commit/tag and use committed files; the script deliberately archives HEAD, not
uncommitted edits or live server state.

```bash
bash tools/build-deploy.sh build/shopnext-l1.zip
```

The script installs a fresh locked **no-dev vendor**, builds the SPA, publishes
local Filament assets, and produces:

```text
app/                    PRIVATE Laravel/vendor/storage/.env.example/SPA HTML
public/                 ONLY webroot contents, Laravel index + local assets
activate-runner.php      LOCAL offline helper; do not publish in webroot
invoke-runner.php        LOCAL HTTPS client; do not publish in webroot
REVISION                 commit identifier
```

No real .env, sessions, uploaded media, tests, Node server, legacy code or active
migration runner is included. Keep the ZIP out of Git/public directories.
The CI PHP8.2/MySQL job publishes artifact `shopnext-l1-upload` (7-day retention).
The artifact is inspected/extracted and its actual public/private HTTP layout,
local assets, Filament and pending-migration runner are exercised. TLS is simulated
in that smoke test, not certified. To build where registries are unreliable, prewarm
trusted Composer/Bun caches or configure an approved mirror on the build machine;
retain both locks, TLS verification and frozen installs. Never fetch fonts/CDNs at
runtime or regenerate a lock just to bypass a mirror failure.

## 3. Private/public layout and environment

Use sibling directories, with the private directory named **app**:

```text
/home/ACCOUNT/app/             private app, .env, vendor, storage, operations
/home/ACCOUNT/public/          document root, OR public_html/ with these contents
```

Point the document root at public when supported. Otherwise copy **only public
contents**, including .htaccess, into sibling public_html; keep app outside it.
The generated index and optional runner reference `../app`. Do not copy the whole
archive into public_html. If the host cannot provide any private writable sibling
or configurable document root, this layout is NO-GO; do not rely on hiding .env
with rewrite rules. Public assets must not replace Laravel's index.php.

Prepare private app/.env from .env.example. Example NONSECRET configuration:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_LOCALE=fa
APP_FALLBACK_LOCALE=en
APP_URL=https://shop.example
DB_CONNECTION=mysql
DB_HOST=HOST_PROVIDED_DATABASE_HOST
DB_PORT=3306
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
SANCTUM_STATEFUL_DOMAINS=shop.example
CORS_ORIGINS=https://shop.example
TRUSTED_HOSTS=
TRUSTED_PROXIES=
```

Fill DB_DATABASE/DB_USERNAME/DB_PASSWORD privately. Generate APP_KEY once on the
trusted machine (or host terminal) with `php artisan key:generate --force
--no-interaction` **for a NEW installation only**; it writes the private .env,
not stdout. Preserve the old APP_KEY/.env on upgrades. Never regenerate a key for
an existing encrypted settings DB. Do not cache development config or test keys.

One HTTPS domain for SPA, /api, /sanctum and /admin; no second CORS frontend origin.
Secure/HttpOnly/host-only/Strict cookies are configured by code. Do not widen Domain
or change SameSite as a workaround. Include a port in stateful/CORS origins only
when genuinely using a nonstandard HTTPS port. TRUSTED_HOSTS extra values are exact
hostnames; TRUSTED_PROXIES only provider-confirmed ingress IP/CIDRs, never */**.
Forwarded Host is not trusted. Empty CORS config still permits normal same-origin
requests; it grants no cross-origin access.

Provide ADMIN_NAME/PHONE/EMAIL/INITIAL_PASSWORD privately for first provisioning;
password14+ chars and <=72 UTF-8 bytes, no defaults. Remove these initial bootstrap
values after success; never pass passwords on CLI, commit them or paste them into
chat/logs. No production demo seed. Set display_errors=Off and
zend.exception_ignore_args=On at PHP/host level. Configure server request limit3 MiB,
upload limit2 MiB and no directory listings/dotfile access before PHP parsing.
New uploads are private/re-encoded PNG and served by /media, so no upload directory
needs PHP execution. Confirm actual server rules manually, not just Laravel tests.

Storage and bootstrap/cache must be writable by the web AND cron PHP identities;
private .env/config should be owner-readable only. Use least privilege, not777.
Verify owner/group requirements with the host. Do not recursively make vendor or
application source writable. The /media private-storage route is the default
symlink-free fallback. Optional storage:link must target only storage/app/public;
never link all storage or private files.

## 4A. With terminal (PHP only needed on host)

Back up DB/.env/key/media and place the site in maintenance at the web-server level
before an upgrade. Upload/extract the package; preserve existing private .env and
storage data. Keep app/public sibling layout.

Using the DISCOVERED absolute PHP binary (substitute all paths):

```bash
cd /home/ACCOUNT/app
/absolute/path/php83 artisan migrate --force --no-interaction
# New installation only, private ADMIN_* configured:
/absolute/path/php83 artisan shopnext:provision-admin --no-interaction
```

No Composer/Node install is needed on the host. Assets are already published. If
public is renamed, use `SHOPNEXT_PUBLIC_PATH=/home/ACCOUNT/public_html` in the process
environment for CLI asset/storage commands; don't rely on it being read from .env
before bootstrap. Clear stale config/routes when upgrading with the selected PHP.
Do not use migrate:fresh, rollback, db:seed or key regeneration on production.

## 4B. WITHOUT terminal — optional one-time runner

Prepare/upload app/.env and its persistent APP_KEY locally as above. First upload
the normal package via encrypted FTP/SFTP. Activate ONLY AFTER the long upload and
TLS setup, so the one-hour window is not wasted. Helpers run on the local trusted
machine, not on the host:

```bash
# Run against the locally EXTRACTED app/public folders, not the source checkout.
php activate-runner.php /local/release/app /local/release/public /local/PRIVATE-token
```

Keep the token file LOCAL and outside app/public; the helper refuses unsafe layout,
public token placement or overwriting an activation. It prints only a random
`migrate-<random>.php` filename. Upload just that PHP file to actual public_html and
`app/storage/app/private/migration-runner.json` to the private app, preserving owner
permissions. The config contains a hash/expiry, not the token. Do not upload the
raw token file or helpers. Never place the token in a URL/query/string/CLI argument.

```bash
php invoke-runner.php https://shop.example/migrate-RANDOM.php /local/PRIVATE-token
```

The helper sends the token as an HTTPS POST header, never follows redirects and
never prints the token or raw server errors. The server requires native HTTPS,
POST, correct256-bit token, valid expiry and an atomic unused claim. It unlinks its
public entry BEFORE migration, consumes activation even on failure, runs forward
migrate --force and optionally initial-admin provisioning from private ADMIN_*.
Response is generic. On success verify the URL is now404 and private config gone;
remove local token and initial ADMIN_* values. No permanent install/admin endpoint.

If it fails, inspect migration state privately; never replay the same activation.
Remove any expired/stale runner/config and activate/upload a NEW token/file after
fixing the cause. Preserve nonsecret used-claim markers until deployment review.
Server-HTTPS must actually be set by the host. Do not trust a client-supplied
X-Forwarded-Proto or weaken the runner check. If the TLS terminator does not provide
that flag, ask the host to configure it safely, or use a private one-shot cron to
run the same migration/provision commands and then REMOVE that temporary cron.
No-terminal deployment is still UNVERIFIED on the owner's actual host.

## 5. ONE minutely cron

Substitute the discovered PHP binary and real paths. Example when public_html is
used (the environment override is optional if the folder remains public):

```cron
* * * * * cd /home/ACCOUNT/app && SHOPNEXT_PUBLIC_PATH=/home/ACCOUNT/public_html /absolute/path/php83 artisan schedule:run >> storage/logs/cron.log 2>&1
```

There is ONE cron entry, not an additional queue-worker cron. The scheduled callback
uses a2-minute database-cache overlap mutex and invokes `shopnext:tick` in process.
It records cron start, enqueues QueuePulse and runs the equivalent of:

```text
queue:work database --queue=default --stop-when-empty --max-time=50 --timeout=40 --tries=3 --sleep=1
```

Successful pulse processing and completion update separate DB heartbeats. Missing,
future, stale (>3min) or failed worker warns on the Filament dashboard. Do not add
Supervisor, a persistent worker, Redis or a second scheduler. Check cron/web UTC
clocks. Review failed jobs before retrying; do not prune errors to fake health.

**Bounded-worker caveat:** max-time is checked BETWEEN jobs, not a hard kill of a
hung job. Per-job timeout needs PCNTL support; future L2 network jobs also need
strict provider I/O deadlines and idempotency. CI proves real database pulse work,
not host wall-time/process-kill behavior. No provider jobs exist in L1.

## 6. Readiness and manual sign-off

After the first cron run:

```bash
cd /home/ACCOUNT/app
/absolute/path/php83 artisan deploy-check
```

Returns nonzero for failed checks: actual PHP/extensions, write probes, .env/key,
production debug/HTTPS origin, real DB family/version, database queue, stale cron/
processed pulse, failed/overdue/stuck jobs, and symlink OR private /media fallback.
Output never dumps credentials. Fresh installs correctly fail heartbeat readiness
before cron. Without terminal, run this command via a temporary private cron,
read its private output using SFTP and REMOVE that temporary check entry; do not
expose deploy-check output as a public endpoint.

Record [ACCEPTANCE.md](ACCEPTANCE.md), permissions, PHP CLI/web equivalence, TLS,
actual upload/error headers/asset delivery, queue timing and an encrypted DB/key/
media backup-and-restore drill. Static asset headers must also be configured on
the real web server; PHP middleware cannot decorate files served directly by it.
If any check fails or is not executed, keep it UNVERIFIED/NO-GO. No L2 work follows
without explicit owner approval, regardless of the l1-complete implementation tag.

## Image processing on shared hosting (L3a)

Ask the host to set these **web/FPM** values in the hosting panel, `php.ini`, or
`.user.ini` (CLI PHP may use a different INI):

```ini
upload_max_filesize = 8M
post_max_size = 10M
memory_limit = 256M
max_execution_time = 60
```

Do not request unlimited memory/time. `.user.ini` changes can take several minutes;
verify the actual web PHP values as an authorized dashboard user, not just CLI.
`php artisan deploy-check` reports these same limits, GD/Imagick WebP capabilities
and Persian warnings. Recommendations do not waive hard readiness failures.
Enable GD with WebP or Imagick with WEBP format support; do not enable SVG delegates.

Processing rejects oversized input **before decoding**, using `getimagesize` and a
conservative estimate `width × height × 4 × 2 + input bytes × 2`, less live PHP
usage and a 32 MiB reserve. Absolute defaults: `MEDIA_MAX_PIXELS=24000000`,
`MEDIA_MAX_FILE_BYTES=8388608`, `MEDIA_PROCESSING_MEMORY_BYTES=268435456`.
They are ceilings, not promises that a 24 MP image fits an already busy 256M
process. Existing upload/receipt forms still enforce their stricter 2 MiB/2048px
limits; this change does not widen private receipt or HTTP-body limits. Reduce
images locally when a Persian size/memory rejection appears. Never raise pixel
limits simply to suppress a memory warning. Application memory remains bounded
even if CLI `memory_limit=-1`. Each decode frees its image resource; Imagick reads
frame zero only. Configured derived outputs are capped at three,64–2048px each.

Queue conversion, no-WebP original retention, synchronous no-worker fallback and
in-use deletion protection must be verified with the media-library implementation;
this safety prerequisite alone does not claim those features are delivered.


## Media library operation

Use `/admin/media-library` (product-management roles only). Folders are virtual
labels; never create public upload symlinks or use user input as host paths. Copy
canonical `/media/{48hex}.png` URLs for catalog references; WebP/thumb filenames
are managed derivatives. All new catalog/API uploads register automatically;
pre-existing disk files are not silently scanned/imported. Receipts stay private.

The existing single-minute `shopnext:tick` database worker processes ConvertMedia
jobs (45s timeout,2 tries), no Redis/Supervisor/persistent worker requirement.
Healthy-worker uploads queue. Without fresh heartbeat only sources≤1MP process
synchronously, and only when max_execution_time is unlimited or≥15s; larger images
remain safe PNG and queue pending work. Native decode is header/memory-budget
checked and sequential. Missing WebP/resource errors keep canonical PNG; retry
from the selected media's «تلاش دوباره تبدیل» action after fixing host support.
No original is removed merely because queue dispatch failed. PHP upload recommendations
are not permission to widen the existing2MiB/2048px forms or3MiB body ceiling.

Replace preserves canonical URLs; application transaction failures restore old
bytes/metadata. Delete refuses live references including drafts/trash. File
quarantine is private/non-routable; after a host/process crash reconcile stale
`.backup`/`.deleted-*` files against metadata and verified backups manually—never
bulk-delete by age while requests are active. Database/filesystem crash atomicity
and actual host process-kill/restore remain UNVERIFIED, not claimed SQL atomicity.
Production build must retain existing `optimize`, `filament:optimize` and icon-cache
steps; new registered pages/views are included by that same deployment process.

### Required production cache sequence (after each code/metadata release)

From the **private app** directory with the host's actual production `.env`:

```sh
php artisan optimize:clear
php artisan filament:optimize-clear
php artisan migrate --force
php artisan optimize
php artisan filament:optimize
# filament:optimize runs filament:cache-components and icons:cache.
php artisan deploy-check
```

Generate caches **on the host**, never ship caches containing builder paths or
configuration. The no-dev builder intentionally removes compiled configuration/
route caches. `deploy-check` now fails production readiness if configuration,
routes, Filament admin-component or Blade-icon manifests are absent. Resource
recommendations remain warnings. A failed readiness result is not launch approval.
Fresh-cron/queue probes and canonical HTTPS remain required independently.
