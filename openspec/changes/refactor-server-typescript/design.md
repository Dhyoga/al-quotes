## Context

The server is a small Express + Prisma API (`server.js`, 4 route modules, `lib/` utilities) running as ESM (`"type": "module"`). It deploys to Vercel via `vercel.json`, which points `@vercel/node`'s single builder at `server.js` (one serverless function backing all routes, not per-route functions). Locally, `npm run dev` runs `nodemon server.js` and `npm start` runs `node server.js` directly — no build step exists today.

Three decisions were already settled with the project owner before writing this design:
1. Run TypeScript via `tsx` (no `tsc` build step), since `@vercel/node` can transpile `.ts` entrypoints directly and this matches the current no-build-step setup.
2. Keep request validation as manual if/else logic (not migrating to Zod) — only add types and switch the literal validation arrays to Prisma's generated enums.
3. Reorganize into `routes/` + `lib/` (not a full routes/services/repositories layering) — right-sized for 4 resources.

## Goals / Non-Goals

**Goals:**
- Eliminate the `tasks.js`/`habits.js` filename collision between route modules and data-access modules.
- Convert all server source to TypeScript with meaningful types (Express `Request`/`Response`/`NextFunction`, Prisma-derived enums, a typed `req.userId`).
- Keep `npm run dev`, `npm start`, and the Vercel deploy working with no separate compile step.
- Preserve the public HTTP API exactly — same routes, same request/response shapes, same status codes.

**Non-Goals:**
- No change to database schema, Prisma models, or migrations.
- No validation library swap (Zod, etc.).
- No move to per-route serverless functions on Vercel — the single-builder deploy model is unchanged.
- No change to CORS policy or auth (Supabase JWT) behavior.

## Decisions

**TypeScript module resolution: `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`.**
The project is ESM (`"type": "module"` in `package.json`). `NodeNext` is the only resolution mode that matches Node's actual ESM runtime semantics and works correctly with `tsx`, which itself respects `package.json`'s `type` field. Alternative considered: `"moduleResolution": "bundler"` — rejected because there is no bundler in this pipeline (tsx is a runtime transpiler, not a bundler), and `bundler` mode permits import patterns (e.g. extensionless or `.ts`-extension imports) that `tsx`/Node ESM would reject at runtime.

**Keep `.js` extensions in relative import specifiers.**
Under `NodeNext`, TypeScript requires relative imports to use the extension of the *emitted* file. Since nothing is emitted (tsx transpiles in-memory), imports stay as `import x from './lib/prisma.js'` even though the source file is `prisma.ts` — `tsx` resolves `.js` specifiers to sibling `.ts` files at runtime. This mirrors the current codebase, which already uses `.js` extensions everywhere (ESM requirement), so no import-statement rewriting is needed beyond what file renames force.

**`req.userId` via Express namespace augmentation, not a custom request type per route.**
Add a single `types/express.d.ts`:
```ts
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
```
This keeps every route handler's signature as plain `(req: Request, res: Response, next: NextFunction)` — no need to import a custom `AuthedRequest` type everywhere `requireAuth` is used. Trade-off: `userId` is optional (`string | undefined`) at the type level even on routes that always run after `requireAuth`, since TypeScript can't see across middleware boundaries. Accepted as the standard, low-friction pattern for this problem in Express + TypeScript.

**Prisma-generated enums replace `VALID_STATUS` / `VALID_PRIORITY` / `VALID_FREQUENCY`.**
`@prisma/client` already generates TypeScript enums (`TaskStatus`, `Priority`, `HabitFrequency`) matching `prisma/schema.prisma`. Validation becomes:
```ts
import { TaskStatus } from '@prisma/client';
const VALID_STATUS = Object.values(TaskStatus);
```
This removes the risk of the hand-maintained arrays drifting from the schema (e.g. someone adds a new `Priority` value in `schema.prisma` and forgets to update `VALID_PRIORITY` in `tasks.js`). The validation *logic* (the if/else checks and 400 responses) is unchanged — only the source of the allowed-values list changes.

