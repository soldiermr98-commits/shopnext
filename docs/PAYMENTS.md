# Payment architecture — implementation gaps

Phase 2 static inspection, 2026-10-20. [API](API.md) · [Flows](FLOWS.md) ·
[Settings](SETTINGS.md) · [Database](DATABASE.md)

## What exists

Checkout offers sep, zarinpal, wallet and cod labels. Order creation records a
payment method/gateway and paid/status flags (`server/api.ts:450–603`). Admin
payment page uses INITIAL_GATEWAYS and INITIAL_TRANSACTIONS in React state.
Shared StoreSettings has gateway-shaped fields; general settings can persist JSON.
The transactions table declares amount/authority/ref_id/rrn/status/raw_response,
but there is no transaction repository or payment execution route.

## Provider/interface/config inventory

| Provider/method | Implemented integration | Config source and limitations |
|---|---|---|
| ZarinPal | No adapter/request/verify/callback | Nested gateways settings; merchant ID masked on GET only; checkout label |
| Zibal | No server implementation | No verified live configuration path/consumer |
| Aghaye Pardakht | No server implementation | No verified live configuration path/consumer |
| SEP/other displayed gateways | UI demo only | AdminPaymentPage local gateway config and transaction constants |
| COD | Order flag branch only | processing + isPaid=true at create; no settlement tracking |
| Wallet | No ledger/debit/verification | isPaid=true without debit; account wallet top-up is local UI simulation |
| Card-to-card | No receipt/reconciliation workflow | Domain type string alone is not a feature |

There is **no payment adapter interface**, provider module directory, executable
provider config file, endpoint map or error-code map. No HTTP request to a gateway
is made in the server implementation inspected. Do not bypass a future adapter
layer by adding calls to checkout components.

## Units and safety boundaries

UI currency formatting is Toman. StoreSettings permits IRT/IRR; no boundary
conversion to Rial is implemented. There is no amount comparison against gateway
verification, persisted authority binding, signature validation, callback replay
guard, double-verify/idempotency mechanism or transactional paid/stock state
change. Stock currently changes before any payment and client-controlled prices
are preferred. See [actual sequence](FLOWS.md#payment-request-redirect-callback-and-verification).

## Official documentation verification

Gateway endpoints, amount units, error codes, callback fields, sandbox behavior,
IP restrictions and reconciliation/refund semantics are **UNVERIFIED** against
current official provider documentation. The sandbox's outbound access does not
include official gateway hosts. No endpoint correctness or provider connectivity
claim is made. Phase 3 must explicitly retain this verification blocker.

## Adding a provider / sandbox / go-live

No existing adapter extension point or runnable sandbox test is available.
The following is a **proposed contract for later approval**, not current code:
central server adapter with requestPayment, verifyPayment and normalized outcomes;
persist order-bound amount/unit/authority before redirect, verify server-side,
handle retries idempotently, update stock/order atomically and dispatch SMS only
after durable success. Never accept browser-supplied prices as authoritative.

Before any sandbox testing: approve/implement auth hardening, authoritative pricing,
transaction lifecycle/adapter, provider-specific unit/error mappings and tests.
Then verify success, failure, timeout, duplicate callbacks, wrong amount/order,
insufficient stock and concurrent requests using test credentials only. Go-live
requires official contract review, HTTPS public callback, configured production
credentials in server-only secure storage, approved hosting/IP policy, monitored
reconciliation and recovery/backup procedures. These steps have NOT been executed.
Full operational instructions will be finalized in Phase 4, not invented here.
