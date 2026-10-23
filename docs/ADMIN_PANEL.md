# L3b Orders/Customers — permission contract and implementation progress

L3a approved at immutable `l3a-complete`1e1d8aa; PR3 merged9671ee8.
L3b active branch `arena/5024cc01-shopnext`. No L3b completion tag yet.

## Exact six-role panel matrix

A=super_admin/admin, M=shop_manager, E=content_editor, S=support, C=customer.
Each capability is independently asserted for all six roles. These are panel-only
permissions; they do not widen customer API policies or domain financial powers.
Unknown abilities, inactive and must-change-password actors deny by default.

| Panel capability | super_admin | admin | shop_manager | content_editor | support | customer |
|---|---|---|---|---|---|---|
| Orders/customers view | yes | yes | yes | no | masked | no |
| Change shipping/status | yes | yes | yes | no | no | no |
| Cancel/refund | yes | yes | no | no | no | no |
| Read/approve/reject private receipts | yes | yes | no | no | no | no |
| Mark COD collected | yes | yes | no | no | no | no |
| Manual checkout | yes | yes | no | no | no | no |
| Tracking/carrier and order notes | yes | yes | yes | no | no | no |
| Invoice/packing-slip print | yes | yes | yes | no | no | no |
| Order/customer CSV export | yes | yes | no | no | no | no |
| Display-only status labels/colors | yes | yes | no | no | no | no |
| Customer notes/tags/segments | yes | yes | yes | no | no | no |
| Block/unblock customer | yes | yes | no | no | no | no |
| Wallet adjustment | yes | yes | no | no | no | no |
| Full business phone/address | yes | yes | yes | no | no | no |

Support read-only access is restricted to masked DTOs: no full phone/address,
receipt paths, raw snapshots/notes or financial action payloads. Dashboard,
settings, catalog and existing legacy role/action matrix stay unchanged.
Shipping/status permission NEVER implies arbitrary status assignment: lifecycle
state machine and its stricter per-action permissions remain authoritative.

## L3b REAL/tested status

| Slice | Status | Named tests |
|---|---|---|
| Panel capability contract, all108 cells (18×6) | Implemented; runtime UNVERIFIED | `L3b independently defines every cell of the six role panel capability matrix` — AdminCapabilitiesTest |
| Fresh role/active/password-state revocation | Implemented; runtime UNVERIFIED | `L3b fresh capability authorization rejects revoked roles inactive and first login actors` — AdminCapabilitiesTest |
| Orders/Customers UI, exports/print/financial actions | NOT IMPLEMENTED in this first slice | No REAL claim |

Everything below is historical L3a evidence, not L3b delivery.

# L3a REAL/tested administration inventory

## Current L3a acceptance — FULL VERIFIED

