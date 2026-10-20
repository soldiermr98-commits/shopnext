# CI evidence — current L1a/L1b slice and historical bootstrap

2026-10-21. **L1a and auth/role/Filament slice green; overall L1 NOT COMPLETE.**

## Latest actual matrix result

Code `531d4e9`, run https://github.com/soldiermr98-commits/shopnext/actions/runs/39506373318:
all six DB/PHP jobs + frontend successful. **131 Pest tests/728 assertions per DB job.**
Actual PHP8.2.34/8.3.35 with MySQL8.0.46, MariaDB10.6.28 and MariaDB11.4.13.
Pint, fresh/down/up migrations, full175-column map, real customer CSRF/session,
policy matrix and actual Filament components are executed. Frontend7 tests +171
legacy tests/typecheck/build green. Machine-readable check evidence:
[verified matrix](ci/l1a-l1b-verified-matrix.json).

| Concern / verified commit | Green run |
|---|---|
| DB compatibility `cd5482a` | https://github.com/soldiermr98-commits/shopnext/actions/runs/39502642892 |
| Full schema `aa8f121` | https://github.com/soldiermr98-commits/shopnext/actions/runs/39503509710 |
| Actual Sanctum4.3.3 Composer solve | https://github.com/soldiermr98-commits/shopnext/actions/runs/39503712916 |
| Sanctum lock full matrix `a2885b9` | https://github.com/soldiermr98-commits/shopnext/actions/runs/39503954818 |
| Customer auth `6a40cb8` | https://github.com/soldiermr98-commits/shopnext/actions/runs/39504843743 |
| Frontend transport `401a0a2` | https://github.com/soldiermr98-commits/shopnext/actions/runs/39505072417 |
| Role policies `8a54faf` | https://github.com/soldiermr98-commits/shopnext/actions/runs/39505549833 |
| Staff profile `cac5784` | https://github.com/soldiermr98-commits/shopnext/actions/runs/39506145383 |
| Auth byte/limiter boundaries `531d4e9` | https://github.com/soldiermr98-commits/shopnext/actions/runs/39506373318 |

After each concern's commit, full CI was inspected before proceeding. Red runs were
read and fixed, not ignored: full-schema array parser keys (39503257391); customer
auth (39504333653/39504555861) found Bearer fallback before middleware priority,
JSON tests missing withCredentials and an invalid phone fixture; policy fixture
(39505360069) respected guarded models; staff Livewire session attachment
(39505905229) fixed with the shared Laravel session manager. All subsequent green
runs linked above retain the assertions, no skip/continue-on-error.

Sanctum was generated/locked by CI commit6f9c935; GITHUB_TOKEN pushes do not trigger
push CI, and the sandbox workflow-dispatch API returned403. A no-op verification
push a2885b9 therefore ran the exact generated code/lock on the full matrix before
auth implementation. No claim of an unexecuted bot-triggered matrix.

Remaining overall L1: encrypted settings/DTOs, activity logs, full security/upload/
CORS/headers/proxy perimeter, deploy-check, bounded queue/scheduler/heartbeat widget
and actual hosting/browser acceptance. 66 role/action cases are policy tests, not
implemented11 business HTTP routes. See [precise scope](L1_AUTH.md).

## Historical baseline (superseded counts/state)

The sections below preserve the initial bootstrap evidence, including its failed
runs and initial24-case limitations. Current state above and L1_AUTH.md supersede
claims below that Sanctum, policies, full mapping or the Filament panel are absent.

## Real GitHub Actions runs

| Commit / purpose | Run | Actual outcome |
|---|---|---|
| `3a616ea` current-repo baseline | https://github.com/soldiermr98-commits/shopnext/actions/runs/39500213016 | GREEN: frontend frozen install/typecheck/tests/build; PHP8.2/8.3 extensions and MySQL8 connection. Laravel absent at this point; Pint/Pest/migrations explicitly NOT EXECUTED. |
| `ef9a318` initial official bootstrap | https://github.com/soldiermr98-commits/shopnext/actions/runs/39500419532 | FAILED before dependency installation; no application committed. |
| `39af263` bootstrap diagnostic | https://github.com/soldiermr98-commits/shopnext/actions/runs/39500564026 | FAILED: create-project post-create hook called artisan before vendor existed. Error code255; captured through check annotation. |
| `de2f40a` fixed bootstrap | https://github.com/soldiermr98-commits/shopnext/actions/runs/39500721877 | GREEN: official Laravel12 skeleton, actual Composer solve/platform checks, MySQL migration, Pint and Pest on PHP8.2. Bot committed only the tested output as `159da40`. |
| `0ee6192` locked skeleton matrix | https://github.com/soldiermr98-commits/shopnext/actions/runs/39501082963 | GREEN: PHP8.2 AND8.3/MySQL8, Composer locked install, Pint, migrate:fresh, **3 Pest tests /6 assertions**, frontend/legacy job green. |
| `72f7cc2` constrained schema | https://github.com/soldiermr98-commits/shopnext/actions/runs/39501494233 | GREEN: PHP8.2 AND8.3/MySQL8, Pint, migrate:fresh, **24 Pest tests /42 assertions**, frontend/legacy job green. |

