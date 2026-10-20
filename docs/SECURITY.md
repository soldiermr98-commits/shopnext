# Security status and replacement requirements

2026-10-20. **NO-GO. L1 has not been implemented/tested.**
The [Phase A security contract](SECURITY_FOUNDATION.md) describes the archived Node
code only. Its successful tests must not be attributed to the future Laravel app.
The complete replacement acceptance is in [SPEC_FROM_LEGACY](SPEC_FROM_LEGACY.md).

Required L1: Sanctum stateful cookie+CSRF (not old JWT refresh), Secure/HttpOnly
session, explicitly tested SameSite, session regeneration/revocation, password
hashing/current-password proof/forced initial change, no bootstrap defaults or
role mass assignment. XSRF cookie is intentionally readable; auth cookie is not.
Reject unauthenticated protected API reads 401, wrong role 403, invalid stateful
CSRF mutations 419. Test those separately with valid CSRF in permission tests.

Preserve all six roles and Phase A resource matrix. shop_manager cannot read/write
settings or logs; content_editor/support/customer cannot use existing admin actions.
Every model has default-deny policies; UI/navigation visibility never authorizes.
FormRequests on every implemented route, bounded bodies/pagination/uploads, strict
nested fields and safe errors; exact credentialed CORS whitelist, trusted proxies,
security headers/CSP tested with self-hosted assets. Uploads are content/MIME/size
validated, randomly named, non-executable and path-authorized. No public diagnostics
or migration runner. Cache/session/limit state survives PHP request boundaries.

Settings encrypted with protected APP_KEY, safe DTO allowlist, only masked/isSet
reads and explicit newValue writes, omitted secrets preserved, masks rejected;
no decrypted model serialization/request logging. Log admin actor/action/object/time
with redacted field names; never passwords/tokens/provider credentials/PII bodies.
Back up the key separately and test decryption/restore; no implicit key rotation.

OTP remains 503 until approved real SMS (still validate/throttle). No fake payment,
provider call, SMS transport or domain resources in L1. Existing checkout/client
prices/COD/wallet/state machine remain unsafe and must not be deployed. Original
photo hotlinks removed from active source; dynamic API/localStorage media validation
and browser network checks are still outstanding. Legal/invoice/review/SEO prototype
claims remain unverified and must not be advertised as real capabilities.

Required verification: isolated MySQL/Pest constraints/auth/policy/CSRF/secrecy/limits/
password/upload/log tests, source/bundle secret review without printing values,
platform/PHP8.2/8.3 checks, actual browser/TLS/host acceptance. Header unit tests
are not a browser/XSS certification. No real credentials, provider requests or
production database were used for current verification; legacy tests create random
fixture secrets and disposable local databases. Historical provider-looking strings
were not rotated or declared harmless. Never reset existing owner data implicitly.

Reporting: share minimal redacted reproduction through the repository owner's
private contact channel; do not open public issues containing tokens, env, payment
payloads or customer data. Preserve evidence without publishing secret values.
