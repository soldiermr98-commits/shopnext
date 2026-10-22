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
