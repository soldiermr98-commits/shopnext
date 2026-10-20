# Security status — 2026-10-21

**L1a/auth slice verified; overall L1 incomplete. NO-GO.**
[Current auth contract](L1_AUTH.md) · [Real CI evidence](CI_RESULTS.md) ·
[Full replacement acceptance](SPEC_FROM_LEGACY.md).

Verified: Sanctum cookie-only stateful SPA auth, real CSRF enforcement in tests,
Secure/HttpOnly/Strict host-only session, no Bearer/JWT/demo/token issuance,
password proof/rotation/byte bounds/session revocation, forced initial administrator
change, input validation and distributed-compatible rate limits (DB cache tested).
Six-role default-deny server policies cover every application model; independent
66-case legacy role/action policy matrix, owner checks and inactive/must-change gates.
Staff authenticate through actual Filament login/profile components; no business
resources. Administrator bootstrap only from private env, guarded and no reset.

Pending / not certified: encrypted settings/newValue/masked DTOs, admin activity
logging, explicit security headers/CSP/CORS/proxy/upload/body perimeter, operational
deploy checks/cron/queue/heartbeat, actual host/browser/TLS/RTL/a11y acceptance. A
model's hidden field does NOT encrypt stored values. Original legal/invoice/payment
claims and non-auth demo panels are not trusted functionality. No production/provider
credentials were used or rotated; inherited legacy accounts/data were not imported.

The archived Node Phase A contract differs from Sanctum and is not the new backend.
Passing171 legacy tests is not Laravel coverage. The new131-case Pest suite is a
foundation, not financial correctness, provider certification or all deferred HTTP
business action tests. Preserve APP_KEY securely; no public diagnostics or migration
runner. Never publish env/password/session/provider/PII payloads in reports or logs.

Security reports should go privately to the repository owner, with minimal redacted
reproduction, not public issues containing tokens, env or customer/payment data.
