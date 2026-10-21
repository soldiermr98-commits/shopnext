# Architecture — implemented L1

2026-10-21. L1 implementation is tested; real deployment acceptance remains
UNVERIFIED. L2 is not approved. Historical Node architecture:
[ARCHITECTURE_LEGACY](ARCHITECTURE_LEGACY.md).

## Request and deployment boundaries

```text
HTTPS one canonical origin
  /assets /fonts /css /js /images -> built local public assets
  /api/auth/*                    -> web CSRF + cookie-only Sanctum + FormRequests
  /api/admin/settings            -> staff permission + SettingsRequest + Settings DTO
  /api/admin/media               -> staff permission + MediaRequest + safe raster service
  /media/{random}.png            -> validated private-storage delivery fallback
  /admin                         -> native Filament login/profile/settings/dashboard
  /livewire /sanctum /up          -> framework infrastructure
  other extensionless GET paths  -> private prebuilt SPA HTML, never /api or /admin errors
```

Only `public/` is exposed. Private sibling `app/` contains vendor, .env, storage,
application and SPA HTML. Public index explicitly sets its public path. CLI supports
SHOPNEXT_PUBLIC_PATH when public is renamed to public_html. Missing SPA build is
503, not the Laravel welcome page or a fabricated working shop.

Application-owned endpoint inputs use FormRequests; mutating auth/settings/media
requests reject unknown fields. Read requests bound optional search text and do
not use arbitrary query input. Native Filament/Livewire/Sanctum/health endpoints
retain their framework validators and CSRF/auth stacks, not counterfeit business APIs.
Global headers/trust/body controls also wrap errors and CORS preflights.

## Authentication / authorization

Customer browser cookies and readable XSRF proof, no bearer token issuance or JWT
refresh. Secure HttpOnly host-only Strict session cookie; authentication regenerates
session identity, logout/password rotation revoke sessions. OTP is503 until an
approved provider integration. All model policies default-deny unknown actions.
66 independent legacy role/action policy cases are NOT66 HTTP business endpoints.

Filament admits active super_admin/admin/shop_manager; initial-change users can
access only their password profile, not the dashboard/settings. Native staff flood
limiter is IP-wide, persistent database cache, five attempts/minute, uniform lockout
before credential lookup. No remember-me or external avatar/font provider.

## Settings and audit

Settings allowlist: integration_secret, mail_password, sms_api_key, payment_api_key.
These are dormant configuration slots, not integrations. Laravel `encrypted` cast
protects each value at rest. The service exposes only key/isSet/constant masked DTOs;
it has no secret getter. Explicit nonempty newValue is the only rotation path.
Omitted/null/empty string means no write; secrets are not trimmed. Filament clears
newValue in finally AND dehydrate, including validation payloads; deferred updates
and save are tested in the same Livewire request. Never change this input to live
sync without re-testing secrecy. Hidden model values are defense-in-depth, not encryption.

Model observer records admin create/update/delete, model/table, subject, actor,
IP/time and before/after. Only explicitly safe metadata values are retained; unknown
fields default to [REDACTED]. Settings and password values are always redacted.
Uploads explicitly record a safe media event and delete the file if audit fails.
Settings writes/audit share a transaction. Bulk query-builder writes bypass model
events: future L2 services MUST NOT use them to mutate admin-owned domain records
without equivalent transaction-bound audit. Internal bootstrap/heartbeat SQL is not
a business-admin mutation. No generic log reader/business resource is exposed.

## Security and operational services

- Strict storefront script CSP uses self only; native Filament/Livewire alone has
  documented inline/eval exceptions. No runtime CDN/connect/font allowlist.
- Exact CORS origins, host allowlist, explicit proxy IP/CIDR trust; wildcard proxy
  trust is ignored. 3 MiB bodies; raster2 MiB/2048px, random names, re-encoded PNG.
- RichText/SanitizedHtml use locked Symfony HTML sanitizer on content/description
  model writes and reads. SVG/script/iframe/events/unsafe schemes are removed;
  non-rich text must still be escaped by renderers.
- Single scheduler callback uses database-cache overlap lock2min and calls the
  bounded worker in process (no proc_open/Supervisor/Redis requirement).
- Every tick enqueues QueuePulse and runs database queue:work --stop-when-empty
  --max-time=50 --timeout=40 --tries=3; heartbeat separates cron and processed pulse.
- deploy-check inspects actual runtime, config, DB, storage, queue and heartbeat.
- ZIP builder installs no-dev vendor fresh; inactive runner template is outside
  public. Offline activation uses hash-only private config, one-hour token and
  atomic single-use claim; authorized execution unlinks itself before migrations.

## Scope and acceptance

No L2 services, external calls, commercial Filament resources or data import.
Legacy Node/sql.js code is reference-only, excluded from releases. New encrypted
settings are supported; legacy plaintext settings need an explicit future importer,
not automatic decryption/fallback. Runtime CI is not browser, TLS or shared-host
certification. See [acceptance](ACCEPTANCE.md) and [CI](CI_RESULTS.md).
