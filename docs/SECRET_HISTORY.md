# Secret-history scan — masked location inventory

Phase 3, 2026-10-20. [Audit](AUDIT_REPORT.md) · [Execution scope](TEST_RESULTS.md).

## Scope and safe handling

Fetched full available origin history with `git fetch --unshallow origin` (exit 0).
Clone is no longer shallow. `git ls-remote --heads --tags origin` also confirmed
that origin advertises only `refs/heads/main` and no tags; that head is covered.
Scanned every text blob in every tree of all 4 commits
reachable from local refs at the start of Phase 3, including deleted/earlier file
versions rather than only a working-tree grep. Zero binary snapshots encountered.
12 regex families covered provider-key formats, GitHub/AWS/private-key/JWT formats,
credential assignments, React state/preset credentials, bcrypt literals and
credential-like demo documentation. Values/snippets are never reproduced below.

This is a custom heuristic scan, NOT a guarantee that every secret format was
recognized. No live credentials were validated with providers. Findings include
known demo values, mask placeholders, default credentials and documentation, not
24 independently confirmed production leaks. Provider-looking values' real-world
validity is **UNVERIFIED**. Treat them as exposed if any were ever used for real,
rotate through their owner/provider, and remove frontend credentials. History
rewriting is a separate approval-required operation and is not performed here.

### Candidate snapshots (commit hash + file path only; values masked/omitted)

| Commit | File |
|---|---|
| `0d39bd04056f4d1453ce205010abcd047b8537ca` | `.env.example` |
| `0d39bd04056f4d1453ce205010abcd047b8537ca` | `README.md` |
| `0d39bd04056f4d1453ce205010abcd047b8537ca` | `server/api.ts` |
| `0d39bd04056f4d1453ce205010abcd047b8537ca` | `server/db/database.ts` |
| `0d39bd04056f4d1453ce205010abcd047b8537ca` | `src/components/shared/AuthModal.tsx` |
| `0d39bd04056f4d1453ce205010abcd047b8537ca` | `src/lib/fallbackData.ts` |
| `0d39bd04056f4d1453ce205010abcd047b8537ca` | `src/pages/admin/AdminPaymentPage.tsx` |
| `0d39bd04056f4d1453ce205010abcd047b8537ca` | `src/pages/admin/AdminSmsPage.tsx` |
| `36c934f06ca4524d7dbc015eb8d04fcb4bd27d2d` | `.env.example` |
| `36c934f06ca4524d7dbc015eb8d04fcb4bd27d2d` | `README.md` |
| `36c934f06ca4524d7dbc015eb8d04fcb4bd27d2d` | `server/api.ts` |
| `36c934f06ca4524d7dbc015eb8d04fcb4bd27d2d` | `server/db/database.ts` |
| `36c934f06ca4524d7dbc015eb8d04fcb4bd27d2d` | `src/components/shared/AuthModal.tsx` |
| `36c934f06ca4524d7dbc015eb8d04fcb4bd27d2d` | `src/lib/fallbackData.ts` |
| `36c934f06ca4524d7dbc015eb8d04fcb4bd27d2d` | `src/pages/admin/AdminPaymentPage.tsx` |
| `36c934f06ca4524d7dbc015eb8d04fcb4bd27d2d` | `src/pages/admin/AdminSmsPage.tsx` |
| `0d436ba8cb2c2884931f2bebb868f342b5869d3e` | `.env.example` |
| `0d436ba8cb2c2884931f2bebb868f342b5869d3e` | `README.md` |
| `0d436ba8cb2c2884931f2bebb868f342b5869d3e` | `server/api.ts` |
| `0d436ba8cb2c2884931f2bebb868f342b5869d3e` | `server/db/database.ts` |
| `0d436ba8cb2c2884931f2bebb868f342b5869d3e` | `src/components/shared/AuthModal.tsx` |
| `0d436ba8cb2c2884931f2bebb868f342b5869d3e` | `src/lib/fallbackData.ts` |
| `0d436ba8cb2c2884931f2bebb868f342b5869d3e` | `src/pages/admin/AdminPaymentPage.tsx` |
| `0d436ba8cb2c2884931f2bebb868f342b5869d3e` | `src/pages/admin/AdminSmsPage.tsx` |

### Environment files ever present in reachable history

| Commit | File |
|---|---|
| `0d39bd04056f4d1453ce205010abcd047b8537ca` | `.env.example` |
| `36c934f06ca4524d7dbc015eb8d04fcb4bd27d2d` | `.env.example` |
| `0d436ba8cb2c2884931f2bebb868f342b5869d3e` | `.env.example` |

Only `.env.example` was found; its assignments are example placeholders. No
non-example `.env` path was found in scanned reachable trees. The remaining
reachable initial commit had no candidate match. All credential-bearing app
snapshots above have the same relevant baseline source; documentation commits do
not fix the underlying exposures.

## Current-tree masked locations requiring review

- `server/api.ts:12`: hardcoded JWT fallback; `:25–29`: accepted demo identity tokens.
- `server/db/database.ts:290–293`: default password definitions/comment;
  provider-shaped settings seed fields around `:1216–1238`.
- `src/components/shared/AuthModal.tsx:125–135`: client demo credential preset.
- `src/pages/admin/AdminSmsPage.tsx:127`: provider-key-shaped initial value.
- `src/pages/admin/AdminPaymentPage.tsx:41–112`: provider merchant/key-shaped constants.
- `src/lib/fallbackData.ts:212–233`: fallback provider/settings representation.
- `README.md`: existing demo login/config guidance; historical table intentionally
  reports only commit+path, not copied credentials.

Built-bundle checks confirm literals from admin payment/SMS and demo-login preset
are shipped to the browser. No actual GEMINI_API_KEY environment value is consumed
by source in this build; `.env.example` documentation is not evidence of a live key.

Out of scope: secrets in remote unreachable/deleted refs, unadvertised pull-request
refs, CI artifacts/logs, deployment variables, other clones or external services.
No secret rotation, deletion, source fix or history rewrite has been applied.
