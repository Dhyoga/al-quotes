## Context

The API (`al-quotes` / "Remindeen API") is an Express + Prisma server, deployed on Vercel via `vercel.json` (`builds` → `server.js`, `@vercel/node`), Postgres hosted on Supabase. It is entirely CommonJS today (no `"type"` field in `package.json`; every file uses `require`/`module.exports`).

`add-kanban-habit-tracker` introduced `lib/auth.js`, which verifies Supabase JWTs using `jose`. `jose@6.x` dropped CommonJS support entirely (`"type": "module"`, no `"require"` export condition) — unlike `jose@4`/`5`, which shipped dual CJS+ESM builds. `require('jose')` from `lib/auth.js` therefore depends on Node's `require(esm)` interop feature, which is:
- Enabled by default starting in Node 20.19.0 / 22.12.0+ (it shipped earlier behind `--experimental-require-module`).
- The local dev Node version (20.19.6) has it; Vercel's "Node 20.x" project setting resolves to a runtime build that predates this, so `require('jose')` throws `ERR_REQUIRE_ESM` only in production.

This is a latent landmine, not a one-off: any future ESM-only dependency would silently work locally and break in deploy the same way, because the local/Vercel Node patch versions aren't pinned to match.

## Goals / Non-Goals

**Goals:**
- Eliminate the server's dependency on Node's `require(esm)` interop, so jose (and any future ESM-only package) works identically in local dev and on Vercel.
- Convert the entire server to native ES modules rather than patching only the one file that currently fails.
- Preserve all existing behavior exactly: routes, auth checks, CORS policy, DB access patterns are untouched.

**Non-Goals:**
- Changing the Node version pinned in Vercel project settings. Treated as an unreliable lever — the project setting is a moving target ("20.x" can resolve to different patches over time) and doesn't fix the underlying fragility for future ESM-only deps.
- Removing `api/index.js`, even though it appears unreachable given `vercel.json`'s explicit `builds`/`routes`. Kept as-is per owner decision — out of scope to investigate/remove in this change.
- Upgrading or downgrading any dependency version (notably not downgrading `jose` to v5 for its CJS build).
- Any refactor of route/business logic beyond the mechanical `require`/`module.exports` → `import`/`export` conversion.

## Decisions

### 1. Full ESM conversion, not a dynamic-`import()` patch
Convert the whole server to ESM (`"type": "module"` + `import`/`export` everywhere) rather than the narrower fix of wrapping just `lib/auth.js`'s `require('jose')` in `await import('jose')` (which Node's own error message suggests, and which would keep the rest of the server CJS).
- **Alternative considered**: minimal patch, touch only `lib/auth.js`. Rejected per owner preference — a single dynamic-import file living inside an otherwise-CJS codebase is a style inconsistency, and doesn't protect against the same class of failure if another ESM-only dependency is added later (e.g. to `lib/tasks.js` or `lib/habits.js`). A full conversion removes the underlying fragility (reliance on `require(esm)` interop) rather than papering over its current single symptom.

### 2. Keep `api/index.js`
`api/index.js` (`require("../server.js")` re-export) is converted to ESM syntax but not removed, despite `vercel.json`'s explicit `builds: [{ src: "server.js" }]` + `routes` appearing to make it dead code under the current deploy config.
- **Alternative considered**: delete it as unreachable. Rejected — owner wants it kept (possibly as a safety net for zero-config `api/` auto-detection if `vercel.json` config changes later, or for local tooling that imports it directly). Not investigated further in this change.

### 3. `dotenv` loading via side-effect import
`require('dotenv').config()` in `lib/prisma.js` becomes `import 'dotenv/config'`. This is dotenv's documented ESM-equivalent entrypoint (present in its package `exports` map) and preserves identical timing — env vars are loaded as a side effect of the import, before the rest of `lib/prisma.js` evaluates.

### 4. Conversion order follows the dependency DAG, leaves first
No circular requires exist (confirmed by audit), so conversion can proceed bottom-up without any file temporarily importing a not-yet-converted CJS file in a way that breaks:

```
Leaves (no first-party deps):
  lib/period.js, lib/createResourceRouter.js

Depend only on leaves / npm packages:
  lib/prisma.js (dotenv, @prisma/client, @prisma/adapter-pg)
  lib/auth.js   (jose)

Depend on lib/prisma.js (+ siblings):
  lib/tasks.js, lib/habits.js

Route files (depend on lib/*):
  quotes.js, pictures.js  → lib/prisma.js, lib/createResourceRouter.js
  tasks.js                → lib/prisma.js, lib/auth.js, lib/tasks.js
  habits.js               → lib/prisma.js, lib/auth.js, lib/habits.js, lib/period.js

Entrypoints:
  server.js    → quotes.js, pictures.js, tasks.js, habits.js
  api/index.js → server.js
```

### 5. Export shape must be preserved per file (default vs. named)
Two distinct CJS export shapes exist in this codebase and each needs the matching ESM form — mixing them up is the main correctness risk in an otherwise mechanical change:

| File | Current CJS shape | ESM equivalent |
|---|---|---|
| `lib/auth.js`, `lib/createResourceRouter.js`, `quotes.js`, `pictures.js`, `tasks.js`, `habits.js` | `module.exports = X` (single value) | `export default X` |
| `lib/tasks.js`, `lib/habits.js`, `lib/period.js` | `module.exports = { a, b }` (named) | `export { a, b }` (or `export function a() {...}` etc.) |

Import sites must match: default-exported modules are imported as `import x from '...'`; named-exported modules as `import { a, b } from '...'`.

## Risks / Trade-offs

- **Breadth**: every first-party file changes, so a single missed `require`/`module.exports` site will fail at startup (not silently) — Node throws immediately on an unresolved `import`/`require` mismatch, so this fails fast and loud rather than producing subtle bugs.
- **No `engines` pinning**: this change doesn't add an `"engines"` field to `package.json` to pin a minimum Node version. Out of scope here, but worth a future follow-up — without it, Vercel's "Node 20.x" setting can still drift across patches for unrelated reasons.
- **npm package interop**: `express`, `cors`, `body-parser`, `pg`, `@prisma/client`, `@prisma/adapter-pg` are all CJS packages; importing them via `import x from 'pkg'` under `"type": "module"` relies on Node's standard CJS-named-export interop, which is stable and unaffected by the `require(esm)` issue (that issue is specific to requiring an ESM target from CJS, not the reverse).
