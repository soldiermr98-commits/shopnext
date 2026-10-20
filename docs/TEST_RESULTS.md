# Phase 3 — executed checks and limitations

> **Historical baseline:** Phase A changed authentication, settings, validation and
> persistence error handling. See [current security contract](SECURITY_FOUNDATION.md)
> and the [audit status update](AUDIT_REPORT.md#phase-a-status-update--2026-10-20).
> Older route line numbers/test outputs below describe the audited baseline.

Date: 2026-10-20. Audited source baseline: `0d39bd04056f4d1453ce205010abcd047b8537ca`.
[Audit report](AUDIT_REPORT.md) · [Decision memo](DECISION_MEMO.md).
No application source, manifest or lockfile modifications. No real provider calls.

## Environment and install

- Node **v22.22.3**, npm **10.9.8**, Linux sandbox.
- Bun was initially absent; installed **1.4.3** into an external audit-tools directory
  through npm. No repository tooling/dependency change.
- Command: `bun install --frozen-lockfile` using that external executable.
- Exit **0**, **253 packages installed**, reported **1197 ms**. **0 emitted warnings,
  0 errors**. `bun.lock` unchanged. Exact direct locked versions: [inventory](DEPENDENCIES.md).
- `bun audit --json`: exit **0**, output **`{}`**, **0 advisories returned** at query
  time. This is not a proof of no vulnerabilities or a substitute for code review.

## Actual type-check/build/test output

### `npm run lint` (actually TypeScript, NOT a linter)

Exit **0**, **0 TypeScript errors, 0 emitted warnings**.

```text
> react-example@0.0.0 lint
> tsc --noEmit
```

No independent ESLint/style/security linter is configured or claimed to pass.
`strict` is not enabled; `skipLibCheck` is enabled. Type-check success therefore
is weak evidence of runtime correctness.

### `npm run build`

Exit **0**, **0 errors, 1 warning block** (chunk exceeds 500 kB). Vite **8.3.4**,
**640 modules transformed**, reported **749 ms**.

```text
dist/index.html                     2.31 kB | gzip:   0.99 kB
dist/assets/index-1FSAj9At.css     67.95 kB | gzip:  11.48 kB
dist/assets/index-DuPRxlpu.js   1,072.91 kB | gzip: 273.40 kB
```

```text
[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking:
  https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

These are frontend outputs, not a compiled backend deployment. Bundle literals
were checked without printing values: credential-shaped source literals from
`AdminSmsPage.tsx:127`, `AdminPaymentPage.tsx:41–112` and the demo password preset
at `AuthModal.tsx:130` occur in the built JS. Real provider validity UNVERIFIED.

### `npm test`

Exit **1**, **one command failure** because the script is absent, **zero tests
executed** (not a failing existing test suite):

```text
npm error Missing script: "test"
npm error
npm error To see a list of scripts, run:
npm error   npm run
```

No tracked test runner/config/test files found. No coverage percentage available.

## Runtime methodology

Temporary external `.mts` harnesses imported the **unmodified** database,
repositories and apiRouter using the installed tsx loader. Express JSON/cookie
parsing and `/api` mount replicated the relevant server stack. Listener was
**loopback-only on an ephemeral port**, and was closed after checks. The normal
public `server.ts` listener was NOT exposed. Writable cwd/database lived outside
this repository. Seed data was generated there, and all mutation inputs were
synthetic. JWT role fixtures used a private ephemeral audit signing secret.
Tokens, hashes, provider-shaped settings and full response bodies are not included
in these docs. Read/status/boolean/numeric observations below are sanitized.

This tests the real router/repositories, not a mock handler, but is NOT a browser,
full deployment, TLS/reverse-proxy, gateway, SMS or load test. Guard matrix covers
11 endpoints × 12 identity contexts = **132 requests**; details in the report.
Read routes plus mutations were exercised with valid fixture bodies. Mutations
were not sent to any existing user database.

### Runtime observations (security invariants fail)

| Check | Observed result |
|---|---|
| Every admin endpoint, anonymous/invalid bearer/expired JWT/unknown subject/invalid cookie | All return 200 (55 requests); auth boundary FAIL |
| Every admin endpoint, accepted demo-admin credential | All return 200 (11 requests); bypass confirmed |
| Every admin endpoint, valid customer/support/content_editor JWT | All return 403 (33 requests); role comparison exists |
| Every admin endpoint, valid shop_manager/admin/super_admin JWT | All return 200 (33 requests); no per-resource permissions |
| Anonymous order-detail read | 200; full order returned |
| Customer reads another user's order | 200; returned owner differs from JWT user |
| Item unit price supplied as 1, payment wallet | 200; subtotal=1, paid=true, status=awaiting_payment; stock 1→0 |
| Same wallet test | Wallet balance unchanged before/after; no debit |
| Negative quantity=-3 | 200; itemsCount=-3; base stock 0→3 |
| OTP verify after ten-minute clock advance | 200 + auth token; stored three-minute expiry ignored |
| GET/PUT settings with synthetic credential sentinels | GET masks nested Melipayamak but not Faraz field; PUT returns sentinel unmasked |
| Injected disk-write error in isolated process | PUT settings returns 200; memory changed, disk bytes unchanged; two swallowed failure logs |
| Password change with valid customer JWT but no oldPassword | 200; stored hash changed and matches supplied new password |
| Coupon fixture expired in 2000 with usage count above limit | 200; discount=100 accepted |
| Draft product public detail | 200 |
| OTP URLs actually called by AuthModal | Both POST requests return 404 in router harness |
| Invalid admin pagination value | 200, not validation error; falsy NaN limit bypasses LIMIT clause |
| Arbitrary unsupported order status | 200; unsupported string persisted |
| GET masked settings then PUT whole object | Masked merchant display overwrote stored synthetic value |
| Transactions count after synthetic paid-wallet order | 0; no provider/ledger transaction inserted |

Wallet before/after was captured around order creation; no account balance
changes were made between the two reads. OTP test advanced Date.now temporarily
in the isolated harness, restoring it afterward; no production timer was changed.
Disk-error test temporarily threw from fs.writeFileSync, restoring it afterward.
These are fault-injection checks, not source changes or deployed mitigations.

### Persistence/conversion supplemental checks

- **Two independent SQLite image model:** both loaded the same real fixture DB
  snapshot through sql.js. First image changed settings; second stale image
  changed settings and exported last. Reopening last export lost first update.
  This deterministically models current multi-worker last-export-wins risk. It is
  NOT a production load benchmark or proof that single-thread JS overlaps writes.
- **Jalali:** compared `gregorianToJalali` with Node Intl Persian calendar for
  every valid Gregorian date in 2020–2030: **4,018 comparisons, 0 mismatches**.
  This does not validate every historic/future year or browser timezone behavior.

## History scope and reproducibility

Initial clone was shallow. Ran `git fetch --unshallow origin` (exit 0); afterward
`git rev-parse --is-shallow-repository` = false. Scanned all **4 commits reachable
from local refs** before Phase 3 commit. Origin advertised only main and no tags
when checked with `git ls-remote --heads --tags origin`; that history is covered.
See [history report](SECRET_HISTORY.md).
GitHub-only deleted refs, unreachable remote objects, PR artifacts, CI logs,
external deployment secrets and unpushed other clones are outside this scope.

## Artifacts and remaining unverified work

Temporary harnesses, raw command logs and synthetic DB files are external scratch
artifacts, **not committed**; this file records the exact commands, methodology
and sanitized observations. Future approved work should turn these observations
into checked-in regression tests. No application patch accompanies the audit.

UNVERIFIED: real gateway endpoints/error maps/Rial conversion contracts/IP rules,
SMS provider interoperability, browser accessibility/RTL/screenshots, production
load/corruption recovery, deployment restore drill and real tax-invoice compliance.
Official provider hosts are outside sandbox outbound allowlist. Nothing here
certifies payment or tax/legal correctness.
