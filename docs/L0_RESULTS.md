# L0 execution evidence — 2026-10-20

> **2026-10-21 update:** GitHub Actions now provides a real PHP8.2/8.3 + MySQL8
> environment. Laravel12/Filament5 were actually Composer-resolved; skeleton and
> initial constrained schema are tested (24 Pest cases). L1 is IN PROGRESS, not
> complete. Older statements below that no Laravel app exists describe the L0
> checkpoint only. See [current CI evidence](CI_RESULTS.md).

Branch: `arena/c101d8c3-shopnext`. **L1 NOT implemented; launch NO-GO.**
This is a redacted summary of real commands, not a Laravel test report.

## Small implementation steps

1. `d1fa8c4` — storefront/legacy separation and admin archive. Before commit:
   dependency install exit0, 171 legacy tests passed (15.00s), both TypeScript
   checks exit0, storefront build exit0 (JS539.15kB, one chunk warning).
2. `ecb59fb` — vendored fonts/icons/licenses, 23-image URL inventory and explicit
   local placeholders, 3 new static asset tests. Before commit: all3 asset tests
   and171 legacy cases passed (legacy13.69s); both typechecks/build exit0.
3. Documentation checkpoint — all29 unique audit IDs mapped to required acceptance
   tests, shared-host runbook, actual-vs-target architecture/schema/security. Final
   real verification below; new principal documentation links checked after this
   file was created. These are documentation checks, not Laravel acceptance tests.

## Final command outcomes

| Command | Actual result |
|---|---|
| `bun --version` / `node --version` | 1.4.3 / v22.22.3 |
| `bun install --frozen-lockfile` | exit0; 300 installs checked across416 packages, no changes |
| `npm test` | exit0; 3 asset tests +171 legacy tests; legacy1 file,14.39s |
| `npm run typecheck` | exit0; client + legacy `tsc --noEmit` |
| `npm run build` | exit0; Vite8.3.4,55 modules,462ms;1 large-chunk warning |
| Build output | HTML2.00kB/gzip0.88; CSS62.59/10.68; JS533.87/136.61 |
| Audit mapping check | all29 finding IDs covered exactly by spec acceptance table |
| GitHub Actions workflow list | successful read,0 workflows; no CI created/run |

The first principal-link check detected this not-yet-created evidence file and
failed; it was created and the check rerun before the documentation commit. No
application test failure was concealed. Full final command logs are external to
Git at `/home/user/audit-evidence/l0-final-{install,test,typecheck,build}.log`.
Earlier step logs use `l0-*` and `l0-offline-*`; these are local evidence, not a
portable committed CI artifact. Dist/node_modules/private DBs are not committed.

## Environment limits / NOT executed

System PATH has no php/composer/mysql/mysqld/mariadbd. Temporary PHP8.3.31 was
obtained outside Git and executed successfully; its PDO driver is sqlite, with
**no pdo_mysql**. Composer/Packagist is inaccessible under the sandbox host allowlist;
no dependency resolution/real lock/vendor or MySQL daemon was obtained. Target
host extensions being owner-confirmed does not install them in this sandbox.

GitHub Actions read access works and shows no workflows. The admin permissions API
previously returned403, which is NOT proof workflow execution is forbidden; a
configured external CI environment remains a possible next route, **not verified**.
No CI/Pest run was dispatched or claimed.

Not executed/implemented: Laravel scaffold, Pint/PHP static checks, Sanctum/CSRF
port, MySQL migrations/constraint tests, role-policy ports, settings encryption,
upload FormRequests, admin activity logging, Filament shell/heartbeat, scheduler/
queue, deploy-check or actual shared-host deployment. Those are still L1 work.
No browser network/TLS/accessibility/RTL certification or real provider test.

## Integrity / scope

- Source moved using Git renames; old DB/credentials were not deleted or rotated.
- Archived React admin is excluded from active routes/build, not a runnable app.
- Vendored font hashes/local CSS resources verified; original photos NOT mirrored.
  Existing cart storage/future API media need local-origin validation later.
- Static metadata/legal/demo financial claims and non-auth mock fallbacks remain.
- Legacy security success cannot certify financial correctness or Laravel/MySQL.
- No pricing/checkout/payment/SMS/Filament business resources implemented.
- L0 preparation is ready; **L1 is outstanding**, L2 remains unapproved.
