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
