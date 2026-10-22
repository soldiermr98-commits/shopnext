# L1b authentication and authorization — verified slice

2026-10-21. **L1a/L1b and the L1c/L1d implementation are CI-verified.
Actual host/browser acceptance remains UNVERIFIED; production remains NO-GO.** No pricing/payment/SMS/business resources.
[CI evidence](CI_RESULTS.md) · [full legacy mapping](LEGACY_SCHEMA_MAP.json).

## Customer SPA

`GET /sanctum/csrf-cookie` initializes the session/XSRF cookies. All `/api/auth/*`
routes run the full web session/CSRF stack even if Origin/Referer is absent; protected
identity/password/logout use `auth:sanctum`. Sanctum Bearer token retrieval is
explicitly disabled globally, and Authorization headers are rejected. No personal
access token table, token issuance, JWT refresh or demo fallback exists.

Session: `__Host-shopnext_session`, HttpOnly, Secure, SameSite=Strict, Path=/,
no Domain. XSRF-TOKEN is intentionally readable and sent as X-XSRF-TOKEN. HTTPS is
mandatory; plain HTTP development cannot validate Secure browser cookie behavior.
Database session driver is the shared-host deployment default. Cookie/session idle
lifetime uses Laravel's configured SESSION_LIFETIME (default120 minutes); this is
NOT the old JWT15-minute/refresh7-day lifecycle.

Implemented routes (JSON):

| Method | Path | Contract |
|---|---|---|
| POST | /api/auth/login | customer only; normalized phone/email + password; rotate session; generic401 |
| POST | /api/auth/register | validated customer creation; no role/flag injection;201 |
| GET | /api/auth/me | authenticated, active identity DTO only; guest401 |
| POST | /api/auth/logout | authenticated; invalidate session/CSRF;200 |
| POST | /api/auth/change-password | current-password proof, different14+ character/<=72byte password; revoke all DB sessions and remember token; rotate current session;200 |
| POST | /api/auth/otp/send | validated/throttled, always503; no SMS/user/session mutation |
| POST | /api/auth/otp/verify | validated/throttled, always503; never accepts a demo code |

Validation422, invalid/missing CSRF419, throttle429. AuthRequest rejects unknown
keys and oversized bcrypt UTF-8 byte inputs. Phone normalization supports Persian/
Arabic digits and +98/0098/98 prefixes, stored as 09xxxxxxxxx; email lowercased.
Session roles/flags are never mass assignable. Password columns use Laravel's
hashed cast (production bcrypt default12; tests use a lower test-only work factor).
No reset/recovery/SMS flow is implied by these authenticated password changes.

Login/registration:5 requests/minute per normalized identity +20/IP. OTP:3/phone
+10/IP. Password change:5/authenticated user +10/IP (not one global empty identity).
Database/file cache can persist limits across PHP requests; CI explicitly exercises
database-backed limiter state. Trusted proxy configuration and operational rate
limit tuning remain part of the uncompleted security/hosting slice.

Frontend authFetch now initializes XSRF, shares in-flight CSRF bootstrap, sends
credentials same-origin and Accept: application/json, retries one419 only, never
refreshes401 or fabricates identity. Four native Node transport tests cover this.
The legacy Express archive remains unchanged; this new transport is for Laravel.
Catalog/account demo fallback removal and live storefront route integration remain
future work; a successful frontend build is not end-to-end shop certification.

## Staff: Filament shell, not business resources

`/admin/login` uses Filament5's server-validated login (email/password), native
Filament rate limiter and web guard. Remember-me is hidden **and non-dehydrated**.
Active super_admin/admin/shop_manager can log in; content_editor/support/customer
are denied, preserving the approved existing-resource matrix rather than granting
new privileges. An inactive staff account is denied by canAccessPanel.

The shell contains only the permission-gated dashboard and a password-only profile.
An initial-change account is redirected to its profile at login; dashboard and all
privileged model policies deny until current-password proof + new password succeeds.
Profile accepts neither name/email edits nor role/flags from form state. Password
change is locked/transactional, rechecks current password, revokes DB sessions and
remember token, rotates the current session and clears the initial-change flag.

Filament bundles/fonts/scripts/styles are published locally using:
`php artisan filament:assets --no-interaction` (run in CI and deployment builds).
Generated assets are ignored, not committed. Avatar is a local SVG; login HTML is
tested against Google/Bunny font and ui-avatars hotlinks. No external font/CDN is
configured. Browser-wide network/RTL/a11y/TLS acceptance remains **UNVERIFIED**.

## First administrator, no automatic production seed

Provision only through `php artisan shopnext:provision-admin` with private env:
ADMIN_NAME, ADMIN_PHONE, ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD. Never pass passwords
as CLI arguments. Phone/email/password are required/validated, no credential defaults.
A transactional private `_admin_bootstrap_lock` metadata row in settings serializes
concurrent first-bootstrap attempts; it is a non-secret lock, not provider settings.
Any existing staff account prevents provisioning; existing users are never reset.
Output is generic and never contains env values/hashes. The resulting super_admin
must change the initial password. Remove bootstrap credentials and rebuild config
cache afterward; preserve APP_KEY. Dev seeders still fail outside local/testing.

## Model policies and independent matrix

All18 application models have explicit Gate policies; unspecified resources/actions
are denied. No blanket super_admin bypass. Existing matrix:
- dashboard/products/orders/customers: super_admin, admin, shop_manager;
- settings/logs: super_admin, admin only;
- content_editor/support/customer: denied these privileged operations.

Product variants follow product policy. Customers may read their own order/profile
and read/update/delete their own addresses, never another customer's records or
financial order state. Order deletion is denied even to super_admin (SQL RESTRICT
also retains financial history). Force-delete/restore are default-denied everywhere.
Inactive/initial-change users are denied before privileged actions.

**66 policy cases** independently specify6 roles ×11 existing legacy actions, plus
owner/forced-change/inactive/default-deny tests. These are real Gate/model policy
tests, **NOT claims that all11 business HTTP endpoints/resources were implemented**.
Those routes are deferred; their actual HTTP/action matrix must be ported when
resources are authorized. L1c now adds encrypted settings casts/masked DTOs and
authorized updates; see SECURITY.md. Hidden fields alone are not encryption.

## Evidence and honest limits

Current L1 suite:160 Pest tests/1028 assertions per six-way job, Pint and real
migrations, plus frontend7 tests/legacy171/typecheck/build and upload-package smoke.
See CI_RESULTS.md and ci/l1-complete-verified-matrix.json. Real CSRF checks and
actual Filament components/pages are exercised; staff flood lockout before user
lookup, uniform notification and decay recovery are now verified (no longer open).
Settings/perimeter/audit/operations are implemented and tested. Actual browser,
regional TLS/network/RTL/a11y, CLI/web PHP equivalence and host acceptance remain
UNVERIFIED in ACCEPTANCE.md. No production launch or L2 authorization follows.
