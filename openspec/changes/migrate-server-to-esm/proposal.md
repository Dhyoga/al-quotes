## Why

Production requests to `/tasks` and `/habits` crash on Vercel with `Error [ERR_REQUIRE_ESM]: require() of ES Module .../jose/dist/webapi/index.js`. `jose@6.x` ships as pure ESM (`"type": "module"`, no CommonJS build), and `lib/auth.js` loads it via `require('jose')`. This works locally because the local Node version (20.19.x) transparently supports `require(esm)` — a feature Node enabled by default starting in 20.19/22.12 — while the Vercel project's Node 20.x runtime build predates that backport and rejects the `require`. Rather than patch only `lib/auth.js` with a dynamic `import()`, this change converts the whole server to native ES modules so the project stops depending on Node's require-esm interop entirely, and any future ESM-only dependency doesn't reintroduce the same failure mode.

## What Changes

- Add `"type": "module"` to `package.json`.
- Convert every first-party CommonJS file to ESM `import`/`export` syntax: `server.js`, `api/index.js`, `quotes.js`, `pictures.js`, `tasks.js`, `habits.js`, `lib/auth.js`, `lib/prisma.js`, `lib/tasks.js`, `lib/habits.js`, `lib/period.js`, `lib/createResourceRouter.js`.
- `dotenv` loading switches from `require('dotenv').config()` to the `import 'dotenv/config'` side-effect import.
- `api/index.js` is kept (not removed) even though `vercel.json`'s explicit `builds`/`routes` config appears to bypass it — converted to ESM syntax only, no functional change, per owner's explicit decision.
- No dependency version changes (express, cors, body-parser, pg, @prisma/client, @prisma/adapter-pg, jose all stay pinned as-is) — all are either dual CJS/ESM or interop cleanly as default imports under Node's ESM loader.
- No database schema, API contract, or auth behavior changes. This is purely a module-system migration.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- None. `user-auth`, `kanban-tasks`, and `habit-tracking` requirements and scenarios are unchanged — only the implementation's module format changes, not observable behavior. No spec deltas in this change.

## Impact

- **Module system**: `package.json` gains `"type": "module"`; all 12 first-party `.js` files change from CJS to ESM syntax.
- **Deployment**: fixes the Vercel `ERR_REQUIRE_ESM` crash on any route that loads `lib/auth.js` (`/tasks`, `/habits`).
- **Local dev**: `nodemon`/`node` continue to work unchanged — no nodemon config exists, and ESM is natively supported by the local Node version already in use.
- **Scope/risk**: mechanical but wide — every first-party file is touched. Mitigated by an audit showing the require graph is a simple DAG (no circular requires, no dynamic/conditional requires, no `__dirname`/`__filename` usage, no JSON requires).
- **`api/index.js`**: explicitly retained per owner's decision, despite appearing unused given the current `vercel.json` routing.
