# Process gate and artifact delivery verified; single Jalali trial prepared

b3ffbcf / [push CI39727301474](https://github.com/soldiermr98-commits/shopnext/actions/runs/39727301474)
and [PR CI39727305225](https://github.com/soldiermr98-commits/shopnext/actions/runs/39727305225):
ALL8 SUCCESS on both after atomic result publication. Push artifact inventory
contains all eight diagnostic bundles. The failed PR run described below remains
historical RED; it was fixed, not erased by a rerun. Financial invariants and all
five real process/SQL races remain gates.

Next: one opt-in workflow_dispatch Jalali trial, isolated runner checkout only,
ariaieboy/filament-jalali 3.1.0 against locked Filament5.10.3. Candidate's actual
shipped JS selection/serialization/re-display runs under three runtime timezones,
including midnight, Nowruz and leap-day cases. Its actual Filament view, transport
state, persisted Gregorian UTC timestamp and reload are probed with Livewire/Pest.
This is NOT yet executed and NOT an end-to-end browser/RTL/a11y claim. Production
composer.json/lock remain unchanged. An unproven candidate is not accepted; ship
specified Gregorian-picker/Jalali-preview fallback instead, with no second package
iteration. All original eight gates must pass this preparation commit first.

# Process correction: real result-publication race found; fix pending CI

e62a8f8 / [push CI39726822127](https://github.com/soldiermr98-commits/shopnext/actions/runs/39726822127): ALL8 SUCCESS.
[PR CI39726826102](https://github.com/soldiermr98-commits/shopnext/actions/runs/39726826102):
7/8 SUCCESS; PHP8.2/MariaDB11.4 failed the cancel/pay race with JsonException in
FinancialRace.php:47. The worker created `.result` before finishing its JSON write;
the parent treated existence as completion. No evidence of a financial invariant
failure; that run is nevertheless NOT accepted. Redacted diagnostics now actually
upload: all eight diagnostic artifacts are present in the PR run inventory,
including `diagnostics-php8.2-mariadb-11.4.` with the failure (5615 bytes).

Fix: publish worker results by same-directory atomic rename after a checked,
closed write; reap each worker before decoding. Existing separate-PID/SQL-session,
overlap, last-stock, coupon, wallet, paid-once and cancel/pay assertions unchanged.
Two new PHP regression tests exercise complete large JSON/replacement and invalid
JSON fail-closed publication. Execution of this correction remains PENDING CI.
No rerun-to-hide, retries, sequential fallback, financial code or L2 tag changes.

# L3a process revision — eight gates verified; artifact correction pending

7c67d9b / [push CI39726383989](https://github.com/soldiermr98-commits/shopnext/actions/runs/39726383989)
and [PR CI39726390029](https://github.com/soldiermr98-commits/shopnext/actions/runs/39726390029):
ALL8 SUCCESS on both. Independent Pint --test gates the original seven jobs;
no database container or application boot in the fast style job. Python diagnostics
redaction/exit-code tests passed. GitHub skipped diagnostic artifact uploads because
upload-artifact v4 excludes hidden directories by default. This correction explicitly
includes the isolated, redacted `.ci-reports/` directory (not other hidden files).
Artifact delivery remains UNVERIFIED until the correction's full workflow and
artifact inventory are inspected. No gate/assertion is removed.

# L3a shell checkpoint — verified, NOT full L3a

98cfd43 / [CI39724414478](https://github.com/soldiermr98-commits/shopnext/actions/runs/39724414478):
ALL7 SUCCESS. EACH of six PHP/database jobs passed226 tests,6844/6845 assertions
(valid cancel/pay race outcome). All5 REAL separate-process financial races ran in
EACH job again. Exact per-job results: [shell manifest](ci/l3a-shell-verified-matrix.json).
Frontend checks and the configured real no-dev package smoke succeeded as well.

Executed new tests: Persian/RTL HTTP shell/local font/scoped locale;6 independent
role cases for dashboard/widget/secret-page authorization; bounded2-query heartbeat
and Persian digits. Existing OperationsTest checks actual queue processing and
Persian stale/healthy rendering. No DB/schema changes in this slice. Catalog/media/
stock/Jalali controls are still PENDING. No l3a-complete tag or browser/host claim.

## Red history and correction (same concern; no bypass)

- CI39723437326 (1b0cb02),39723650644 (8968d45),39723879111 (f2c8356),
  39724063635 (9731aa7),39724272554 (cfee362): failed Pint before Pest. Frontend
  success does NOT make these runs accepted. No PHP runtime proof claimed for them.
- Job ZIP retrieval returned EOF. Added --test reporter annotations preserving the
  nonzero exit. A missing newline joined JSON to the first annotation; isolated
  stub-Pint wrapper tests reproduced and fixed that transport issue while retaining
  both success0/failure1. These stub tests are NOT actual PHP/Pint execution.
- Final visible metadata: CronHeartbeat.php, self_static_accessor. Because the
  class is final, use self::canView(), keeping exactly the same authorization.
- No Pint rule/test assertion disabled.98cfd43 reran the full matrix to green.
  Diagnostic schema guesses during troubleshooting were hypotheses, not findings.

Documentation-only consolidation of this verified slice is the current commit;
its own complete matrix must also pass before the next concern. ADMIN_PANEL.md
separates actual REAL/tested actions from the many pending L3a resources.

## Completed L2 evidence (historical)

# Current L2 financial evidence

Tagged gate:5120dad / [CI39602866142](https://github.com/soldiermr98-commits/shopnext/actions/runs/39602866142),
ALL7 SUCCESS;218 tests and6789/6790 assertions per SQL/PHP job. All five real
parallel scenarios executed in each. `l2-complete` remains pinned to this commit.

Code40abc65: CI39601812389 ALL7 SUCCESS; details in
[ci/l2-code-verified-matrix.json](ci/l2-code-verified-matrix.json).
Five real separate-process races executed in EACH of six SQL/PHP jobs; full per-worker
proof artifacts are attached to the run (7day retention). The committed summary
records actual observed outcomes; the harness asserts separate PIDs/connections,
same database and overlapping operation intervals. No sequential simulation fallback.
The completed documentation-commit gate is recorded in the annotated l2-complete tag. [Coverage/limits](L2_ACCEPTANCE.md).

## Historical evidence below (pending notes superseded above)

# CI evidence — L1 complete, L2 checkpoints (NOT complete)


## L2 executed checkpoints — NOT l2-complete

- Pricing4a76d51: [39581254064](https://github.com/soldiermr98-commits/shopnext/actions/runs/39581254064),7/7 green,173/6437 each backend job.
- Wallet primitives63088db: [39582169761](https://github.com/soldiermr98-commits/shopnext/actions/runs/39582169761),7/7 green,180/6482 each.
- Cart/login8080bfe: [39583400561](https://github.com/soldiermr98-commits/shopnext/actions/runs/39583400561),7/7 green,187/6525 each.
- Cart/quote API03238d6: [39584222988](https://github.com/soldiermr98-commits/shopnext/actions/runs/39584222988),7/7 green,192/6615 each.
- Runtime/config hardening8178a52: [39584953220](https://github.com/soldiermr98-commits/shopnext/actions/runs/39584953220),7/7 green,193/6619 each.
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
