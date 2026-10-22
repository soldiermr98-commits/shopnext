# Archived Node implementation — NOT the new backend

The original Express/sql.js server lives in `server/` (entry: `server/index.ts`).
The 171 Phase A regression tests live in `tests/`; `shared/` is a frozen copy of
its TypeScript contracts. Former React admin source is archived in `client-admin/`
for reference only; it is not wired into the storefront or a build target and its
original relative UI imports are not runnable here.

Git renames preserve file history (`git log --follow <new-path>`). No legacy DB
has been migrated, deleted or uploaded. Root `npm test` runs these tests only;
it must NOT be described as Laravel/Pest verification. Root dev/build target the
standalone storefront in `client/`, never this server. This code retains the open
financial and persistence flaws in the historical audit and must not be deployed.
