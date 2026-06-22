## 1. Tooling Setup

- [x] 1.1 Add devDependencies: `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/cors`
- [x] 1.2 Add `tsconfig.json` (`module`/`moduleResolution`: `NodeNext`, `target`: a recent ES version, `strict: true`, `outDir` unused since nothing is emitted, `types: ["node"]`)
- [x] 1.3 Add `types/express.d.ts` with the `Express.Request.userId?: string` augmentation, and reference it from `tsconfig.json`'s `include`/`files`

## 2. Convert `lib/` Modules

- [x] 2.1 Convert `lib/prisma.js` → `lib/prisma.ts`
- [x] 2.2 Convert `lib/period.js` → `lib/period.ts` (type `computePeriodStart(frequency: HabitFrequency, date?: Date): Date`)
- [x] 2.3 Convert `lib/auth.js` → `lib/auth.ts` (type the middleware as `(req: Request, res: Response, next: NextFunction) => Promise<void>`, set `req.userId` using the augmented type)
- [x] 2.4 Convert `lib/createResourceRouter.js` → `lib/createResourceRouter.ts` (type the factory's options and return an `express.Router`)
- [x] 2.5 Rename + convert `lib/tasks.js` → `lib/tasks-repository.ts`
- [x] 2.6 Rename + convert `lib/habits.js` → `lib/habits-repository.ts`

## 3. Move and Convert Route Modules

- [x] 3.1 Create `routes/` directory
- [x] 3.2 Move + convert `quotes.js` → `routes/quotes.ts`, updating its `./lib/...` import paths
- [x] 3.3 Move + convert `pictures.js` → `routes/pictures.ts`, updating its `./lib/...` import paths
- [x] 3.4 Move + convert `tasks.js` (root) → `routes/tasks.ts`; update import of the repository module to `../lib/tasks-repository.js`; replace `VALID_STATUS`/`VALID_PRIORITY` arrays with `Object.values(TaskStatus)` / `Object.values(Priority)` from `@prisma/client`
- [x] 3.5 Move + convert `habits.js` (root) → `routes/habits.ts`; update import of the repository module to `../lib/habits-repository.js`; replace `VALID_FREQUENCY`/`VALID_PRIORITY` arrays with `Object.values(HabitFrequency)` / `Object.values(Priority)` from `@prisma/client`

## 4. Convert Entrypoint

- [x] 4.1 Convert `server.js` → `server.ts`, updating route imports to `./routes/quotes.js`, `./routes/pictures.js`, `./routes/tasks.js`, `./routes/habits.js`
- [x] 4.2 Type the error-handling middleware (`(err: Error, req: Request, res: Response, next: NextFunction) => void`)

## 5. Scripts and Deployment

- [x] 5.1 Update `package.json` `dev` script to `tsx watch server.ts` (replacing `nodemon server.js`)
- [x] 5.2 Update `package.json` `start` script to `tsx server.ts` (replacing `node server.js`)
- [x] 5.3 Add `package.json` `typecheck` script: `tsc --noEmit`
- [x] 5.4 Update `vercel.json` `builds[0].src` from `server.js` to `server.ts`

## 6. Verification

- [x] 6.1 Run `npm run typecheck` and resolve all type errors
- [~] 6.2 Run `npm run dev` and smoke-test every route — verified `GET /quotes`, `GET /quotes/random`, `GET /pictures`, `GET /pictures/random` return 200 with data, and `GET /tasks` / `GET /habits` correctly return 401 without a token (auth gating intact). Full authenticated CRUD + checkins/comments/position-reorder NOT exercised — no valid Supabase JWT available in this session.
- [x] 6.3 Confirm no filename collisions remain between `routes/` and `lib/` (`ls routes lib`)
- [x] 6.4 Remove the old root-level `.js` route files (`quotes.js`, `pictures.js`, `tasks.js`, `habits.js`) and old `lib/*.js` files once their `.ts` replacements are verified working — done via `git mv` in tasks 2–4, no separate `.js` files remain
