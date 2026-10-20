# Dependency inventory

Snapshot: 2026-10-20. Manifest ranges vs exact resolutions in `bun.lock`. Registry metadata fetched directly from registry.npmjs.org. Latest is informational, not a recommendation to upgrade across majors. No dependency upgrades applied.

| Package | Manifest | Locked | Purpose / source evidence | Flags |
|---|---|---|---|---|
| `@google/genai` | `^2.4.0` | 2.30.0 | Gemini SDK | No direct source import found; likely unused |
| `@tailwindcss/vite` | `^4.3.3` | 4.3.3 | Tailwind Vite integration; `vite.config.ts` | Build tool in runtime dependencies; Vite dynamically loaded by server |
| `@vitejs/plugin-react` | `^6.1.1` | 6.1.2 | React Vite integration; `vite.config.ts` | Build tool in runtime dependencies; Vite dynamically loaded by server |
| `bcryptjs` | `^3.0.3` | 3.0.3 | Password hashing; `server/api.ts`, `server/db/database.ts` | No inventory-level flag |
| `canvas-confetti` | `^1.9.4` | 1.9.4 | Celebration effect; `src/pages/storefront/OrderSuccessPage.tsx` | No inventory-level flag |
| `cookie-parser` | `^1.4.7` | 1.4.7 | Cookie parsing; `server.ts` | No inventory-level flag |
| `dotenv` | `^17.2.3` | 17.4.2 | Environment-file loader | Behind latest 18.0.8; compatibility review required; No direct source import found; likely unused |
| `express` | `^4.21.2` | 4.22.3 | HTTP server; `server/api.ts`, `server.ts` | Behind latest 5.3.0; compatibility review required |
| `jsonwebtoken` | `^9.0.3` | 9.0.3 | JWT signing/verification; `server/api.ts` | No inventory-level flag |
| `lucide-react` | `^0.546.0` | 0.546.0 | Icon library | Behind latest 1.60.0; compatibility review required; No direct source import found; likely unused |
| `motion` | `^12.23.24` | 12.43.0 | Animation library | Behind latest 14.4.0; compatibility review required; No direct source import found; likely unused |
| `react` | `^19.0.1` | 19.3.1 | UI runtime; `src/App.tsx`, `src/components/layout/AdminLayout.tsx`, `src/components/layout/StorefrontLayout.tsx` | No inventory-level flag |
| `react-dom` | `^19.0.1` | 19.3.1 | DOM renderer; `src/main.tsx` | No inventory-level flag |
| `react-router-dom` | `^7.18.4` | 7.18.4 | SPA routing; `src/App.tsx`, `src/components/layout/AdminLayout.tsx`, `src/components/layout/StorefrontLayout.tsx` | No inventory-level flag |
| `recharts` | `^3.10.1` | 3.10.1 | Dashboard charts; `src/pages/admin/AdminDashboardPage.tsx` | No inventory-level flag |
| `sql.js` | `^1.15.0` | 1.15.0 | SQLite WASM database; `server/db/database.ts` | Behind latest 1.15.1; compatibility review required; Operational risk: full database exported synchronously on writes |
| `vite` | `^8.3.0` | 8.3.4 | Frontend build/dev middleware; `server.ts`, `vite.config.ts` | Build tool in runtime dependencies; Vite dynamically loaded by server |
| `zod` | `^4.6.7` | 4.6.7 | Runtime schema validation | No direct source import found; likely unused |
| `zustand` | `^5.0.15` | 5.0.15 | Client state stores; `src/store/authStore.ts`, `src/store/cartStore.ts`, `src/store/themeStore.ts` | No inventory-level flag |
| `@types/bcryptjs` | `^3.0.0` | 3.0.0 | Type declarations for bcryptjs | Redundant stub; bcryptjs ships types |
| `@types/canvas-confetti` | `^1.9.0` | 1.9.0 | Type declarations for canvas-confetti | No inventory-level flag |
| `@types/cookie-parser` | `^1.4.10` | 1.4.10 | Type declarations for cookie-parser | No inventory-level flag |
| `@types/express` | `^4.17.21` | 4.17.25 | Type declarations for express | Behind latest 5.0.6; compatibility review required |
| `@types/jsonwebtoken` | `^9.0.10` | 9.0.10 | Type declarations for jsonwebtoken | No inventory-level flag |
| `@types/node` | `^22.14.0` | 22.20.5 | Type declarations for node | Behind latest 26.6.5; compatibility review required |
| `@types/react` | `^19.3.0` | 19.3.0 | Type declarations for react | No inventory-level flag |
| `@types/react-dom` | `^19.3.0` | 19.3.0 | Type declarations for react-dom | No inventory-level flag |
| `@types/sql.js` | `^1.4.11` | 1.4.11 | Type declarations for sql.js | No inventory-level flag |
| `autoprefixer` | `^10.4.21` | 10.6.1 | PostCSS prefixer | No direct config usage; transitive/tooling overlap |
| `esbuild` | `^0.25.0` | 0.25.12 | JS bundler | Behind latest 0.28.2; compatibility review required; No direct config usage; transitive/tooling overlap |
| `tailwindcss` | `^4.3.3` | 4.3.3 | CSS framework; `src/index.css` | No inventory-level flag |
| `tsx` | `^4.21.0` | 4.23.15 | TypeScript execution for dev/start | start requires this devDependency in production |
| `typescript` | `^7.0.2` | 7.0.2 | Compiler used by lint script | No inventory-level flag |

All listed locked releases were present in registry metadata at inspection time. No direct package is declared in both dependency groups. Tailwind plugin/core are complementary, not duplicates. Multiple bundler versions can coexist transitively; full duplicate/advisory analysis is deferred to Phase 3. No vulnerability-free claim is made.

Type declarations are consumed by TypeScript rather than explicit imports. Compiler strict mode is not enabled; `skipLibCheck` and `allowJs` are enabled. No separate ESLint configuration or test dependencies exist. Node engine intersection includes Node 22.12+; manifest itself does not enforce an engine.
