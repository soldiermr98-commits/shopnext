# CI evidence — L1 complete, L2 checkpoints (NOT complete)


## L2 executed checkpoints — NOT l2-complete

- Pricing4a76d51: [39581254064](https://github.com/soldiermr98-commits/shopnext/actions/runs/39581254064),7/7 green,173/6437 each backend job.
- Wallet primitives63088db: [39582169761](https://github.com/soldiermr98-commits/shopnext/actions/runs/39582169761),7/7 green,180/6482 each.
- Cart/login8080bfe: [39583400561](https://github.com/soldiermr98-commits/shopnext/actions/runs/39583400561),7/7 green,187/6525 each.
- Cart/quote API03238d6: [39584222988](https://github.com/soldiermr98-commits/shopnext/actions/runs/39584222988),7/7 green,192/6615 each.
- Per-job evidence: docs/ci/l2-*-verified-matrix.json. Real SQL, no SQLite substitute.
  Red39583138981 (JSON fixture missing cookies) and39583987683 (60/61 throttle test
  off-by-one) were diagnosed; corrected tests rerun fully, no assertion bypass.
- No order lifecycle/checkout orchestration/concurrency evidence yet; these are
  sequential domain/API proofs, not parallel-spend or last-stock/coupon proofs.
  No L2 tag, storefront financial wiring, host/browser/TLS acceptance or launch claim.

## Historical L1 evidence

2026-10-21. Code checkpoint **1c0d09c**, [run39539510764](https://github.com/soldiermr98-commits/shopnext/actions/runs/39539510764), SUCCESS:
**all seven jobs green; 160 Pest tests / 1,028 assertions in EACH real DB job**.
Machine-readable runtime/job/check evidence:
[ci/l1-complete-verified-matrix.json](ci/l1-complete-verified-matrix.json).

| PHP | Server actually executed | Pest | Assertions |
|---|---|---:|---:|
|8.2.34|MySQL8.0.46|160|1028|
|8.3.35|MySQL8.0.46|160|1028|
|8.2.34|MariaDB10.6.28|160|1028|
|8.3.35|MariaDB10.6.28|160|1028|
|8.2.34|MariaDB11.4.13|160|1028|
|8.3.35|MariaDB11.4.13|160|1028|

Every backend job installs/checks the actual Composer lock, PHP extensions,
Pint, migrate:fresh and Pest; Pest executes down/up and direct SQL rejection, not
SQLite. GD AND Imagick raster branches, actual UTC DB session, cookie CSRF,
native Filament login/profile/settings/heartbeat, role policies and operational
failures are tested. No skipped optional-engine tests substitute for execution.

The PHP8.2/MySQL job additionally builds a fresh no-dev vendor+SPA ZIP, checks its
contents/exclusion of secrets/dev/legacy, extracts and serves its actual private/
public layout, loads local assets, verifies API errors/Filament, activates a token
runner, applies a pending probe migration, confirms unlink-before-execute and replay
404. The fixture migration is added ONLY in extracted ephemeral CI files. Package
artifact: `shopnext-l1-upload`, retention7 days. HTTPS server state is SIMULATED in
this loopback HTTP smoke; it is not browser/TLS or host acceptance.

Frontend job: frozen Bun1.4.3 install with Node22.22.3, typecheck,
7 native frontend tests,171 archived Node/sql.js regressions and Vite build.
Those171 are NOT Laravel tests or financial certification. Vite's large-chunk
warning and GitHub action Node-runtime deprecation notices are non-failing warnings,
not suppressed test failures.

## Green checkpoints (full CI inspected before next concern)

| Scope | Commit | Green run |
|---|---|---|
|L1a full schema|aa8f121|[39503509710](https://github.com/soldiermr98-commits/shopnext/actions/runs/39503509710)|
|Approved L1a/auth baseline,131/728|a36c0c0|[39507428034](https://github.com/soldiermr98-commits/shopnext/actions/runs/39507428034)|
|Native staff flood / non-enumerating lockout|03153b4|[39536254937](https://github.com/soldiermr98-commits/shopnext/actions/runs/39536254937)|
|Encrypted settings / audit / safe failure|65b751e|[39536939481](https://github.com/soldiermr98-commits/shopnext/actions/runs/39536939481)|
|Same-origin perimeter / upload / HTML sanitizer|df41f4e|[39537588373](https://github.com/soldiermr98-commits/shopnext/actions/runs/39537588373)|
|Real queue/scheduler/heartbeat/deploy-check|ae71b52|[39537885131](https://github.com/soldiermr98-commits/shopnext/actions/runs/39537885131)|
|No-dev ZIP / actual extracted HTTP / runner|44a9de4|[39538655318](https://github.com/soldiermr98-commits/shopnext/actions/runs/39538655318)|
|Both raster engines / actual log redaction / admin CSRF / UTC|17ed876|[39538969337](https://github.com/soldiermr98-commits/shopnext/actions/runs/39538969337)|
|Body cap / fail-closed host and proxy config|2085f9d|[39539231897](https://github.com/soldiermr98-commits/shopnext/actions/runs/39539231897)|
|Activation layout / scheduler failure / readiness failure paths|1c0d09c|[39539510764](https://github.com/soldiermr98-commits/shopnext/actions/runs/39539510764)|

Release procedure: documentation-only commit must ALSO pass the full workflow
before applying `l1-complete`. The final tagged commit's checks are available in
[branch workflow history](https://github.com/soldiermr98-commits/shopnext/actions/workflows/backend.yml?query=branch%3Aarena%2Fc101d8c3-shopnext).
The JSON above intentionally identifies the executed code checkpoint, not an
invented future run id. Final CI URL is reported with the release tag in the handoff.

## Red runs were read and fixed, not bypassed

- b1fabba/39536632071 and diagnostic c4c8497/39536803491: new audit migration
  duplicated existing legacy ip_address. Read actual SQL failure; reuse existing
  user_name/user_role/ip_address and add only before/after. No constraint removed.
-225708b/39537388620: fixture server variables did not change URI host/scheme;
  tests now send real absolute URIs. Fruitcake's single-origin optimization safely
  sends the configured origin even on a foreign preflight; StrictCors further
  removes ACAO/credentials for foreign origins to enforce the exact contract.
-32c6e33/39538446295: all154 Pest cases passed, but extracted fresh .env had no
  APP_KEY and smoke returned500. Generate an ephemeral CI-only key, never ship it.
  The corrected run built/extracted/served/migrated the real package successfully.

Older baseline artifacts [l1a-l1b-verified-matrix.json](ci/l1a-l1b-verified-matrix.json)
and Composer solve records remain historical; their smaller counts are superseded.
Local native PHP/Pint syntax/style are not database/Pest evidence. Full acceptance
on the owner's real browser, host, TLS, FTP, cron/process limits and restore remains
**UNVERIFIED**: [ACCEPTANCE](ACCEPTANCE.md). No L2 or production launch approval.
