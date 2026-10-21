# L1 security baseline

2026-10-21. Implementation tests: [CI_RESULTS](CI_RESULTS.md). Actual host/browser
checks remain [UNVERIFIED](ACCEPTANCE.md). L1 is not a commerce security certification.

## Cookies, CSRF and one-domain model

Serve SPA, /api, /sanctum and /admin under the SAME HTTPS scheme/host/port.
APP_URL is that origin without a path/userinfo. Session cookie is
__Host-shopnext_session, Secure, HttpOnly, SameSite=Strict, Path=/, no Domain;
SESSION_DOMAIN is not used to widen it. XSRF-TOKEN is intentionally JS-readable.
The client initializes /sanctum/csrf-cookie, sends credentials and X-XSRF-TOKEN,
retries one419 only. No bearer/JWT/demo identity or401-refresh fallback.
Keep stateful Sanctum domains on this origin; no second frontend domain is required.
Web CSRF applies even without an Origin header. Real CSRF checks are executed in
Pest, not Laravel's ordinary unit-test exemption. Native framework endpoints retain
native validation/CSRF. Login/OTP/password and admin API limits use persistent cache.

Passwords are hashed, min14 chars/new passwords max72 bcrypt bytes; no credentials
in source or CLI arguments. Staff bootstrap is private env-only and one-time;
initial password rotation/current proof/session revocation are tested. Staff flood
lockout is the same for existing/absent accounts, before any user lookup, and expires.

## Secret settings / error and payload boundaries

Only explicit nonempty newValue changes a configured secret. Null, omitted and
empty string preserve it; no implicit delete/clear. Service response DTOs contain
key, constant mask and isSet only. No API/Filament getter or input prefilling exists.
Laravel encrypted casts protect supported values at rest; model value is hidden.
Filament finally/dehydrate clears submitted values on success and validation errors.
Settings persistence failures are replaced with a safe UNCHAINED error; upstream
exception messages/arguments are not logged. Tests inspect encrypted SQL, API and
Livewire snapshots/effects, safe exception text/trace and actual formatted error logs.
No request-body or SQL-binding debug logging may be enabled in production.

APP_KEY must be retained/backed up privately with the DB. Losing/rotating it without
a planned re-encryption procedure destroys readability of existing settings. Never
regenerate an existing installation's key. The internal nonsecret
_admin_bootstrap_lock marker is written directly by provisioning; it is outside the
service allowlist and is not an encrypted provider credential or public setting.
Never import legacy plaintext secrets directly into the encrypted-value contract.

## Audit

Admin model create/update/delete records actor id/name/role, action, table/model,
subject, IP, UTC timestamps, changed field names and redacted before/after. Retain
only approved metadata; all unknown values default-redact. Passwords, setting values,
PII/financial payloads are not copied into snapshots. Media uploads add explicit
safe events. Log records cannot be edited/deleted through the application policies.
Use transaction-bound Eloquent events or an equivalent audited service in L2;
query-builder bulk mutations do NOT invoke observers. Logging is not permission.

## HTTP, trust and content

- CSP: default-src none; storefront script/connect/font self; object/base none;
  frame-ancestors none and X-Frame-Options DENY; no CDN URLs. Styles allow inline
  for framework/component styling. Images allow self/data/blob, media self.
- /admin and /livewire scripts additionally allow unsafe-inline/unsafe-eval for
  native Filament/Alpine. This is a scoped compatibility exception, NOT a strict
  nonce-based admin CSP claim. Browser execution still needs manual acceptance.
- nosniff, strict-origin-when-cross-origin referrer, disabled camera/mic/location/
  payment features; HTTPS HSTS one year (no assumed subdomain/preload commitment).
  Auth/admin responses are private/no-store; errors also receive security headers.
- CORS origins are exact explicit HTTP(S) origins, never wildcard. Credentials
  allowed only with the whitelist; disallowed origins get no ACAO. Same-origin
  requests need no CORS permission. Host trust defaults to APP_URL host; extra
  TRUSTED_HOSTS are exact hostnames, not regexes. Empty host config fails closed.
- TRUSTED_PROXIES only known IP/CIDRs; no */**. Forwarded Host is never trusted;
  forwarded proto/IP/port only from explicitly trusted ingress. Do not guess proxies.
- Independent3 MiB request cap; configure equivalent web-server limits BEFORE PHP
  parsing too. Raster uploads only jpg/jpeg/png/webp, verified MIME/image/dimensions,
  max2 MiB/2048x2048, re-encoded PNG, cryptographic random names, private storage.
  GD and Imagick paths both executed in CI. SVG/executable/mislabeled uploads denied.
  /media delivery enforces name/extension and PNG/nosniff, no symlink needed.
- Rich text content/descriptions sanitized on model reads AND writes. Other text
  is rendered escaped, never treated as trusted HTML. No arbitrary HTML endpoint.

## Deployment controls / remaining manual gates

Private app and vendor/.env/storage outside public; never upload legacy server or
real credentials in an artifact. Disable display_errors, enable
zend.exception_ignore_args, keep APP_DEBUG=false, secure permissions and private logs.
Prefer generated valid .env; treat configuration/bootstrap failure diagnostics as
private. Token runner is inactive by default, only POST+server-HTTPS+256-bit header
token, one-hour hash-only config, atomic claim, unlink-before-execute and generic
failures. No token query parameters, cookies, URLs, stdout or runner output. Actual
TLS/proxy/FTP/server rules, access-log redaction/rotation, backups/restore and browser
network/RTL/a11y are still UNVERIFIED. No L2/provider credentials or outbound
payments/SMS requests have been used.