The CI baseline was made green BEFORE scaffolding. After the real skeleton exists,
`backend.yml` requires composer.json, composer.lock and artisan: deleting the app or
lock now fails rather than silently restoring the initial L0 skip. Every new PHP
commit must pass the matrix; no continue-on-error or optional Pest/migration gate.

## Actual Composer resolution

Resolved on **real PHP8.2** (Composer platform PHP8.2.0), not inferred from constraints:

```text
laravel/framework    v12.70.0
filament/filament    v5.10.3
pestphp/pest         v3.8.7
laravel/pint         v1.30.4
```

`composer require filament/filament --with-all-dependencies` ran the update/solver
without preselecting a major. Composer selected `^5.10` and locked v5.10.3. Committed
`backend/composer.lock` and `docs/ci/composer-resolve.json` are the actual result.
CI then installed that same lock on PHP8.3 and ran check-platform-reqs. Filament is
installed as a dependency, **not yet configured as a panel**.

## What the 24 Pest cases establish

- Dedicated MySQL driver/database and MySQL8 server assertion; destructive tests
  refuse any other DB name before RefreshDatabase/migration hooks.
- Migration up/down/up against MySQL8, not SQLite.
- Direct SQL uniqueness on user email/phone and product slug/SKU.
- Unsigned negative money/stock rejection, enforced sale-price bound and safe-integer
  check, invalid publication enum and orphan-brand rejection.
- FK RESTRICT for ordered product/customer/order; immutable item title snapshot.
- Positive item quantity CHECK and orphan order/product/variant rejection.
- Coupon-code uniqueness and percentage cap enforced by SQL.
- Persian utf8mb4 and integer Toman round-trip, required index/engine metadata.
- Failed multi-write transaction rolls back, production development-seeder refusal.
- Two upstream smoke tests remain included (one is a trivial unit example); these
  are NOT authorization or financial/provider acceptance. No inflated coverage claim.

The current schema is a **foundation**, not the complete legacy/domain migration:
legacy data import, complete field mapping, normalization services, category cycle
rules, global cross-table SKU namespace, variant/product pair consistency and
financial service invariants remain pending. SKU uniqueness currently applies
within each of products/variants, not globally across both. No service is exposed.

## Execution environment / limitations

Local sandbox still has no Composer/MySQL/pdo_mysql. A temporary native PHP8.3.31
and Pint1.30.4 were downloaded from tracked official GitHub contents outside Git;
local PHP syntax checks and Pint actually passed for the schema change. Local
MySQL/Pest execution is NOT claimed. GitHub Actions is the working test environment.

Full `gh run view --log` downloads redirect to a blocked results-receiver host.
Actual job/check status is readable via GitHub API; Pest command output was emitted
as a check annotation to make counts/failures readable here. The run links show the
full logs to the owner. No credentials, env contents or provider secrets are logged.
Node20 action-runtime deprecation warnings remain for action major versions; they
are warnings, not test failures. Application Node is pinned22.22.3/Bun1.4.3.

## Remaining L1 — NOT DONE / UNVERIFIED

- Sanctum SPA session/CSRF transport and frontend integration; OTP503 endpoints.
- Secure administrator provisioning, initial password gate, password/session lifecycle.
- Six-role server policies/models and independent legacy access-matrix port.
- Encrypted settings casts/write-only newValue/masked DTOs and secrecy tests.
- FormRequests/upload validation, login/OTP limits, security headers/CORS/proxies,
  admin activity logging and corresponding security regression tests.
- Filament shell, scheduler heartbeat widget, bounded database worker/cron and
  deploy-check command with isolated tests.
- Complete schema/model mapping and broader constraints/host/browser acceptance.

No L1 completion or L2 approval is requested on the basis of these24 tests. Do not
interpret schema preparation or a green CI as authorization to deploy checkout.