Implementation6a951755e03a79e99dafd6c73afd5cac8dae5097 passed [full CI39892158598](https://github.com/soldiermr98-commits/shopnext/actions/runs/39892158598):
**all8 jobs SUCCESS** — independent Pint, all6 PHP8.2/8.3 × MySQL8.0/MariaDB10.6/
MariaDB11.4 targets, frontend typecheck/tests/build. Every SQL target: **432 tests,
9925–9926 assertions**, all5 real separate-process financial races. Exact per-job
counts/IDs: [asserted matrix](ci/l3a-complete-verified-matrix.json).
The PHP8.2/MySQL8.0 job additionally executed the retained Jalali midnight test
and actual no-dev ZIP extraction/HTTP/migration-runner/cache smoke.

**UNVERIFIED:** real host/TLS, browser visual RTL/a11y, live backup/restore and
process-kill DB/filesystem crash recovery, production migration/import/deployment.
CI HTTP/TLS simulation is not host/browser approval. No L3b–L3e work authorized.
Release reference: `l3a-complete`; tag workflow must independently be green before
handoff. [Tag CI index](https://github.com/soldiermr98-commits/shopnext/actions?query=branch%3Al3a-complete).

All rows below are **REAL / FULL tested in CI39892158598**, not placeholder
buttons. Six-role/revoked-actor cases are named in each corresponding test file.
Folders are virtual labels on files (not arbitrary filesystem paths). Private
receipts and existing L2 financial invariants remain outside the media library.

| Screen/action | Persisted behavior | Executed named Pest test / file |
|---|---|---|
| Categories | Tree, SEO/image, reorder, protected deletion | `L3a category screen persists edit image SEO tree navigation both reorder directions and guarded deletion` — CategoryEditorTest |
| Brands | Logo/metadata, referenced-delete guard | `L3a brand screen persists safe logos preserves existing logos and blocks product referenced deletion` — BrandEditorTest |
| Attributes/terms | CRUD, ownership, image/hex swatches | `L3a attribute and term screens gate six roles recheck every action and persist CRUD audit and swatches` — AttributeEditorTest |
| Product metadata | Four product types, SKU/slug, prices, SEO/publication, trash/restore | `L3a product screen persists all four draft types and maps real service price SKU and publication errors` — ProductEditorTest |
| Product content | Sanitized descriptions, ordered gallery/alt/main, specs/FAQ, related/upsell/cross-sell | `L3a content page safely uploads persists ordered gallery alt main and all three relationship selectors` — ProductContentEditorTest; ProductContentTest |
| Tehran/Jalali schedules | Gregorian UTC persistence/reload; Persian presentation | `L3a renders the retained Jalali picker saves selected state as Gregorian UTC and reloads at Tehran midnight` — AdminDatesTest; ProductEditorTest |
| Variations | Parent-scoped CRUD/trash, image/options/metadata | `L3a variation page uploads real safe images and scopes edits and restores to its locked variable parent` — VariantEditorTest |
| Cartesian matrix | Owned combinations, duplicate/idempotent generation | `L3a matrix page independently gates six roles reauthorizes generation and idempotently persists owned combinations` — VariantMatrixEditorTest |
| Bulk price/category | Exact integer price ratios and real replace/clear memberships | `L3a bulk page independently gates six roles and revoked actions while persisting price category and clear` — ProductBulkEditorTest |
| Media upload/folders/alt/replace | Automatic new catalog/API registration, virtual-folder move, stable URL and actual fresh bytes | `L3a media real upload folder alt replace stable references usage and protected deletion persist audited changes` — MediaLibraryTest |
| Media live usage/delete | Scalar/JSON refs including drafts/trash, derivative guard, quarantine/rollback | Same real upload/protected-delete test; replacement audit rollback case — MediaLibraryTest |
| Queued WebP/thumb | Real database job and bounded worker, both GD/Imagick codecs and bounded sizes | `L3a healthy worker persists a real database conversion job and bounded worker creates WebP outputs`; `L3a media WebP output is real and bounded with each configured GD and Imagick driver` — MediaLibraryTest |
| Media fallback/retry | ≤1MP no-worker sync, large pending queue, no-WebP/codec-failure canonical retention, stale jobs, explicit authorized retry | `L3a missing worker synchronously converts only small images queues larger ones and ignores stale replacement jobs`; no-WebP and partial-output cases — MediaLibraryTest |
| Shared-host image guard | Predecode byte/pixel/live memory checks, bomb/corrupt/truncated rejection, Persian feedback, CLI/dashboard health | ImageBudgetTest (all named cases); MediaLibraryTest |
| Single stock action | Available-stock delta, required reason/actor, append-only ledger and policy | `L3a stock single and bulk actions gate six roles and refreshed revoked actors` — StockAdjustmentTest |
| Bulk stock action | Up to50 explicit SKUs, all-or-nothing, replay key, reason/actor, no direct setter | `L3a bulk stock UI persists reason actor immutable ledger and replay-safe atomic increments`; `L3a bulk decrease rolls back earlier successful rows when a later SKU has insufficient stock` — StockAdjustmentTest |
| Stock audit/ledger integrity | Same-transaction audit rollback, SQL immutability, variant parent, integer bounds | `L3a stock mutation rolls back every row ledger operation and audit on audit failure`; variant validation case — StockAdjustmentTest |
| Bounded media/stock lists | Media1000→30/12queries,9 batch usage queries; stock50 adjustment6 SELECTs and ledger30/50 in3 queries | MediaLibraryTest1000-list case; StockAdjustmentTest50-row case |
| Deploy/cache readiness | Real optimize/Filament/icon caches, missing-cache fail-closed production, queue/cron probes | OperationsTest named actual deploy-check case; extracted no-dev package smoke |

### Operational boundaries

Use canonical PNG URLs for catalog references. A codec failure keeps the sanitized
canonical image, not an unvalidated original upload. Synchronous work is capped
at1MP and only allowed with PHP execution time0/unlimited or≥15s; larger images
remain safe/pending until the minute database worker processes them. Host-specific
resource recommendations are warnings, not exemptions from readiness failures.
Stock ledger records adjustments, not invented historic checkout entries; checkout
reservation/release remains unchanged. Form request key stays locked for retries;
«درخواست جدید» explicitly starts a different adjustment intent.

## Historical implementation notes (superseded by current REAL table)

# Filament admin panel — L3a execution inventory

2026-10-22. Owner authorized L3a ONLY on arena/b4d40ed7-shopnext, based on main686e57f.
**IN PROGRESS, no l3a-complete tag.** L3b-L3e require another explicit approval.
No gateways/SMS/OTP/credential integrations or server-side SEO injection.

## Verified checkpoint: shell and read-only health

98cfd43 / CI39724414478: ALL7 green;226 tests per SQL/PHP job.
Exact evidence: ci/l3a-shell-verified-matrix.json. This is not L3a completion.

Locked runtime: Filament5.10.3, Livewire4.4.7, Laravel12.70.0, PHP8.2/8.3.
Panel-scoped persistent middleware selects fa during rendering/Livewire and restores
previous locale afterwards. Filament's own fa translation supplies RTL. Explicit
LocalFontProvider points at /fonts/vazirmatn.css, using already-vendored fonts from
client/public/fonts in the deploy build, never the custom-font CDN default.
Cron widget remains deferred, no realtime polling; reads Heartbeat, never a fake KPI.
Its public status method also checks permission. No new write buttons in this slice.
Branding-from-settings and catalog navigation groups are still PENDING.

| Screen | Action | REAL/tested | Test name |
|---|---|---|---|
| Staff login | Credential login, logout/password boundary | Existing L1 REAL; locale/font HTTP REAL / CI39724414478 | StaffAuthTest; `L3a renders a Persian RTL panel...` |
| Dashboard | View skeleton | REAL / CI39724414478 | `L3a authorizes dashboard widget and secret page independently...` |
| Cron widget | Read persisted heartbeat, stale/healthy states | Existing service REAL; Persian/role follow-up REAL / CI39724414478 | OperationsTest `renders cron age and warning...`; AdminFoundationTest six-role case |
| Cron widget | Deferred loading, bounded2 queries | REAL / CI39724414478 | `L3a reads heartbeat with two bounded queries...`; six-role case checks isLazy |
| Existing secret page | Preserve omitted values / explicit replacement | Existing L1 REAL; translation only in this slice | SettingsSecurityTest (encrypted masks, snapshot secrecy, transactional audit, actor gates) |
| Categories/tree/reorder | Create/update/delete/restore/reorder/image/SEO | NOT IMPLEMENTED | Pending L3a catalog services/resources |
| Brands | CRUD/restore/uniqueness | NOT IMPLEMENTED | Pending |
| Attributes/terms | CRUD/restore/color/image | NOT IMPLEMENTED | Pending |
| Products | CRUD/restore/all types/variants/content/SEO/relations/schedules | NOT IMPLEMENTED | Pending |
| Products | Matrix generation / bulk price/stock/category | NOT IMPLEMENTED | Pending |
| Stock | Reasoned adjustment with actor/audit | NOT IMPLEMENTED | Pending stock service/ledger; NEVER direct stock editing |
| Media | Folders/upload/replace/alt/WebP/thumbnails/usage/delete protection | NOT IMPLEMENTED | Existing safe raster primitive is NOT a media library |
| Panel branding | Settings-backed identity | NOT IMPLEMENTED | Pending typed nonsecret service/policy/tests |
| Dates | Jalali picker, tables/forms/filters | NOT IMPLEMENTED | Compatibility evaluation below; no conversion widget claimed |

The shell code above executed on98cfd43; other rows remain NOT IMPLEMENTED.
REAL in an older tested slice never implies unrelated new code ran. After every commit,
wait for ALL7 backend.yml jobs; update evidence before the next concern. A red is
not waived. Headless/Pest rendering is NOT actual browser RTL/a11y acceptance.

## Six-role permissions

Existing independent matrix: super_admin/admin/shop_manager can access dashboard
and products; only super_admin/admin can access secret settings/logs. content_editor,
support and customer cannot enter this panel under the approved legacy matrix.
L3a resources must use policies AND fresh service authorization, including restore,
bulk/matrix/reorder/upload/replace/adjust actions. Hidden navigation alone is not auth.
No policy grant to Support simply because a field looks convenient to show.

## Jalali picker evaluation — metadata checked, runtime UNVERIFIED

- Locked Filament is5.10.3. Inspected upstream tagged
  [ariaieboy/filament-jalali3.1.0 composer.json](https://github.com/ariaieboy/filament-jalali/blob/3.1.0/composer.json):
  declares filament/filament ^5.10 and PHP8.2/8.3 support; depends on
  ariaieboy/jalali ^1.0.1. Thus a declared-compatible candidate DOES exist; do not
  falsely claim all plugins are incompatible. No new package/lock changes yet.
- Upstream README advertises DatePicker/DateTimePicker/TextColumn/TextEntry and
  date constraints, local Persian support. Visible tests directory contains only
  ExampleTest/Pest/TestCase: this alone is NOT proof for DST/leap/timezone/Livewire
  round-trip correctness or local asset delivery. Inspect implementation/assets and
  run our own tests on the locked stack before selecting it.
- Selection/solver/runtime/browser verification is still PENDING. If plugin cannot
  meet correctness/offline constraints, implement a bounded tested local wrapper
  and document its actual UI/maintenance tradeoff, not a fake calendar control.
- Store Gregorian UTC, convert only edges with explicit business timezone; test
  Persian/Arabic digits, midnight, leap date, invalid dates, ambiguous/DST input,
  create/edit/reload and filter UTC bounds. No float monetary formatting.

## Remaining implementation order (small concerns, green matrix after EACH)

1. Shell authorization/locale/local font/health checkpoint (verified98cfd43).
2. Transactional stock adjustment history and catalog schema/services; retain L2.
3. Categories/brands/attributes/terms resources with services, policies and soft delete.
4. Media pipeline with rollback-safe files, WebP/thumbnails, queue fallback and usage.
5. Product/variant/matrix/bulk/relation/content/SEO services + Filament interfaces.
6. Selected Jalali edge controls and formatters; branding, list query bounds,
   production cache commands in deploy-check/HOSTING; exhaustive action inventory.
7. Final docs/evidence and ALL7 green, tag l3a-complete, STOP for approval.

No live host/browser/performance/load result is inferred from source inspection.


## Approved continuation/process revision
06c0371 shell approved; continue L3a without another checkpoint approval. Process
first: independent fast Pint --test (formatting dry-run, no MySQL/app boot), then
original six SQL/PHP +frontend jobs. Thus ALL8 jobs must pass, not seven by silently
omitting a previous job. Redacted diagnostic logs are uploaded even on failure and
written to job summaries; raw .env/application databases are never artifacts.
Next: ONE candidate Jalali runtime iteration, fallback if not green; then taxonomy,
products, media, stock-adjustment action/service, in that order. Older implementation
ordering above is superseded. No l3a-complete until the complete approved scope.

## Retained Jalali date controls — integration pending CI

The ONE candidate trial succeeded on CI39728458608: shipped component day selection
and Gregorian transport under three runtime timezones, midnight/Nowruz/leap day;
actual Filament view + SQL save + reload1test25assertions. Use3.1.0, not fallback.
Production helper `App\Filament\Support\AdminDate`: Jalali DateTimePicker with
explicit Tehran timezone; Persian read-only columns/infolists; UTC DB serialization.
No new catalog mutation/action is exposed by this helper alone.

screen | action | REAL/tested | test name
--- | --- | --- | ---
Date control (test harness only) | select/save UTC/reload | trial REAL; production regression REAL, CI39731170215 | AdminDatesTest: L3a renders the retained Jalali picker saves selected state as Gregorian UTC and reloads at Tehran midnight
Date display helper | Persian Tehran table/infolist; zero DB reads | REAL, CI39731170215 | AdminDatesTest: L3a formats table and infolist dates in Persian without database queries or mutating timestamps
Shipped Jalali component | day-select/serialize/redisplay across3 TZ and4 dates | trial REAL; permanent integration REAL, CI39731170215 | tools/ci/jalali/selection.mjs

These are runtime component/contract checks, NOT end-to-end browser clicking,
visual RTL, accessibility or host proof. Taxonomy/products/media/stock remain next.

## Taxonomy sub-step: category domain service (screen not wired yet)

`Categories` centralizes fresh role authorization, serialized acyclic reparenting,
unique slug validation, safe existing raster references, sanitized description/SEO,
complete sibling reorder and referenced-delete protection. Explicit actor audit is
transactional even without a web auth context; audit failure rolls back writes.
Paginated parent labels use eager loading (four queries including fresh actor).
New policy grants only the existing first three product-management roles; no
force-delete/restore ability is opened. This initial category delete is a guarded
hard delete; product soft-delete/restore remains a later required concern.

screen | action | REAL/tested | test name
--- | --- | --- | ---
Category domain (no panel button yet) | list/create/update/reparent/reorder/delete | REAL, CI39732115679/39732121080 | CategoryServiceTest: L3a category service independently enforces six roles for every operation and records the actual actor
Category domain | cycle/slug/order/delete protection | REAL, CI39732115679/39732121080 | CategoryServiceTest: L3a category service rejects cycles duplicate slugs foreign ordering and referenced deletion with Persian errors
Category domain | safe image reference | REAL, CI39732115679/39732121080 | CategoryServiceTest: L3a category service accepts only existing safely rasterized image references
Category domain | stale role and audit rollback | REAL, CI39732115679/39732121080 | CategoryServiceTest: L3a category service refreshes authorization and rolls back the mutation if its actor audit fails
Category domain | big-list pagination/parent labels | REAL, CI39732115679/39732121080 | CategoryServiceTest: L3a category big lists paginate and eager load parents in four bounded queries

Next after all eight gates green: wire/test the actual category screen and each
button through this service, then brands, then attributes/terms. Do not describe
taxonomy, products, media, stock or full L3a as complete at this service checkpoint.

## Category tree screen — newly wired, runtime PENDING CI

CategoryEditor is explicitly registered in the panel and policy-gated on every
entry point using a fresh actor. Root/child exploration and30-row pagination are
Persian; parent search is bounded to50 results. Image upload delegates to SafeUpload,
then Categories; failed category persistence cleans the new file. Existing safe
images are preserved on edits without an upload. SEO is metadata only, no SSR.
Sibling movement calls the real complete-sibling reorder service (max500 siblings
per reorder; larger lists remain paginated/readable and return a Persian limit
error, not false success). Guarded category delete remains hard delete, not product
soft-delete. Category restore and drag-tree reparent are not exposed as fake buttons;
parent changes use the real parent field with cycle validation.

screen | action | REAL/tested | test name
--- | --- | --- | ---
Category tree | role-gated route/new/edit/save/delete/move/explore | REAL, CI39734575452/39734581936 | CategoryEditorTest: L3a category screen and every mutation deny each excluded role independently
Category tree | new/edit/image/SEO/child exploration/root/back/up/down/delete | REAL, CI39734575452/39734581936 | CategoryEditorTest: L3a category screen persists edit image SEO tree navigation both reorder directions and guarded deletion
Category tree | SVG/duplicate/cycle errors and failed-upload cleanup | REAL, CI39734575452/39734581936 | CategoryEditorTest: L3a category screen rejects invalid upload duplicate slug and cyclic parents without false success or orphan files
Category tree | previous/next pagination;1000-row query bounds | REAL, CI39734575452/39734581936 | CategoryEditorTest: L3a category screen paginates large root lists without N plus one category queries

Service-only checkpoint fddb89a passed ALL8 on push39732115679 and PR39732121080,
240tests/PHP job (PHP8.2MySQL8:7983 assertions). Screen verification is separate and
must pass its own CI before brands/attributes. No visual/browser/a11y claim.

### Category screen runtime verified

69388b7: ALL8 SUCCESS on push39734575452 and PR39734581936. Each SQL job250tests,
8107/8108 assertions; all5 real financial races each. Exact manifest:
[category verified matrix](ci/l3a-category-verified-matrix.json). Upload rejection
is preserved before schema validation; a valid replacement recovers correctly.
The documented500-sibling reorder limit remains; full L3a is still incomplete.

## Brands service sub-step — screen not wired yet

Brands uses the fresh Category-style product-management policy and shared catalog
SQL lock/audit helpers. It persists name/unique slug/country/official flag/safe raster
logo, protects product-referenced deletion, and paginates30 rows. Unknown audit
attributes are redacted by default; failures roll back the mutation transaction.

screen | action | REAL/tested | test name
--- | --- | --- | ---
Brand domain (no panel button yet) | list/create/update/delete six roles | REAL, CI39736016898/39736022048 | BrandServiceTest: L3a brand service independently enforces all six roles for list create update delete and explicit actor audit
Brand domain | slug/logo/product-delete guards | REAL, CI39736016898/39736022048 | BrandServiceTest: L3a brand service protects unique slugs referenced brands and raster logo validation with Persian errors
Brand domain | stale active/password flags | REAL, CI39736016898/39736022048 | BrandServiceTest: L3a brand service checks fresh staff flags before writing
Brand domain | audit rollback/default redaction | REAL, CI39736016898/39736022048 | BrandServiceTest: L3a brand and audit roll back together and catalog audit redacts unknown fields
Brand domain |1000-row query bound | REAL, CI39736016898/39736022048 | BrandServiceTest: L3a brand lists use three bounded queries for one thousand rows

Next after all eight gates green: brand screen/buttons through Brands, then
attributes/terms. Product/media/stock/branding/deployment-cache concerns remain.

## Brand screen — newly wired, execution pending CI

Brand domain4c24e6f passed all eight gates on push39736016898 and PR39736022048:
261tests per SQL job (PHP8.2MySQL8:8159assertions). BrandEditor is now explicitly
registered as a policy-checked Page, not an auto-writing Resource. Its forms/actions
use Brands, SafeUpload and shared HandlesCatalogImage; the same retained upload
safety implementation is shared with CategoryEditor and both regressions remain.

screen | action | REAL/tested | test name
--- | --- | --- | ---
Brands | route/new/edit/save/delete six roles + stale role | REAL, CI39737666522/39737671288 | BrandEditorTest: L3a brand screen independently gates all six roles and rechecks every mutation after role revocation
Brands | logo/country/official flag/edit/preserved logo/product-delete guard | REAL, CI39737666522/39737671288 | BrandEditorTest: L3a brand screen persists safe logos preserves existing logos and blocks product referenced deletion
Brands | SVG rejection/replacement/duplicate-failure cleanup | REAL, CI39737666522/39737671288 | BrandEditorTest: L3a brand screen rejects temporary SVG recovers with replacement and cleans files after duplicate slug failure
Brands |1000-row query bound + previous/next | REAL, CI39737666522/39737671288 | BrandEditorTest: L3a brand screen paginates one thousand rows with bounded list queries and real previous next buttons

No fake-success notice occurs before actual service persistence. Brand delete is
reference-protected hard delete; no unimplemented restore button. User browser,
visual RTL/a11y and host checks remain UNVERIFIED. Next after ALL8: attributes/terms.

### Brand screen runtime verified

5db7749 passed ALL8 on push39737666522/PR39737671288. Each SQL job270 tests,
8266/8267assertions and all5 real financial races. Shared category upload adapter
regressions passed too. [Exact matrix](ci/l3a-brand-verified-matrix.json).
Next: attributes/terms after a reporter-only annotation-bound correction passes
all eight gates. Full L3a still IN PROGRESS; no browser/visual/a11y/host claim.

## Attribute/term domain sub-step — no screen yet, pending CI

Attributes service stores select/color/image master attributes and scoped terms,
canonicalizes3/6-digit hex to uppercase6-digit form, validates existing safe image
references, rejects cross-owner term updates, guards referenced deletes and type
changes while terms exist. SQL adds canonical hex CHECK and composite term-owner
FK on product_attribute_terms; the pivot is a domain foundation, not a fake product
assignment action. Fresh six-role policy, taxonomy mutex and explicit transactional
CatalogAudit are required for every mutation.

screen | action | REAL/tested | test name
--- | --- | --- | ---
Attribute/term domain | list/create/update/delete six roles | PENDING CI | AttributeServiceTest: L3a attributes and terms independently enforce six roles and persist all CRUD with actual actor audits
Attribute/term domain | scoped slug/type/hex/owner/product usage guards + SQL constraints | PENDING CI | AttributeServiceTest: L3a attribute validation preserves scoped slugs hex ownership and product usage with real SQL constraints
Attribute/term domain | required safe image/preserved image | PENDING CI | AttributeServiceTest: L3a image terms require existing safe raster references and preserve images on unrelated edits
Attribute/term domain | audit rollback/stale roles | PENDING CI | AttributeServiceTest: L3a attribute and term audits roll back writes and stale roles cannot mutate them
Attribute/term domain |1000-row count/owner eager loading | PENDING CI | AttributeServiceTest: L3a attribute and term thousand row lists bound eager counts and owner labels

Next after ALL8: actual attribute and term screens/buttons including hex swatch and
image upload; only then products. Full L3a still IN PROGRESS, no completion tag.

## Attribute/term domain verified; real editors wired, runtime pending

Ec044d4: push39741032336/PR39741037990 ALL8;280tests8384/8385assertions and
all5 genuine financial races per SQL job. [Exact matrix](ci/l3a-attribute-domain-verified-matrix.json).
The previous domain rows are now REAL/tested by AttributeServiceTest. New editor
rows below remain pending until their own full matrix; no browser/visual claim.

screen | action | REAL/tested | test name
--- | --- | --- | ---
/admin/attributes and /admin/attributes/{attribute}/terms | six-role routes/new/edit/save/delete + fresh authorization and actual actor audits | PENDING CI | AttributeEditorTest: L3a attribute and term screens gate six roles recheck every action and persist CRUD audit and swatches
Term editor | required safe image/upload/preservation | PENDING CI | AttributeEditorTest: L3a term screen persists a safe required image and preserves it on unrelated edits
Term editor | SVG rejection/recovery and duplicate orphan cleanup | PENDING CI | AttributeEditorTest: L3a term screen blocks SVG until valid replacement and cleans new files on duplicate failure
Attribute/term editors | bad hex/type change/referenced term delete rejection | PENDING CI | AttributeEditorTest: L3a attribute and term screens reject bad hex unsafe type changes and used term deletion
Term editor | locked parent and scoped edit/delete404 | PENDING CI | AttributeEditorTest: L3a term screen locks owner context and scopes record actions to that owner
Attribute editor |1000-row bounded counts + previous/next | PENDING CI | AttributeEditorTest: L3a attribute screen paginates one thousand rows with bounded count queries and previous next actions
Term editor |1000-row scoped eager list + previous/next | PENDING CI | AttributeEditorTest: L3a term screen paginates one thousand owner scoped rows with bounded queries and previous next actions

All write buttons delegate to Attributes; required color/image depends on the
fresh server-side owner type. Owner/editing identifiers are Locked; all record
lookups are scoped. Color swatches only render six-digit hex; images only safe
48-hex PNG references. Term route is intentionally absent from top-level navigation
because it requires context; the real parent row links to it. Products next only
after complete green editor regressions. Full L3a remains IN PROGRESS.

## Attribute/term editors verified; product metadata foundation pending

B430903 passed ALL8 on39743792019/39743800775. Each SQL job292 tests8592/8593
assertions and all five genuine races. Previous AttributeEditorTest rows are now
REAL/tested. [Exact editor matrix](ci/l3a-attribute-editor-verified-matrix.json).

The new Products service is metadata-only (no product buttons yet). All four draft
types persist; variable publication requires variants. Brand/slug/global service
SKU checks, Toman integers (including Persian/Arabic digits, rejecting floats),
short/full description, SEO, regular/sale/flash windows, status and UTC publication
are real domain operations pending CI. Direct stock input is prohibited; no stock
quantity is assigned by metadata saves. Initial zero is the existing SQL default.
Effective scheduled publication is a read predicate at the UTC boundary, not an
unaudited background status mutation. Raw status remains scheduled. Soft-deletion
retains all rows/pivots, reserves identifiers and blocks public pricing/catalog;
restore preserves the prior status. Brand names are eagerly current, not stale
legacy strings. New migration refuses lossy editorial-state rollback.

screen | action | REAL/tested | test name
--- | --- | --- | ---
Product domain only | six-role list/create/update/delete/restore + audit | PENDING CI | ProductServiceTest: L3a product metadata independently gates six roles and persists create update soft delete restore actor audits
Product domain only | four types/strict Toman/prohibited inventory/type guard | PENDING CI | ProductServiceTest: L3a product metadata accepts all four draft types and rejects float money direct inventory unsafe prices and type changes
Product domain only | reserved slugs/global service SKUs/variable publish guard | PENDING CI | ProductServiceTest: L3a product metadata reserves deleted slugs and cross table SKUs and blocks missing variable matrix publication
Public catalog + authoritative pricing | UTC schedule/deleted visibility and Unicode slug route | PENDING CI | ProductServiceTest: L3a product publication applies one UTC predicate to public Unicode routes and authoritative pricing before after schedule and trash
Product domain only | exact UTC sale/flash boundary/zero Toman | PENDING CI | ProductServiceTest: L3a product sale windows persist exact UTC and retain lowest regular sale flash and zero pricing without floats
Product domain only | safe persisted rich text/SEO/live brand/delete protection | PENDING CI | ProductServiceTest: L3a product rich text SEO and brands persist safely while deleted products retain reference protection
Product domain only | update/delete/restore audit rollback | PENDING CI | ProductServiceTest: L3a product metadata rolls back update soft delete and restore if explicit actor audit fails
Product domain only | both fresh staff flags/all operations | PENDING CI | ProductServiceTest: L3a product operations refresh both staff safety flags before every write or list
Product domain only |1000-row four-query list/excluded heavy HTML | PENDING CI | ProductServiceTest: L3a product thousand row lists eager load live brand names in four queries without long rich text hydration
Product migration | refuse lossy rollback/resurrection | PENDING CI | ProductServiceTest: L3a product migration refuses lossy rollback instead of silently resurrecting trashed products

Next after full green: product variants/matrix/content/gallery/relations/bulk domain
sub-steps and actual screens, then media, then ledger-backed stock actions. This
foundation is NOT a claim of complete digital fulfillment, bundle automation or
full L3a. Existing L2 inventory/checkout semantics are not replaced or invented.

### Product core verified; numeric identity follow-up pending

85bea48 passed push39746880119/PR39746886226 ALL8,308tests8782/8783assertions
and five actual SQL races/job. All ProductServiceTest core rows above are now
REAL/tested. [Exact core matrix](ci/l3a-product-core-verified-matrix.json).
A narrow pre-variant guard reserves ASCII-numeric slugs for the retained ID route;
no silent legacy identifier rewrite or SEO redirect is introduced.

screen | action | REAL/tested | test name
--- | --- | --- | ---
Product metadata domain | reject numeric slug alias, preserve ID/slug identity and actual prices | PENDING CI | ProductServiceTest: L3a product slugs reserve the numeric ID namespace so a saved slug cannot resolve to another product

No product screen/matrix/gallery/bulk/media/stock completion is inferred.


## L3a continuation — variant matrix domain (runtime PENDING)

The numeric-slug guard67d2824 is VERIFIED: push39747554267 and PR39747560377
completed all eight jobs. The following new implementation is **UNVERIFIED**
until its actual SQL matrix completes; it is not a claim of a delivered UI.

| Screen / domain | Action | REAL / tested status | Pest test name (VariantServiceTest) |
|---|---|---|---|
| Products / variations (UI still pending) | Service list/create/update/trash/restore and actor audit; all six roles | Implemented; runtime UNVERIFIED | L3a variants independently gate all six roles on list save matrix delete restore and audit the actor |
| Product matrix domain | Bounded Cartesian generation; canonical combinations; idempotent reruns preserve SKU/prices/stock/trash | Implemented; runtime UNVERIFIED | L3a Cartesian matrix canonicalizes dimensions and never overwrites existing prices SKUs stock or trash on rerun |
| Product matrix domain | Owner/duplicate/expansion validation; entire batch rollback on second-row SKU collision | Implemented; runtime UNVERIFIED | L3a matrix rejects wrong owners duplicates excessive expansion and rolls back earlier rows on SKU collision |
| Variation metadata | Persian errors; integer money, root/variant SKU uniqueness, sale/flash windows, safe stored-image references; no stock field | Implemented; runtime UNVERIFIED | L3a variant validation rejects direct inventory floats duplicate SKU combinations invalid sales and unsafe images in Persian |
| Variation lifecycle | Stock/history/cart guard; last published variation guard; reserved deleted identities; restore scoped to parent | Implemented; runtime UNVERIFIED | L3a variant parent identity term ownership stock and publication protections survive soft deletion |
| Variation list domain | 1,000-row fixture; page30 with eager option labels, six queries | Implemented; runtime UNVERIFIED | L3a variant thousand row lists eagerly load bounded option labels in six queries |
| Public catalog / authoritative pricing | Trashed variation never projected or quoted despite stale positive stock | Implemented; runtime UNVERIFIED | L3a deleted variants are absent from catalog and rejected by authoritative pricing even with stale stock |
| Variation audit / migration | Transaction rollback on audit failure; refuse lossy migration rollback | Implemented; runtime UNVERIFIED | L3a variant audit failures atomically roll back metadata option membership deletion and restoration; L3a variant migration refuses lossy rollback of persisted combinations or trash |
| Variation authorization | Refresh safety flags before every operation | Implemented; runtime UNVERIFIED | L3a variant actions reauthorize stale actors after either safety flag changes |

Matrix limits:1–4 attributes,1–20 terms/dimension, at most100 Cartesian combinations
per operation and500 retained rows/product (trash included). Generation is atomic,
skips existing combinations including trash, and never resets inventory/prices/SKUs.
Existing legacy variants without matrix keys remain valid. New variants start at
zero stock; stocking is reserved for the later reason+actor adjustment service.
Variation option membership is protected by composite product/term-owner FKs.
Retained historical variants and SKUs cannot be reassigned across products.


### Variant domain VERIFIED checkpoint7363831 (not full L3a)

All nine domain inventory rows above are now **REAL / tested**, not pending:
[push39860899337](https://github.com/soldiermr98-commits/shopnext/actions/runs/39860899337)
and [PR39860906651](https://github.com/soldiermr98-commits/shopnext/actions/runs/39860906651)
ALL8 SUCCESS;325 Pest tests /8952 assertions in each of six SQL jobs, all five
actual financial races per job. Manifest: `ci/l3a-variant-domain-verified-matrix.json`.
This verifies services and public projection, **not a product editor screen**.
Rollback failure1553 was reproduced and fixed without disabling foreign keys;
the lifecycle test proves orphan inserts still fail after narrow migration down.

Two additional security regressions are newly added and **PENDING** their own CI:

| Screen / domain | Action | REAL / tested status | Pest test name (VariantServiceTest) |
|---|---|---|---|
| Variation identity / financial history | Real cart and COD checkout protect option identity even at zero stock on a draft parent; subsequent catalog price/SKU edits preserve order snapshots | Additional regression UNVERIFIED | L3a variant identity remains protected by real cart and order history with zero stock while financial snapshots stay immutable |
| Variation matrix SQL | Direct SQL rejects wrong product/term owner/missing membership/repeated dimension and reserves trashed combinations | Additional regression UNVERIFIED | L3a SQL rejects cross product options wrong attribute owners missing membership repeated dimensions and reserved deleted combinations |

No stock adjustment UI, content/gallery/relations/bulk editor or complete product
screen is claimed by this checkpoint; these and remaining L3a work are still due.


### Variant integrity VERIFIED; bulk price/category domain PENDING

Both added integrity regressions are now **REAL / tested**:
[push39861719109](https://github.com/soldiermr98-commits/shopnext/actions/runs/39861719109)
and [PR39861724632](https://github.com/soldiermr98-commits/shopnext/actions/runs/39861724632)
ALL8. Exact six-job counts/races: `ci/l3a-variant-integrity-verified-matrix.json`.

New ProductBulk domain is implemented but **UNVERIFIED** pending its own matrix.
It accepts at most50 active selected products. Price changes are whole-percent
(increase1–1000%, decrease1–100%) using exact rational half-up once per stored
integer price, across regular/sale/flash fields on roots and active variants.
Maximum1000 price rows; larger legacy expansions fail before persistence. Trash,
stock and calendars are untouched. Category replacement/clear is limited to30
existing categories and does not affect unselected products. Every row is audited
inside the transaction; any late money bound/audit failure rolls back the batch.
This is service groundwork, **not a delivered bulk screen**. Bulk stock remains
reserved for the later reason+actor ledger service; no direct stock setter exists.

| Screen / domain | Action | REAL / tested status | Pest test name (ProductBulkTest) |
|---|---|---|---|
| Product bulk (UI pending) | Price/category writes, selected scope, actor audit and independent six-role gates | Implemented; runtime UNVERIFIED | L3a bulk price and category services independently gate all six roles and persist scoped actor audits |
| Bulk prices | Exact ratio/half-up on root + active variation regular/sale/flash prices; stock/calendars/trash unchanged | Implemented; runtime UNVERIFIED | L3a bulk prices use exact half up integer ratios on roots and active variants without touching stock dates or trash |
| Bulk validation | Strict integer %, unique bounded IDs, missing/trash rejection; rollback late money overflow | Implemented; runtime UNVERIFIED | L3a bulk mutations reject floats duplicate missing trashed and excessive selections and rollback late money overflow |
| Bulk categories / audit | Replace/clear only selected products; second-row audit failure rolls back category and price batches | Implemented; runtime UNVERIFIED | L3a bulk category replacement and clear affect only selected products and audit failure rolls back the whole batch |
| Bulk authorization | Fresh actor safety flags | Implemented; runtime UNVERIFIED | L3a bulk operations reject revoked safety flags even when called with a stale privileged actor |
| Bulk bounds | Reject1,000 legacy variants + parent before updates | Implemented; runtime UNVERIFIED | L3a bulk price preflights the total legacy variation expansion before changing any row |


### Bulk price/category domain VERIFIED5e5db96 (not the bulk UI)

All six ProductBulk inventory rows immediately above are now **REAL / tested**,
superseding their earlier runtime-PENDING labels. [Push39862703481](https://github.com/soldiermr98-commits/shopnext/actions/runs/39862703481)
and [PR39862709665](https://github.com/soldiermr98-commits/shopnext/actions/runs/39862709665)
ALL8 SUCCESS.339 tests/9037–9038 assertions per real SQL job; all5 financial races
per job. Exact manifest: `ci/l3a-product-bulk-verified-matrix.json`.

Product content/gallery/spec groups/FAQ/relations and actual product/variant/bulk
screens remain pending. Media and reason+actor stock adjustments (including bulk
stock), branding/navigation/cache/deploy checks/final handoff also remain pending.
No full L3a completion tag or L3b approval request; browser/host/RTL/a11y/restore
still UNVERIFIED. No stock setter added, and the L2 financial implementation/tag
is unchanged except the necessary fail-closed trashed-variant eligibility guard.


## Active continuation — product content domain (runtime PENDING)

The new active branch is arena/0f9a69e5-shopnext after PR2 merge. Per owner, fast
push CI is Pint + PHP8.3/MariaDB10.6; PR/tag runs retain the full six-way matrix
and frontend. Fast workflow39866911447 actually passed both selected jobs; the
frontend was intentionally skipped. This does NOT claim a full new SQL matrix.

| Screen / domain | Action | REAL/tested | Test name (ProductContentTest) |
|---|---|---|---|
| Product content (UI pending) | Fresh policy-protected read/save; sanitized rich text, spec groups and FAQ, actor audit | Implemented; runtime UNVERIFIED | L3a product content independently gates six roles on reads and transactional audited writes |
| Gallery domain | Persist ordered paths, select main image, alt replacement and safe clear without deleting shared files | Implemented; runtime UNVERIFIED | L3a product gallery persists exact drag order main selection alt replacement and safe clear |
| Content validation | Persian limits; safe uploaded paths; disallow stock/price/self/missing/duplicate relations | Implemented; runtime UNVERIFIED | L3a product content validates Persian limits and forbids inventory prices unsafe paths and invalid relation identities |
| Related/upsell/cross-sell | Ordered replacement/clear; exclude draft/future/trashed targets from public projection; SQL self CHECK | Implemented; runtime UNVERIFIED | L3a related upsell cross sell retain order and never publicly expose draft scheduled or trashed targets |
| Content audit/storage | Roll back content and relations on audit failure; refuse lossy rollback; sanitize imported FAQ on read | Implemented; runtime UNVERIFIED | L3a content and relation audits roll back together and migration refuses lossy editorial rollback |
| Content authorization | Refresh stale actor safety flags for reads/writes | Implemented; runtime UNVERIFIED | L3a product content refreshes safety flags on reads and writes |
| Public list | 1000-row fixture;50 products; batched relations in six catalog SQL queries | Implemented; runtime UNVERIFIED | L3a product content projection batches relations for fifty products without per product SQL |

Gallery is limited to20 owned uploaded PNG references; path arrays preserve the
legacy storefront contract, with a separate alt map. Specs are at most100 ordered
group/key/value rows; FAQ20 sanitized question/answer rows; relations30 targets per
kind. Relation input replaces all three kinds; omitted content sections remain
unchanged. Existing metadata service already covers SEO and scheduled sale/flash
fields. No drag-and-drop screen, upload library or product editor UI is claimed
until those actions are implemented and exercised. Browser interaction UNVERIFIED.


### Product content domain fast VERIFIED; Filament content editor PENDING

All seven domain rows above are **REAL/tested on the fast combination**:
[push39867647967](https://github.com/soldiermr98-commits/shopnext/actions/runs/39867647967),
352 tests/9122 assertions, Pint + PHP8.3/MariaDB10.6 SUCCESS. Other databases and
frontend were not executed in this fast push; full PR/tag verification remains due.

New `/admin/products/{product}/content` Page is registered but runtime **PENDING**.
It edits an existing product; the upcoming product list will provide its link.
RichEditor file attachments are explicitly disabled; gallery uploads use SafeUpload
and are appended in the same service-backed save. Native reorder drag handles and
reorder buttons update form state; Save persists order/main/alt/content together.
Reload explicitly discards unsaved state and reads the database. Relation selectors
search at most30 products and resolve selected labels with one bounded query/kind.

| Screen | Action | REAL/tested | Test name (ProductContentEditorTest) |
|---|---|---|---|
| Product content editor | HTTP/Livewire access, save/reload/upload handlers, six roles and stale revoked roles | Implemented; runtime UNVERIFIED | L3a content page independently gates six roles and every action after role revocation |
| Product content editor | Safe real upload; save/reload ordered gallery, main/alt; all relation selectors; clear while retaining shared file | Implemented; runtime UNVERIFIED | L3a content page safely uploads persists ordered gallery alt main and all three relationship selectors |
| Product content editor | Locked product context; reject SVG, no orphan files/false success | Implemented; runtime UNVERIFIED | L3a content page locks its product context and rejects executable upload without orphan files or false success |

Browser drag-and-drop gestures, visual RTL and a11y remain UNVERIFIED; tests exercise
persisted reordered form state, not a browser pointer. Full product/variation/bulk
pages, media library and stock ledger actions are still pending.


### Content editor fast VERIFIED; product metadata editor PENDING

All three content editor rows above are now **REAL/tested on fast SQL**:
[push39868230626](https://github.com/soldiermr98-commits/shopnext/actions/runs/39868230626),
360 tests/9195 assertions, Pint and PHP8.3/MariaDB10.6 green. Browser pointer/visual
checks and other DB combinations remain UNVERIFIED for the new scope.

New registered `/admin/products` metadata editor exposes the content-page link,
all four types, SKU/slug, price/sale/flash schedules, brand, SEO and publication;
stock is read-only. It uses Products services for every save/trash/restore; brand
search30, list page30 with eager names and no rich-text hydration.

| Screen | Action | REAL/tested | Test name (ProductEditorTest) |
|---|---|---|---|
| Products | HTTP/Livewire six roles; new/edit/save/trash/restore/trash toggle, revoked roles | Implemented; runtime UNVERIFIED | L3a product screen independently gates six roles and every CRUD trash toggle action after revocation |
| Products | Four draft types; real price/SKU/variable publication validation | Implemented; runtime UNVERIFIED | L3a product screen persists all four draft types and maps real service price SKU and publication errors |
| Products |1000-row list;30-item page; bounded eager brand queries, no description load | Implemented; runtime UNVERIFIED | L3a product screen pages one thousand rows with bounded eager brands and without rich text hydration |
| Products | Tehran publication/sale/flash edge conversion and saved UTC redisplay | Implemented; runtime UNVERIFIED | L3a product page saves Tehran scheduled publication sale and flash windows as Gregorian UTC and redisplays them |

Variation/matrix and bulk pages, media, reason+actor stock, final handoff remain
due. Existing Jalali component is reused, not a new candidate trial.


### Product metadata editor fast VERIFIED; variation editor PENDING

All four ProductEditor rows above are **REAL/tested on fast SQL**:
[push39868756342](https://github.com/soldiermr98-commits/shopnext/actions/runs/39868756342),
369 tests/9377 assertions; Pint + PHP8.3/MariaDB10.6 green, not a full-matrix run.

New `/admin/products/{product}/variants` is linked from variable product rows.
Stock and canonical option identities are read-only. Manual SKU metadata, prices,
sale/flash schedules, safe image uploads and soft trash/restore call Variants
services; no hard delete. Existing stock/history/publication guards remain in the
domain. Matrix generation UI remains separate forthcoming work.

| Screen | Action | REAL/tested | Test name (VariantEditorTest) |
|---|---|---|---|
| Variations | HTTP/Livewire six roles and revoked new/edit/save/trash/restore/toggle/upload actions; actual price persistence | Implemented; runtime UNVERIFIED | L3a variation page gates six roles and revoked CRUD trash and upload actions and persists metadata |
| Variations | Safe image upload; locked variable-parent context; cross-parent edit/restore rejection | Implemented; runtime UNVERIFIED | L3a variation page uploads real safe images and scopes edits and restores to its locked variable parent |
| Variation list |1000-row fixture,30-row page; seven queries including fresh actors and eager option labels | Implemented; runtime UNVERIFIED | L3a variation page eager loads option labels on a thousand row fixture in seven bounded queries |

Fast checks will verify these; browser UI interactions and all other SQL combinations
for the new scope remain UNVERIFIED until their actual execution.


### Variation editor fast VERIFIED; matrix generator UI PENDING

All three VariationEditor rows above are **REAL/tested in fast SQL**:
[push39869291945](https://github.com/soldiermr98-commits/shopnext/actions/runs/39869291945),
377 tests/9493 assertions, Pint+PHP8.3/MariaDB10.6 green.

Matrix Page `/admin/products/{product}/matrix` is registered and linked from the
variation list. Attribute search30; term search/labels20 and owner-scoped; at most4
dimensions, domain cap100 combinations/call/500 retained variants. Duplicate
attribute rows fail instead of silently overwriting. Generation never resets
stock/prices/SKUs/trash and reports zero newly created rows honestly on reruns.

| Screen | Action | REAL/tested | Test name (VariantMatrixEditorTest) |
|---|---|---|---|
| Variant matrix | Six-role HTTP/Livewire gates; revoked generation; owner-scoped selections; create/idempotent rerun/locked parent | Implemented; runtime UNVERIFIED | L3a matrix page independently gates six roles reauthorizes generation and idempotently persists owned combinations |
| Variant matrix | Duplicate dimensions rejected before persistence, no false success | Implemented; runtime UNVERIFIED | L3a matrix page rejects repeated dimensions without persisting a partial matrix |

Bulk UI, media and reason+actor stock actions plus final delivery remain due.
Browser pointer/visual/a11y and full new SQL matrix remain UNVERIFIED.


### Matrix page fast VERIFIED; bulk-action page PENDING

Both VariantMatrixEditor rows above are **REAL/tested on fast SQL**:
[push39869734415](https://github.com/soldiermr98-commits/shopnext/actions/runs/39869734415),
Pint+PHP8.3/MariaDB10.6 SUCCESS. No full-matrix/browser claim.

New `/admin/product-bulk` is registered in navigation and linked from products.
Selectors are bounded50 products/30 categories with batched selected-label reads.
Price action updates root and active variant prices through exact ProductBulk;
category action explicitly replaces/clears only selected memberships. UI confirms
the destructive category clear. There is no direct/bulk stock setter. Stock action
will be added only on the later reason+actor ledger service.

| Screen / domain | Action | REAL/tested | Test name (ProductBulkEditorTest) |
|---|---|---|---|
| Bulk products | Six-role HTTP/Livewire and revoked price/category actions; actual scoped price replacement/category clear/audit | Implemented; runtime UNVERIFIED | L3a bulk page independently gates six roles and revoked actions while persisting price category and clear |
| Bulk products | Empty selection/fractional percent rejected without writes or success notice | Implemented; runtime UNVERIFIED | L3a bulk page rejects fractional percentages and missing selection without a success notice or mutation |
| Bulk category domain | Snapshot50 selected memberships in5 SELECTs, not50 per-record lookups | Implemented; runtime UNVERIFIED | L3a category bulk snapshots fifty selected memberships in five SQL reads rather than per product queries |

Media library, stock ledger/adjustment actions/bulk stock and final delivery remain
pending. Their buttons are not displayed or represented as working yet.


## Product continuation VERIFIED on fast combination —49e5924

The three ProductBulkEditor rows above are now **REAL/tested on fast SQL**:
[push39870376321](https://github.com/soldiermr98-commits/shopnext/actions/runs/39870376321).
Pint and PHP8.3/MariaDB10.6 SUCCESS;392 tests/9616 assertions and all5 genuine
financial races. Live parsed evidence: `ci/l3a-product-pages-fast-verified.json`.
Frontend was intentionally skipped and other five SQL combinations not executed.

| Delivered page/domain | REAL/tested on fast SQL | Remaining verification |
|---|---|---|
| Product content domain + content Page | Rich text, gallery ordered paths/main/alt, spec groups/FAQ, publication-safe related/upsell/cross-sell, scoped policies/audit/rollback | Full matrix; real browser pointer/RTL/a11y |
| Product metadata Page | Four draft types, SKU/slug/SEO, publication/sale/flash Tehran↔UTC, eager paginated brands, soft trash/restore, content/variation/bulk links | Full matrix; real browser |
| Variation Page | Per-SKU price/calendar/image, parent scope/locked ID, safe upload, protected trash/restore, eager owned option names | Full matrix; real browser |
| Matrix Page | Bounded owner-scoped choices, real atomic generator, duplicate guards, canonical idempotence/no overwrites, six roles | Full matrix; real browser |
| Bulk Page + category read optimization | Scoped exact percent prices/category replace/clear, no fake success on invalid input, six roles,50-product category before-snapshot in5 SELECTs | Full matrix; real browser |

This table supersedes earlier PENDING rows for these implementations, without
claiming browser execution. Stock remains read-only; **media library and stock
ledger/adjustment/bulk-stock actions are still not delivered**. Those, remaining
branding/nav/cache/deploy checks and final consolidated handoff are next. No
l3a-complete tag, L3b work or deployment approval has been made.


## Shared-host media addendum — safety prerequisite fast VERIFIED

| Screen/domain | Action | REAL/tested | Test (ImageBudgetTest) |
|---|---|---|---|
| SafeUpload | Header-first oversized/decompression-bomb dimensions rejection without decode | REAL — fast39883854000 | L3a image headers reject oversized and bomb dimensions before any decoder or storage write |
| SafeUpload | Corrupt data/file-size ceilings, Persian errors, no stored files | REAL — fast39883854000 | L3a image preflight rejects corrupt data and configured byte ceilings with Persian errors |
| Image resource budget | Two RGBA buffers/input/reserve vs actual PHP headroom; overflow-safe dimensions; application cap even with unlimited PHP | REAL — fast39883854000 | L3a memory estimates use both RGBA buffers input overhead reserve and live PHP headroom without decoding |
| Derivative config | At most3 small integer-size outputs | REAL — fast39883854000 | L3a media variant configuration has a small hard cap and bounded integer dimensions |
| Deploy-check/dashboard | Same limits/WebP report and nonfatal low-resource warnings, zero SQL evaluator | REAL — fast39883854000 | L3a image host recommendations report all limits WebP capabilities and warnings without SQL or failing small-upload readiness |
| Dashboard | Six roles and fresh revoked-role gate | REAL — fast39883854000 | L3a dashboard image warnings independently gate six roles and refresh revoked actors |

This implements pre-decode safety and host reporting only. Media library,
conversion/queue/original fallback/usage/delete protection tests are still pending.
No configuration entry is represented as a delivered conversion action.


Follow-up REAL fast39884326049: trusted Persian preflight/decoder messages now
survive catalog upload-field mapping; MediaRequest/SafeUpload validation Persian.
Named test: `L3a upload forms preserve the Persian low-memory explanation instead
of replacing it with a generic file error`. Corrupt-data test also exercises a
valid PNG IHDR with truncated compressed body, not merely unknown file signatures.


Unsupported/missing decoder now gets Persian validation instead of a class error;
only GD reads an input blob, Imagick reads frame0 from disk. Named test REAL fast39884678896:
`L3a an unsupported image driver fails with Persian validation without reading an
unnecessary blob or writing storage`. This does **not** implement library WebP
fallback: a missing WebP encoder must retain an already safe canonical original
when the media conversion pipeline is delivered.

## Media library — implemented, runtime PENDING fast CI

| UI/domain action | REAL/tested status | Named Pest test (MediaLibraryTest) |
|---|---|---|
| `/admin/media-library`: upload, virtual folder creation/move, alt metadata | Implemented, runtime UNVERIFIED | L3a media real upload folder alt replace stable references usage and protected deletion persist audited changes |
| Replace canonical PNG atomically, stable reference URL, refreshed derivatives | Implemented, runtime UNVERIFIED | Same real upload/replace test |
| Live reference counts including gallery/drafts/trash; protected deletion (including derivative references) | Implemented, runtime UNVERIFIED | Same real upload/replace test |
| Six-role policy and independently revoked actions | Implemented, runtime UNVERIFIED | L3a media page six roles gates upload metadata replace delete and refreshed revoked actors |
| Missing WebP codec keeps safe original | Implemented, runtime UNVERIFIED | L3a no WebP support keeps canonical original without attempting decode or variants |
| Queued conversion, small bounded synchronous missing-worker fallback, stale jobs | Implemented, runtime UNVERIFIED | L3a missing worker synchronously converts only small images queues larger ones and ignores stale replacement jobs |
| 30-file usage batch9 aggregate queries; codec failure partial cleanup | Implemented, runtime UNVERIFIED | L3a media paginated usage has fixed aggregate query count and codec failures keep safe original with no partial variants |

Folders are virtual labels (`کالا/جدید`), not host filesystem paths. Canonical PNG
is always retained. Without a healthy worker only ≤1MP sources convert inline;
larger files remain canonical/pending and queue for the bounded minute worker.
Legacy/pre-library disk files are not automatically scanned/imported; newly
uploaded catalog and API media are registered. Private receipts are excluded.

## Stock actions — implemented, runtime PENDING

| Screen/domain | Action | REAL/tested status | Named Pest test (StockAdjustmentTest) |
|---|---|---|---|
| `/admin/stock-adjustment` | Reason/actor single adjustment, six roles, freshly revoked actions | Implemented; runtime UNVERIFIED | L3a stock single and bulk actions gate six roles and refreshed revoked actors |
| Same page | Atomic selected50 SKU bulk adjustment, explicit increase/decrease, replay safety | Implemented; runtime UNVERIFIED | L3a bulk stock UI persists reason actor immutable ledger and replay-safe atomic increments |
| Stock domain | Correct variant parent, no direct setter, integer limits, reason/key conflicts | Implemented; runtime UNVERIFIED | L3a variant adjustments verify parent reject invalid quantities and key conflicts without partial changes |
| Stock/audit | Entire mutation rollback on audit failure | Implemented; runtime UNVERIFIED | L3a stock mutation rolls back every row ledger operation and audit on audit failure |
| Bulk domain | Fixed6 SELECTs for50 selected SKUs | Implemented; runtime UNVERIFIED | L3a fifty row bulk stock adjustment has six fixed selects not one select per SKU |

Append-only SQL ledger records actual reason and actor, before/after, signed delta,
operation ID and UTC time; activity audit redacts reason. Available stock remains
compatible with existing checkout reservation/release paths; this adjustment
ledger is not falsely described as a reconstruction of pre-existing order stock
movements. Simple roots or explicit variants only. The form uses a locked request
key; retries do not duplicate stock. Click «درخواست جدید» for a new intent.

Media first implementation REAL fast39890033715:415 tests/9765 assertions on
PHP8.3/MariaDB10.6 + Pint. Subsequent refinements PENDING: catalog/API uploads
schedule conversions after successful persistence; explicit policy-gated retry
button; scheduling failure never discards committed canonical reference; skip
inline conversion if actual PHP time limit is under15 seconds; replacement audit
rollback and partially rendered derivative cleanup tests. New named tests:
`L3a media replacement restores canonical bytes metadata and files if its audit
cannot commit`; `L3a media partially encoded variants are removed on failure and
original survives`. Stock direct-service denied-role exception assertions corrected
from HTTP exception to actual Laravel AuthorizationException; runtime recheck pending.

Fast7fdeff4/run39890670001 SUCCESS:427 tests/9879 assertions, all5 financial races,
Pint + PHP8.3/MariaDB10.6. This verifies media retry, replacement/partial rollback,
stock single/bulk reason+actor, six actual roles, audit failure rollback and fixed
query counts implemented above. New final cases PENDING:
- `L3a healthy worker persists a real database conversion job and bounded worker creates WebP outputs`
- `L3a media lists one thousand assets thirty at a time with twelve fixed permission pagination and aggregate queries`
- `L3a bulk decrease rolls back earlier successful rows when a later SKU has insufficient stock`
- Existing50-SKU query test now also asserts joined ledger30/50 pagination3queries.
No full matrix/browser acceptance yet; no placeholder UI actions counted as REAL.

Final operational acceptance extension PENDING: OperationsTest's named
`passes deploy-check against actual PHP extensions and each real matrix database
with a fresh queue probe` now requires missing production caches to fail, then
runs actual optimize + filament:optimize and verifies all readiness checks pass,
with finally cleanup. Extracted no-dev package smoke also builds config/routes/
Filament components/icons and rechecks login and protected new admin routes.

Cache regression cd06ab8/run39891885027 fast green. Last media correctness checks
PENDING: named `L3a media WebP output is real and bounded with each configured GD
and Imagick driver` forces both codecs (not just default GD). Stable canonical
URL response now revalidates (`no-cache`); actual response bytes after replacement
are checked. Content-address-independent WebP filenames remain immutable-cacheable.

## L3b read-side increment (runtime PENDING)

| Screen/action | Status | Named tests (OrderAdminReadsTest) |
|---|---|---|
| `/admin/orders` list/search/status/payment/shipping/Jalali date filters | Implemented; runtime UNVERIFIED | `L3b order list filters status payment shipping UTC date and all four searchable identities without exposing snapshots` |
| Detail immutable item snapshots, totals/rounding, addresses, paginated actor timeline | Implemented; runtime UNVERIFIED | `L3b order detail keeps immutable item prices masks support PII and never serializes private paths or unknown snapshot keys` |
| 5001 orders →30 rows/3 queries; paginated detail6 queries | Implemented; runtime UNVERIFIED | `L3b five thousand order list stays at three queries and detail stays at six with independent pagination` |
| Six roles, independent stale-action checks | Implemented; runtime UNVERIFIED | `L3b orders page gates six roles and independently reauthorizes each stale read action` |

Support now admits to the panel credential boundary and redirects to orders,
NOT the dashboard. Existing dashboard/catalog/settings permissions stay denied.
Only masked DTOs are hydrated; full address is not selected for Support. Raw
receipt/storage paths, user models, arbitrary snapshot keys never reach Livewire.
No order mutations/receipts/print/CSV/customers UI are claimed in this read slice.
