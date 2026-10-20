# Decision memo — repair versus backend replacement

2026-10-20. Decision proposal only; **no implementation approved or applied**.
Evidence: [audit](AUDIT_REPORT.md), [runtime checks](TEST_RESULTS.md),
[architecture](ARCHITECTURE.md), [schema](DATABASE.md).

## Recommendation

**Keep the UI/design assets, replace the backend/domain core incrementally behind
explicit API contracts.** Do not throw away the whole repository and do not
attempt to launch by merely removing demo-token literals. Auth, pricing, inventory,
payment, wallet and persistence boundaries all need redesign; most remaining admin
writes do not exist. A tightly scoped backend replacement is lower systemic risk
than layering production money flows onto this prototype's current assumptions.

This means new implementations of authentication/authorization, validated business
services, transactional persistence/migrations and provider adapters—not swapping
Express just for fashion. Express/TypeScript can remain. Keep existing route paths
where safe and introduce tested contracts; alter frontend behavior only after
approval. A native SQLite proof-of-concept is possible for a single small instance,
but **PostgreSQL with transactions, constraints and migrations is the recommended
production order store** for expected workers/growth/reconciliation.

## S/M/L meaning and uncertainty

S: bounded isolated task. M: several integrated changes. L: cross-cutting domain
work with regression/migration requirements. These are relative effort estimates,
not delivery-time promises. Team size, desired feature scope, official provider
contracts, approved tax/currency rules and deployment targets remain unknown.
Both strategies are **L overall** to launch safely; replacement is not a shortcut
to missing business requirements.

| Area | Repair in place | Keep UI / replace backend | Risk / dependencies and reusable portion |
|---|---|---|---|
| Emergency containment/demo removal | S–M | S–M | Both need fail-closed auth and no public real-data deployment first; not yet authorized |
| Auth/session/OTP/RBAC | L | L | Existing bcrypt/JWT call patterns reusable concepts, resolver/guards/demo identity semantics must be replaced; secure session and permission contract first |
| Database/migrations/persistence | L | L | Repair still needs atomic writes + migrations/FKs; schema is a requirements sketch, not a production migration; no real-data migration attempted |
| Catalog/product/variants | M–L | M–L | Product/category UI and field inventory reusable; repository whitelists, JSON model and variant lifecycle need redesign/test coverage |
| Pricing/coupons/tax/shipping | L | M–L | One authoritative server pricing service in either option; UI can consume quotes instead of divergent formulas; tax inclusion/unit policy needs owner decision |
| Stock/order state machine | L | L | Replace stock-before-order/no-transaction semantics; reservation, cancellation, expiry and compensations must be specified |
| Gateway lifecycle/reconciliation | L | L | No adapter to repair; implement from scratch in both. Official contracts and test credentials are blockers |
| Wallet/refunds/returns | L | L | UI mock screens reusable presentation; durable immutable ledger/refund authorization absent in both paths |
| SMS providers/templates/queue | M–L | M–L | Existing pattern labels/page layout reusable; all transport, expiry, attempts, retries and delivery receipts new |
| Settings/secrets/permissions | M–L | M | Replace arbitrary shallow JSON/echo with typed scoped DTOs, secret write-only management and permissions |
| Admin taxonomy/content/marketing/media | L | L | Forms/cards mostly reusable, persistence missing; upload validation/storage/optimization new |
| Storefront/account integration | L | M–L | Keep layout/routing/cards/RTL design, replace fake datasets and wire real APIs/error states |
| Theme/content publishing | M | M | Preserve semantic CSS/preset UI; server publication/versioning/layout renderer missing |
| Regression/security/provider tests | L | L | No suite exists; build up around approved invariants before rollout |
| Deployment/monitoring/backup/SEO | M–L | M–L | Static build works; need production runbook, restore tests, observability and per-page SEO |

## What can be reused honestly?

**High presentation reuse:** Persian/RTL layout, navigation/drawers, product/shop
cards, admin table/form/modal scaffolding, typography/color design, responsive JSX,
static build pipeline. These require accessibility/visual testing, not presumed
production certification.

**Selective reuse:** Persian digit/Toman helpers; Jalali algorithm passed 4,018
comparisons but timezone policy must change. Domain types and database schema can
inform contract/domain design, but types are not validation and current money/order
semantics cannot be preserved blindly. Route names/API wrapper patterns can be
kept with explicit failures instead of fake success/fallback identities.

**Low backend behavior reuse:** identity resolver, authorization model, order/stock
mutation, financial state, JSON settings masking, full-file sql.js persistence.
Their failure modes are demonstrated, not speculative style concerns. Existing
query/mapping snippets may help migration but are not a trusted service layer.

No credible reuse percentage by LOC is assigned: keeping 80% of JSX would not mean
80% of production behavior exists. UI-heavy code size overstates business readiness.

## Trade-offs

- **Repair benefit:** fewer initial contract changes; easier visual continuity.
  **Risk:** incremental patches retain coupled demo assumptions; fixes to auth do
  not create missing financial services. Completion remains L and audit burden high.
- **Replacement benefit:** clear domain boundaries, transactional foundation,
  testable pricing/adapters and less hidden inheritance. **Risk:** contract drift,
  overengineering and integration regressions if attempted as a big-bang rewrite.
  Mitigate with vertical slices, fixtures and approved acceptance tests.

## Proposed approval gates (not implementation)

1. Confirm production feature scope, currency/tax/shipping policy and gateway/SMS
   providers. Keep current app offline/isolated from real users/data.
2. Approve fail-closed identity + typed API contracts + transactional DB baseline.
3. Deliver/test one vertical slice: catalog → server quote → stock/order → sandbox
   payment → verified transition. No wallet/COD marked paid on submission.
4. Connect admin writes/account flows, then queued SMS/media/theme/content publishing.
5. Require complete regression/security tests, reconciliation, restore drill and
   official provider validation before release.

**Decision requested:** approve the recommended backend-core replacement direction,
choose repair-in-place instead, or request a narrower scoped plan. No code changes
will follow this memo without approval.
