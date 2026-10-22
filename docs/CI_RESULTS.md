# Product metadata VERIFIED; numeric slug identity guard pending CI

85bea48 / [push CI39746880119](https://github.com/soldiermr98-commits/shopnext/actions/runs/39746880119)
and [PR CI39746886226](https://github.com/soldiermr98-commits/shopnext/actions/runs/39746886226):
ALL8 SUCCESS; all six SQL jobs308tests8782/8783assertions and five real financial
races. [Exact core matrix](ci/l3a-product-core-verified-matrix.json).

Before variants, close an identity ambiguity found in the retained public endpoint:
it accepts either slug or numeric ID, so purely ASCII-numeric slugs could alias a
different product ID. New/edited metadata now reserves that namespace and returns
Persian validation, rather than changing existing URLs or inventing redirects.
Regression rejects an alias and checks both canonical ID and mixed slug resolve to
the correct real persisted prices. This narrow guard's CI is PENDING. Legacy
production numeric slugs require reviewed cleanup; none are silently renamed.

# Attribute/term editors VERIFIED; product metadata core pending CI

B430903 / [push CI39743792019](https://github.com/soldiermr98-commits/shopnext/actions/runs/39743792019)
and [PR CI39743800775](https://github.com/soldiermr98-commits/shopnext/actions/runs/39743800775):
ALL8 SUCCESS. All six SQL jobs292 tests8592/8593assertions and five actual financial
races. [Exact editor matrix](ci/l3a-attribute-editor-verified-matrix.json). All new
attribute/term route/action/owner/hex/image/large-list regressions executed.

Next sub-step adds Products metadata service, strict integer/Persian digit parser,
full_description sanitizing cast, SEO/publication/trash columns, actor-audited
soft-delete/restore and bounded eager brand lists. Shared CatalogPublication applies
the same effective UTC scheduled/deleted visibility to public catalog and locked
pricing; no cron status rewrite, no financial arithmetic changes. Unicode slug
routes retain bounded Unicode letter/number/separator validation (Laravel UTF-8).
No product editor exposed yet, no matrix/gallery/content graph/bulk/media/stock
implementation claimed. New core runtime PENDING CI; stock input is prohibited.

# Attribute/term DOMAIN VERIFIED; editor runtime pending CI

Ec044d4 / [push CI39741032336](https://github.com/soldiermr98-commits/shopnext/actions/runs/39741032336)
and [PR CI39741037990](https://github.com/soldiermr98-commits/shopnext/actions/runs/39741037990):
ALL8 SUCCESS, each SQL job280 tests8384/8385assertions and all5 real financial
races. Exact [attribute domain matrix](ci/l3a-attribute-domain-verified-matrix.json).
All domain role/SQL hex and composite owner FK/usage/safe-image/audit/query cases
executed against PHP8.2/8.3 × MySQL8/MariaDB10.6/11.4.

This sub-step now registers AttributeEditor and context-locked AttributeTermEditor
at /admin/attributes and /admin/attributes/{attribute}/terms. Actual service-backed
CRUD, color picker plus guarded canonical hex swatch, safe image upload and Persian
previous/next pagination. New action tests cover six roles and post-mount role
revocation, persisted audit/hex/order/image, SVG recovery/orphan cleanup, type and
usage guards, locked owner/cross-owner404 and1000-row query bounds. New screens
remain PENDING their own CI; browser/visual/keyboard accessibility UNVERIFIED.
Products/media/stock remain next, not started by this editor sub-step.

# Bounded diagnostics VERIFIED; attribute/term domain pending CI

9c3493a / [push CI39739168248](https://github.com/soldiermr98-commits/shopnext/actions/runs/39739168248)
and [PR CI39739172687](https://github.com/soldiermr98-commits/shopnext/actions/runs/39739172687):
ALL8 SUCCESS. Three diagnostic-tool tests including newest-tail retention passed;
full six SQL jobs and frontend unchanged.

Next taxonomy sub-step adds catalog_attributes, attribute_terms and a composite
owner-enforced product_attribute_terms pivot; shared product-management policies,
fresh/mutex-serialized Attributes service and explicit actor audit. Hex #RGB is
canonicalized to #RRGGBB, image terms reference existing SafeUpload rasters only.
Tests cover six-role CRUD, scoped uniqueness/type and usage guards, actual SQL hex
and owner constraints, safe images, audit rollback and1000-row query bounds.
New domain runtime remains PENDING CI. No attribute/term screen or product mutation
is exposed yet; no media/stock/later-phase concern started.

# Brand editor VERIFIED; diagnostic tail bound correction pending

5db7749 / [push CI39737666522](https://github.com/soldiermr98-commits/shopnext/actions/runs/39737666522)
and [PR CI39737671288](https://github.com/soldiermr98-commits/shopnext/actions/runs/39737671288):
ALL8 SUCCESS on both. Each SQL job270 tests8266/8267assertions; all5 actual financial
races each. Exact [brand matrix](ci/l3a-brand-verified-matrix.json). All brand
buttons/roles/persistence/logo/rejected-upload recovery/cleanup and1000-row query
checks executed. Category shared image adapter regressions remained green.

Before larger attribute/product suites, correct the existing diagnostic publisher's
6000-character tail to3000: the measured GitHub annotation limit is4096, so the old
size can truncate the most recent failure/test total. Full redacted artifacts and
18000-character job summaries are unchanged. New local regression verifies the
latest failure marker survives within the bound; all3 Python tooling tests passed.
This tiny reporter-only correction's full CI is PENDING. Attributes/terms next;
no package iterations or business/financial changes in this correction.

# Brand domain VERIFIED; brand screen/shared image adapter pending CI

4c24e6f / [push CI39736016898](https://github.com/soldiermr98-commits/shopnext/actions/runs/39736016898)
and [PR CI39736022048](https://github.com/soldiermr98-commits/shopnext/actions/runs/39736022048):
ALL8 SUCCESS. Each SQL/PHP job261tests (PHP8.2MySQL8:8159 assertions). Six roles,
real brand CRUD/actor audit, fresh flags, Persian slug/logo/referenced-delete
failures, audit rollback/default redaction and1000-row3-query pagination executed.

BrandEditor now wired through Brands. Shared HandlesCatalogImage extracts the
already-verified category upload guard, Persian callback, safe storage and failed
persistence cleanup; CategoryEditor tests remain unchanged. Brand screen button,
role, logo/cleanup and1000-row query/pagination regressions added. New screen and
shared-adapter regression runtime remains PENDING CI; attributes/terms not begun.

# Category editor VERIFIED; brands domain service pending CI

69388b7 / [push CI39734575452](https://github.com/soldiermr98-commits/shopnext/actions/runs/39734575452)
and [PR CI39734581936](https://github.com/soldiermr98-commits/shopnext/actions/runs/39734581936):
ALL8 SUCCESS. EACH six PHP/SQL job250tests8107/8108assertions and all5 actual SQL
process races. Exact evidence: [category matrix](ci/l3a-category-verified-matrix.json).
Real category screen/form/buttons, temporary SVG rejection, no false persistence,
valid replacement, failed-upload cleanup, SEO, tree/slug guards, both reorder
directions, delete and1000-row pagination/query bounds all executed successfully.
No visual/end-to-end browser/host/a11y/TLS/restore proof.

Next taxonomy sub-step introduces only Brands domain service/policy and shared
catalog lock/default-redacted audit helpers. Role/CRUD/slug/logo/delete/query/audit
regressions written, runtime PENDING CI. No brand screen yet, no next business
concern until ALL8 green. Category reorder limit500 siblings remains documented.

# Upload callback inheritance compatibility correction — no tests bypassed

ab6cb04 / push CI39734264577 and PR CI39734271475: style/frontend green;
six SQL jobs failed at Composer application boot (exit255), before Pest. Source
inspection confirms Filament5.10.3 InteractsWithSchemas already uses WithFileUploads;
BasePage therefore inherits its untyped _uploadErrored parameters. The override must
not narrow these inherited mixed parameters to string/bool. Match them with mixed;
keep actor authorization and Persian rejection. Composer app-boot output is now also
captured by the redacted report wrapper, closing this remaining diagnostic gap.
Corrected editor still PENDING full CI; no brands or later concern begun.

# Category editor upload-state failure diagnosed; fix pending

8850e70 / push CI39733779080 and PR CI39733786115: all six SQL jobs RED,
1 failed248 passed per job. Failure at CategoryEditorTest.php:83: after SVG temporary
upload rejection, clicking Save left no validation error. Existing Livewire config
already applies MediaRequest::FILE_RULES to temporary uploads. The form's getState
validation cleared that non-schema upload error while the upload property was null.

Fix: reject a pending imageUpload error BEFORE schema validation, translate the
upload error callback in Persian, and clear it only on a successfully replaced
TemporaryUploadedFile (or explicit new-form reset). Keep SafeUpload checks and
failed-new-file cleanup unchanged. Preserve failure assertion, assert no category
was created, add successful valid-replacement recovery test. No gate bypass or
next concern. Editor runtime remains PENDING until full corrected CI succeeds.

# Category domain service VERIFIED; actual editor pending CI

fddb89a / [push CI39732115679](https://github.com/soldiermr98-commits/shopnext/actions/runs/39732115679)
and [PR CI39732121080](https://github.com/soldiermr98-commits/shopnext/actions/runs/39732121080):
ALL8 SUCCESS on both. Each PHP/SQL job passed240 tests (PHP8.2MySQL8:7983 assertions).
All five real financial races retained. New category persistence, independent six
roles for all service operations, Persian failures, tree/slug/reorder/delete guards,
safe raster references, stale actor and audit rollback, four-query301-row list all
executed. Schema migration and real no-dev package smoke passed.

Next same taxonomy sub-step wires CategoryEditor through the service. New tests
cover each button, image upload/cleanup/SEO/real reorder and delete, fresh denied
roles and1000-row paginated rendering. This actual screen's execution remains
PENDING CI; no brand/attribute/product/media/stock concern started yet.

# Retained Jalali VERIFIED; category service sub-step pending CI

e5f6d6b / [push CI39731170215](https://github.com/soldiermr98-commits/shopnext/actions/runs/39731170215)
and [PR CI39731176780](https://github.com/soldiermr98-commits/shopnext/actions/runs/39731176780):
ALL8 SUCCESS on both. PHP8.2/MySQL8 passed230 tests7886 assertions, including
retained date-control SQL UTC save/reload and1000 Persian date renders with zero DB
queries; shipped JS12 selection/timezone cases passed. All six PHP/SQL jobs and
original five real concurrency races remained gates. No full browser/host proof.

Next strictly ordered concern starts taxonomy/categories with a real domain
service, explicit policy, SEO migration and serialization mutex, service-level
six-role/validation/image/query-count/audit rollback regressions. Screen/buttons
NOT YET WIRED. Execution of this new category sub-step remains PENDING CI. No
completion tag, next-phase approval, stock writes or financial behavior changes.

# Production integration formatting gate caught imports before SQL matrix

1db58d3 / CI39731080971 and PR CI39731085282: fast Pint correctly failed
`AdminDatesTest.php` (`fully_qualified_strict_types`, `ordered_imports`). No Pest or
long SQL matrix ran, exactly the intended fast-failure behavior. Add explicit
Carbon/InstalledVersions imports; no rules changed and no formatting repair runs
inside CI. Corrected production integration remains PENDING full eight-gate CI.

# Jalali production integration — pending full matrix

abd17e4 / [push CI39730442729](https://github.com/soldiermr98-commits/shopnext/actions/runs/39730442729)
and [PR CI39730448025](https://github.com/soldiermr98-commits/shopnext/actions/runs/39730448025):
all eight original gates SUCCESS; optional public lock capture SUCCESS on push.
Complete annotation transport reassembled and SHA256 verified before writing:
`d5edf8d6dc1944ddac6829f743caa33e24e7738b669ccf7d48886e9a82091138`.
Only two added packages, ariaieboy/filament-jalali3.1.0 and ariaieboy/jalali1.1.0;
all existing locked versions unchanged. This lock was generated by real Composer,
not hand-built. Local transport round-trip/quota/checksum tests also passed.

Production integration now uses a shared AdminDate Jalali field, Persian read-only
table/infolist formatting, explicit Tehran timezone and Gregorian UTC serialization.
Retained package component's twelve JS selection cases become a permanent CI
regression on PHP8.2/MySQL8; all six SQL jobs run form save/reload and date formatting
Pest regressions. Temporary opt-in trial/resolver jobs removed; eight gates remain.
This integration's runtime status remains PENDING until its own CI is inspected.
One successful candidate runtime trial, not multiple package iterations. End-to-end
browser clicking/RTL/a11y/host/TLS/restore are still UNVERIFIED. No completion tag.

# Measured annotation limits; bounded multi-step public lock transport

3f727cc / [push CI39730021177](https://github.com/soldiermr98-commits/shopnext/actions/runs/39730021177)
and [PR CI39730025615](https://github.com/soldiermr98-commits/shopnext/actions/runs/39730025615):
all eight original gates SUCCESS; separate Composer strict lock capture SUCCESS.
API measurement:25000-character annotations are truncated to4096 characters.
Combined with the measured10-notice-per-step quota, a single-step transport cannot
carry this complete lock. Local integrity checks again refused to write any file.
Use4000-character parts, up to9 per step in3 distinct steps, with a separate checksum
in the first step and an explicit capacity guard. No candidate runtime rerun.
Public Composer artifacts remain available normally on GitHub. Integration PENDING.

# Composer lock validated — public transport correction

b1e8e28 / [push CI39729633416](https://github.com/soldiermr98-commits/shopnext/actions/runs/39729633416)
and [PR CI39729638018](https://github.com/soldiermr98-commits/shopnext/actions/runs/39729638018):
all eight original gates SUCCESS on both; separate lock generation/strict validation
SUCCESS on push. The public lock artifact uploaded (50074 bytes); annotation transport
retained only nine2500-character parts plus checksum, not the complete compressed
stream. Local decompression correctly failed and NO production dependency files
were written. Increase part size (below GitHub's annotation limit) to keep the complete
public compressed lock within the per-step notice count. Continue verifying SHA256
before writing. No runtime trial repetition, dependency guessing or gate bypass.

# Strict lock warning diagnosed; standard patch-range constraint correction

f63cd60 / [push CI39729265124](https://github.com/soldiermr98-commits/shopnext/actions/runs/39729265124):
all eight original gates SUCCESS; lock-capture job RED. Now-visible Composer output:
`require.ariaieboy/filament-jalali : exact version constraints (3.1.0) should be avoided`.
[PR CI39729268688](https://github.com/soldiermr98-commits/shopnext/actions/runs/39729268688):
all eight original gates SUCCESS. Correct ONLY the production requirement to
`~3.1.0` (patch-compatible), while the committed generated lock will pin3.1.0.
Upstream tag inventory confirms3.1.0 is latest. Retain composer validate --strict;
do not suppress its exit status. The compatibility trial itself remains exactly
one green execution, not retried. Corrected lock capture remains PENDING CI.

# Lock capture diagnostics correction (NOT a second candidate trial)

4b220fa / [push CI39728908907](https://github.com/soldiermr98-commits/shopnext/actions/runs/39728908907):
all eight original gates SUCCESS; separate lock-capture job FAILED (exit1).
[PR CI39728914778](https://github.com/soldiermr98-commits/shopnext/actions/runs/39728914778):
all eight original gates SUCCESS. The lock job's strict-validation output was not
wrapped and lock upload was skipped on failure. Full job-log retrieval also fails
in this sandbox; do not invent a root cause. Add capture/summary and always-on
public-lock/checksum artifacts to diagnose without changing constraints or bypassing
strict validation. The already-green single runtime candidate trial is NOT repeated.
Production lock still unchanged; no next business concern started.

# Single Jalali runtime trial GREEN — retain candidate

85db44e / [push CI39728458608](https://github.com/soldiermr98-commits/shopnext/actions/runs/39728458608):
all eight original gates plus the ONE candidate trial SUCCESS.
[PR CI39728463127](https://github.com/soldiermr98-commits/shopnext/actions/runs/39728463127):
all eight original gates SUCCESS (trial skipped, not repeated).
ariaieboy/filament-jalali3.1.0 on Filament5.10.3: shipped JS day-selection,
Gregorian serialization and Jalali redisplay succeeded for12 cases (4 dates ×
Tehran/UTC/New_York runtime timezones), including midnight, Nowruz and leap day.
Livewire/Pest actual candidate view/save/Gregorian UTC SQL/reload:1test25assertions.
No end-to-end browser clicking, visual RTL, a11y or deployment proof claimed.
Candidate passed the permitted runtime iteration; retain it, not the fallback.

Next commit captures a real Composer-generated lock in a disposable no-scripts
resolver job, without rerunning or troubleshooting the candidate. Public lock data
is available as an artifact plus compressed check annotations with SHA256, because
this sandbox cannot execute Composer natively. Production lock integration is still
PENDING. All original eight gates remain mandatory before the integration concern.

# Single Jalali trial launch

9129142 / [push CI39728110052](https://github.com/soldiermr98-commits/shopnext/actions/runs/39728110052)
and [PR CI39728115386](https://github.com/soldiermr98-commits/shopnext/actions/runs/39728115386):
all eight required gates SUCCESS; optional trial job correctly skipped.
Workflow-dispatch API returned HTTP403 Resource not accessible by integration;
no candidate ran, no credentials requested or changed. Instead the existing push
trigger launches the disposable trial ONCE using an explicit commit-message marker.
Later commits without that marker cannot automatically repeat the package trial.
Trial outcome PENDING. Production dependencies remain unchanged.

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


## L3a variant matrix domain — runtime PENDING

67d2824 numeric-slug guard is VERIFIED: [push39747554267](https://github.com/soldiermr98-commits/shopnext/actions/runs/39747554267)
and [PR39747560377](https://github.com/soldiermr98-commits/shopnext/actions/runs/39747560377)
all eight live job conclusions SUCCESS. New Variants domain/migration and
VariantServiceTest are UNVERIFIED pending the next full CI matrix. Executed local
preflight: git diff --check only; no local PHP/Composer/database runtime claim.
No full L3a completion tag; product content/UI, media, stock and final handoff remain.


Variant domain a645b97: [push39859934377](https://github.com/soldiermr98-commits/shopnext/actions/runs/39859934377)
RED. Fast Pint and frontend passed; six SQL suites failed. Actual MariaDB10.6
annotations:11failed/314passed,8839 assertions; lifecycle rollback test failed,
then variant tests reported missing variant_attribute_terms. Forward migration
was successful. Blob artifacts/log download unavailable; no root DDL explanation
claimed yet. Added isolated artisan rollback/reapply to each existing SQL job,
using redacted reports, before the unchanged full Pest suite. Await actual error;
all variant domain acceptance remains UNVERIFIED. No next concern started.


D098af2 diagnostic [push39860602687](https://github.com/soldiermr98-commits/shopnext/actions/runs/39860602687)
/PR39860608126: style and frontend SUCCESS; isolated rollback fails in all six SQL
jobs. Exact MySQL8/MariaDB10.6 annotation: `SQLSTATE[HY000] General error1553 Cannot
drop index variant_active_list: needed in a foreign key constraint`. InnoDB had
replaced the legacy implicit product_id index with the new composite list index.
Correction preserves a standalone parent index before dropping matrix indexes;
no FK removed or disabled. Lifecycle regression now separately down/up this one
migration and asserts a direct orphan-variant insert still fails while down.
Re-verification PENDING; no new acceptance claim and no next concern started.


## L3a variant domain — VERIFIED7363831

[Push39860899337](https://github.com/soldiermr98-commits/shopnext/actions/runs/39860899337)
and [PR39860906651](https://github.com/soldiermr98-commits/shopnext/actions/runs/39860906651)
ALL8 SUCCESS. Each real SQL job325 passed/8952 assertions; all5 actual races
present in live annotations. Parsed and asserted exact live conclusions/counts/
race names in `ci/l3a-variant-domain-verified-matrix.json`. Corrected rollback and
full down/up lifecycle pass on PHP8.2/8.3 ×MySQL8/MariaDB10.6/11.4. Product UI and
remaining L3a scope still pending. Additional cart/order and direct SQL ownership
regressions added after this checkpoint remain UNVERIFIED until their next run.


## L3a variant integrity VERIFIED; bulk domain PENDING

Ca4de24: [push39861719109](https://github.com/soldiermr98-commits/shopnext/actions/runs/39861719109)
/[PR39861724632](https://github.com/soldiermr98-commits/shopnext/actions/runs/39861724632)
ALL8 SUCCESS; actual six SQL counts and all5 races/job parsed and asserted in
`ci/l3a-variant-integrity-verified-matrix.json`. New ProductBulk service and tests
are UNVERIFIED pending next CI; local git diff --check passed only. No actual bulk
or product editor UI, media/stock implementation or full L3a tag claimed.


00ff000 bulk [push39862556040](https://github.com/soldiermr98-commits/shopnext/actions/runs/39862556040)
/PR39862563152: independent fast Pint RED; expensive jobs correctly SKIPPED, not
claimed executed. Exact ProductBulkTest fixers: unary_operator_spaces,
no_unused_imports, not_operator_with_successor_space. Removed unused import and
expanded embedded preincrement into explicit postincrement/nested guard. Full
runtime verification remains PENDING. No concern advanced on a red run.


## L3a bulk price/category domain — VERIFIED5e5db96

[Push39862703481](https://github.com/soldiermr98-commits/shopnext/actions/runs/39862703481)
and [PR39862709665](https://github.com/soldiermr98-commits/shopnext/actions/runs/39862709665)
ALL8 SUCCESS;339 passed/9037–9038 assertions in each PHP8.2/8.3 ×MySQL8.0/
MariaDB10.6/11.4 job, all5 genuine financial races per job. The live-check parser
asserted both eight-job conclusions and all six test/race counts before recording
`ci/l3a-product-bulk-verified-matrix.json`. Independent style and frontend gates,
isolated SQL rollback/reapply, full suite and real no-dev package smoke passed.
The earlier formatting-only red run did not execute/claim expensive SQL jobs.

This proves services, not delivered product/variation/bulk editor screens. Next
content/gallery/spec/FAQ/relations and actual UI, followed by media and reason+
actor stock, then remaining branding/navigation/cache/deploy/full handoff. No
l3a-complete tag or L3b/deployment approval. Real browser/host acceptance UNVERIFIED.


## Active continuation: revised CI budget (runtime PENDING)

Owner authorizes Pint + PHP8.3/MariaDB10.6 only on intermediate branch pushes;
full original six SQL combinations and frontend on PR updates and tags. The
workflow now selects its matrix deterministically after style, includes the active
arena branch and tag triggers, and skips frontend on fast pushes. Three local
`python3 tools/ci/test-matrix.py` contract tests pass; actual workflow execution
PENDING. Fast green is not six-way SQL/frontend evidence. Final l3a-complete remains
blocked on complete scope plus an actual full-matrix green run. Older ALL8-per-push
instructions are superseded, not the SQL tests or financial race requirements.


Fast selector d571989 actual [push39866911447](https://github.com/soldiermr98-commits/shopnext/actions/runs/39866911447):
Pint + PHP8.3/MariaDB10.6 SUCCESS; frontend intentionally SKIPPED, no other DB jobs.
New ProductContent domain/migration/public projection/tests are PENDING the next
fast run. Local git diff --check passes; PHP/database claims await actual CI.
No full-matrix or delivered editor UI claim. Final tag remains blocked.
