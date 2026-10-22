# Phase A — security foundation

> **L0 migration notice (2026-10-20):** retained historical evidence; old paths now
> map into `legacy/` and `client/`. L0+L1 are authorized, stopping before L2; older
> Phase B wording below is superseded. Laravel L1 is NOT implemented. See
> [current replacement specification](SPEC_FROM_LEGACY.md) and [L0 evidence](L0_RESULTS.md).

Date: 2026-10-20. Approved direction: **keep UI, incrementally replace backend/domain core**.
Scope: authentication, permissions, request perimeter/validation, settings secrecy,
persistence error propagation and security regression tests. **Phase B is not approved.**
[Audit statuses](AUDIT_REPORT.md#phase-a-status-update--2026-10-20) · [Changelog](CHANGELOG.md)

## Security contract now implemented

- Cookie-only access JWT: HS256 with fixed issuer/audience and subject/session ID,
  **15-minute** expiry. Every access rechecks session existence/expiry and current
  DB user/role. Missing/invalid/expired/unknown-user/missing-session credentials:
  **401**. Insufficient role: **403**. Bearer/localStorage/demo tokens are not accepted.
- Access/refresh cookies: `__Host-shopnext_access`, `__Host-shopnext_refresh`;
  **HttpOnly, Secure, SameSite=Strict, Path=/**, no Domain. No tokens in JSON bodies.
- Refresh: opaque random secret, SHA-256 digest only in `auth_sessions`; rotates
  on every successful refresh. Maximum server session life **7 days from login**,
  not extended by rotation. Replay revokes that session, including its access JWT.
  Logout deletes the session and clears cookies; changing password revokes all
  user's sessions and creates a new one in one persisted mutation.
- New password hashing uses bcrypt cost **12**. New passwords: minimum **14
  characters**, maximum **72 UTF-8 bytes**, not equal to current password. Current
  password is required even on first-login rotation. Login uses a dummy bcrypt
  comparison for unknown users and generic credential errors.
- Fresh seeded admin password comes only from **ADMIN_INITIAL_PASSWORD**; there is
  no default. Its `must_change_password` flag blocks every admin operation (403)
  and order operations until password change. The UI displays a mandatory form.
  Seeded sample customers receive an unknowable random password, not a shared default.
- JWT_SECRET is mandatory and fails startup if absent, under 48 bytes, or grossly
  low-diversity. Generate it cryptographically outside code, never use a phrase.
- Client auth starts as guest/null, removes legacy localStorage tokens, checks
  cookie session, and shares one in-tab refresh attempt on 401. AdminLayout never
  creates/promotes an identity. Account password/logout invoke real auth operations.

### Known session operational limits

Expired sessions are rejected but no scheduled session cleanup job is implemented.
Refresh coordination is in-tab only: simultaneous refreshes across tabs can trigger
replay revocation and force re-login (availability trade-off, not an authorization
bypass). No device/session management UI or distributed limiter is included.
Browser/TLS end-to-end behavior is not yet tested; cookie headers, JWTs and real
router/session behavior are exercised by integration tests.

## Explicit server-side access matrix

All methods under each resource use the same policy. There are 11 existing admin
operations. Checks execute **before body parsing**, again at contract validation,
and at individual handlers; malformed bodies do not bypass/change 401/403 outcomes.
A first-login password restriction overrides otherwise allowed roles.

| Resource / operations | super_admin | admin | shop_manager | content_editor | support | customer |
|---|---|---|---|---|---|---|
| dashboard GET | allow | allow | allow | deny | deny | deny |
| products GET/POST/PUT/DELETE | allow | allow | allow | deny | deny | deny |
| orders GET/status PUT | allow | allow | allow | deny | deny | deny |
| customers GET | allow | allow | allow | deny | deny | deny |
| settings GET/PUT | allow | allow | **deny** | deny | deny | deny |
| logs GET | allow | allow | **deny** | deny | deny | deny |

Settings/logs are now narrower than the prototype's blanket manager access.
Unimplemented content/support endpoints do not acquire implied permissions.
`server/security/auth.ts` is the implementation; the test suite independently
specifies the expected matrix rather than deriving expectations from that object.

Customer order-list no longer substitutes another customer's sample records.
Order-detail requires an authenticated owner or privileged admin/manager. Public
tracking remains a separate projection and still needs enumeration/rate-limit review.

## HTTP perimeter and validation

`server/app.ts` is shared by startup and tests. Helmet is applied (production CSP;
dev CSP disabled for Vite; production permits HTTPS product images). CORS uses exact configured origins, never wildcard;
credentials enabled only for an allowed Origin. Disallowed origins are rejected,
not merely stripped of CORS headers. Unsafe browser requests with cross-site fetch
metadata, or browser fetch metadata but no Origin, are rejected. SameSite=Strict
and origin checks provide CSRF defense; no separate CSRF token service exists.
Non-browser clients without Origin/fetch metadata are allowed but still need cookies
and authorization. Approved same-origin HTTPS deployment is required.

Rate limits are **per IP, per process**, 15-minute windows:
- Login 10; OTP send+verify **shared 5**; register 5; refresh 60; password-change 10.
- Rejections return 429 with Retry-After. No identity-based/distributed limit store.
- No implicit trust of X-Forwarded-For. TRUSTED_PROXIES may list exact proxy IP/CIDRs;
  configure and verify this behind a reverse proxy. Never set a universal trust flag.

`server/security/validation.ts` enumerates **all 30 API operations** with Zod schemas
for body/query/decoded path parameters; `/health` validates empty query/body separately.
Unknown operations return JSON 404; invalid input JSON 400 without reflecting submitted
values; payloads over 1 MB return 413 (after auth for admin). Query limits max 100.
Inputs are typed/bounded, unknown fields rejected. Validation of positive quantities
and status enums does **not** implement correct pricing, stock transactions or an
order transition policy. Nested product snapshots remain part of the legacy checkout
contract until Phase B. Financial calculation code was not rewritten.

**OTP is intentionally unavailable (503)**, with rate limiting and schemas. Predictable
OTP auth and fake delivery success were removed; no SMS adapter or transport was added.
AuthModal paths now match backend paths and default to password login.

## Settings API: write-only credentials

`server/security/settings.ts` defines supported public/secret keys and providers.
Known credential fields return **only** `{masked:"••••••••",isSet:true}` or
`{masked:"",isSet:false}`—not even a last-four substring. This applies equally to
GET and successful PUT. Unknown stored keys/providers are excluded from responses.
Errors are generic, never raw persistence exceptions. Responses are no-store.

Example *shape*, not real credential data:

```text
GET /api/admin/settings
  gateways.zarinpal.merchantId -> { masked: <display-only>, isSet: <boolean> }

PUT /api/admin/settings
  gateways.zarinpal.merchantId -> { newValue: <privately supplied replacement> }
```

Omitted secrets remain unchanged; nested sibling settings/providers survive a patch.
Sending raw strings or GET mask metadata as a secret update returns 400. There is
no implicit clear-on-empty operation. AdminSettingsPage strips display descriptors
before a general save and never loads fabricated fallback settings on errors.
This phase changes settings storage/transport, **not gateway/SMS provider execution**.
Secrets remain unencrypted in the local DB; filesystem/backups must be private.
Migration to a vault/encrypted storage is an outstanding audit item.

## Persistence containment, not the Phase B database rewrite

Writes use a unique exclusive temporary file (0600), full export, file fsync and
atomic rename. New data directories use 0700. Errors propagate as 500 (no success
cookies or JSON). `mutateDatabase` restores the previous memory image when mutation
or save fails. Password rotation+session revocation are one mutation. Tests inject
rename failures and verify memory/disk/session/hash remain unchanged.

**Still not acceptable for production money/orders:** other business operations
remain multiple saved statements, full images block the event loop, different workers
can overwrite stale state, DB load recovery/migrations/backups are not redesigned.
Directory-fsync/power-loss guarantees and production restore/load tests are not claimed.
Do not run multiple workers against this file. No payment/stock/ledger atomicity claim.

## Running and reproducing

Install the tracked Bun lock with Bun 1.4.3 (or a compatible release), then run scripts
with Node 22.12+ (tested 22.22.3). Dev dependencies are needed for current TS runtime.

```sh
bun install --frozen-lockfile
cp .env.example .env
chmod 600 .env
# Privately fill JWT_SECRET, ADMIN_INITIAL_PASSWORD, CORS_ORIGINS, and DATA_DIR.
npm run dev
# In a separate shell, no .env setup needed for the isolated tests:
npm test
npm run typecheck
npm run build
```

Use password manager/secret injection for bootstrap credentials; never commit or
print them. Set CORS_ORIGINS to actual exact HTTPS storefront/preview origin(s).
Secure cookies require browser HTTPS (e.g. trusted TLS reverse proxy/Arena HTTPS
preview); do not "fix" local HTTP login by disabling Secure. Plain vite preview has
no backend. Production starts `NODE_ENV=production npm start` after build; no server
was left running by this change.

**Existing DB warning:** old cookies/JWTs stop working. An inherited prototype DB
may contain publicly known legacy password hashes/provider placeholders. New seed
provisioning does NOT rotate existing DB credentials. Before exposing any inherited
data, securely reprovision/reset those credentials out of band; do not presume
upgrading files alone makes the old database trustworthy. Full data migration and
production provisioning remain gated work. Never delete an owner's DB to reseed.

## Real verification results

All implementation steps ran type-check/build before their commit. Test counts grew
152 → 153 → 160 → **171 passing** as review regressions were added. Final suite:
1 file, **171 passed, 0 failed**, observed 13.84 s on the final security-review run.

| Command/check | Real result |
|---|---|
| Frozen Bun re-install | Exit 0; checked 315 installs across 414 packages, no changes; 8 ms |
| npm test | Exit 0; 171 passed, including all 11 endpoints × six invalid credential contexts and six real roles, plus malformed-body 401/403 matrix |
| npm run typecheck | Exit 0; 0 errors/warnings; tsc --noEmit |
| npm run lint | Same compiler script; no independent style linter exists |
| npm run build | Exit 0; 642 modules; 1 large-chunk warning; recorded 777 ms |
| Output | HTML 2.31 kB / gzip 0.99; CSS 67.92 / 11.47; JS **1,072.06 / 272.98 kB** |
| Missing-secret actual npm start probe | Expected exit 1 before listening: JWT_SECRET configuration error |
| Bun audit --json | Exit 0, `{}`; zero returned advisories, not a security certification |

Vitest 5.0.5 + Supertest 7.3.1; temporary per-worker DB directories and random test
credentials, cleaned after the suite. Tests never use checkout `data/`, developer
.env credentials or a real gateway/SMS provider. Rate-limit/secret/session/fault-injection
checks hit real router/repository implementations, not stubbed successful responses.

## Approval boundary

No payment provider, SMS delivery, wallet, pricing/coupon/tax/shipping formula,
stock reservation or financial order-state rewrite was implemented. All related
Critical findings remain blockers. This is a security foundation, **not launch
approval**. Stop here and await owner approval for Phase B.