**File moves are renames, not rewrites, for the route/repository split.**
- `quotes.js` → `routes/quotes.ts`
- `pictures.js` → `routes/pictures.ts`
- `tasks.js` (root) → `routes/tasks.ts`
- `habits.js` (root) → `routes/habits.ts`
- `lib/tasks.js` → `lib/tasks-repository.ts`
- `lib/habits.js` → `lib/habits-repository.ts`
- `lib/auth.js`, `lib/prisma.js`, `lib/period.js`, `lib/createResourceRouter.js` → same names, `.ts` extension, stay in `lib/`

`server.ts`'s imports of the route modules update from `./tasks.js` / `./habits.js` to `./routes/tasks.js` / `./routes/habits.js` (etc.); `routes/tasks.ts` and `routes/habits.ts` update their imports of the repository modules from `./lib/tasks.js` / `./lib/habits.js` to `./lib/tasks-repository.js` / `./lib/habits-repository.js`.

**Vercel entrypoint becomes `server.ts`.**
`vercel.json`'s `builds[0].src` changes from `server.js` to `server.ts`. `@vercel/node` detects and transpiles TypeScript entrypoints without a separate `tsc` step, consistent with the "no build step" decision. `routes` rules (which just forward everything to the builder) are unchanged.

## Risks / Trade-offs

- **[Risk]** `tsx` is a runtime dependency for `npm start` in production (Vercel), not just dev — if `@vercel/node`'s TypeScript handling diverges from local `tsx` behavior (e.g. a TS syntax feature one supports and the other doesn't), production deploy could fail in a way local dev didn't catch.
  → **Mitigation**: add `tsc --noEmit` as a type-check-only CI/local step (no emit, no behavior change) to catch type errors before they reach Vercel, even though nothing is compiled with it.
- **[Risk]** Renaming `lib/tasks.js` → `lib/tasks-repository.ts` and `lib/habits.js` → `lib/habits-repository.ts` changes import paths in `routes/tasks.ts` and `routes/habits.ts` — easy to miss one and break a route at runtime instead of build time, since there's no compile step gating deploy.
  → **Mitigation**: rely on `tsc --noEmit` (previous mitigation) to catch broken import paths before deploy, since TypeScript will fail on an unresolved module specifier.
- **[Risk]** Switching `VALID_PRIORITY`/`VALID_STATUS`/`VALID_FREQUENCY` to `Object.values(PrismaEnum)` changes iteration order/contents only if the Prisma schema and the old hand-written arrays had already drifted. If they currently match, behavior is identical.
  → **Mitigation**: diff the current arrays against the Prisma schema enums before switching (already confirmed identical for `Priority` and `TaskStatus`; `frequency` values `daily`/`weekly` also match `HabitFrequency`).
- **[Trade-off]** `req.userId?: string` stays optional at the type level everywhere, even on routes always behind `requireAuth`. Routes will need a non-null usage (`req.userId!` or a narrow check) where Prisma calls require a definite `string`. This is accepted as standard Express+TS practice rather than over-engineering a typed-middleware-chain solution for 4 routes.

## Migration Plan

1. Add TypeScript tooling (`typescript`, `tsx`, `@types/node`, `@types/express`, `@types/cors`) as devDependencies; add `tsconfig.json`.
2. Rename and convert `lib/*.js` → `lib/*.ts` first (leaf dependencies, nothing under `routes/` yet to update).
3. Create `routes/` directory; move + convert the 4 route modules, updating their imports to the renamed `lib/` repository modules.
4. Convert `server.js` → `server.ts`, updating route imports to `./routes/...`.
5. Add `types/express.d.ts` augmentation.
6. Update `package.json` scripts (`dev`, `start`) to use `tsx`; add a `typecheck` script (`tsc --noEmit`).
7. Update `vercel.json`'s build `src` to `server.ts`.
8. Run `tsc --noEmit`, then smoke-test all routes locally (`npm run dev`) before deploying.

Rollback: revert the commit(s); the change is additive-by-rename (old `.js` files are git-tracked history), so reverting restores the exact prior working state with no data migration involved.

## Open Questions

- None outstanding — all three open decisions from the exploration phase (runtime strategy, validation approach, folder layout) were resolved by the project owner before this design was written.
