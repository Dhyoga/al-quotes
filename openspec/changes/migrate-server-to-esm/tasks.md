## 1. Package configuration

- [x] 1.1 Add `"type": "module"` to `package.json`

## 2. Convert leaf modules (no first-party dependencies)

- [x] 2.1 Convert `lib/period.js`: `module.exports = { computePeriodStart }` → `export { computePeriodStart }`
- [x] 2.2 Convert `lib/createResourceRouter.js`: `require('express')` → `import express from 'express'`; `module.exports = createResourceRouter` → `export default createResourceRouter`

## 3. Convert modules depending only on leaves / npm packages

- [x] 3.1 Convert `lib/prisma.js`: `require('dotenv').config()` → `import 'dotenv/config'`; `require('@prisma/client')` / `require('@prisma/adapter-pg')` → `import`; `module.exports = prisma` → `export default prisma`
- [x] 3.2 Convert `lib/auth.js`: `require('jose')` → `import { createRemoteJWKSet, jwtVerify } from 'jose'`; `module.exports = requireAuth` → `export default requireAuth`

## 4. Convert modules depending on `lib/prisma.js`

- [x] 4.1 Convert `lib/tasks.js`: `require('./prisma')` → `import prisma from './prisma.js'`; `module.exports = { listTasksForUser, findTaskForUser }` → `export { listTasksForUser, findTaskForUser }`
- [x] 4.2 Convert `lib/habits.js`: same pattern as 4.1 for `listHabitsForUser`, `findHabitForUser`

## 5. Convert route files

- [x] 5.1 Convert `quotes.js`: imports from `lib/prisma.js` (default) and `lib/createResourceRouter.js` (default); `module.exports = createResourceRouter({...})` → `export default createResourceRouter({...})`
- [x] 5.2 Convert `pictures.js`: same pattern as 5.1
- [x] 5.3 Convert `tasks.js`: imports `express` (default), `lib/prisma.js` (default), `lib/auth.js` (default), `lib/tasks.js` (named `listTasksForUser`, `findTaskForUser`); `module.exports = router` → `export default router`
- [x] 5.4 Convert `habits.js`: imports `express` (default), `lib/prisma.js` (default), `lib/auth.js` (default), `lib/habits.js` (named), `lib/period.js` (named `computePeriodStart`); `module.exports = router` → `export default router`

## 6. Convert entrypoints

- [x] 6.1 Convert `server.js`: `require('body-parser')`, `require('cors')`, `require('express')()` and the four route modules → `import` (route modules as default imports). Also converted `require.main === module` → `process.argv[1] === fileURLToPath(import.meta.url)` (CJS-only idiom, not caught by the original audit, needed for the file to run as ESM).
- [x] 6.2 Convert `api/index.js`: `require("../server.js")` → `import app from '../server.js'`; `module.exports = app` → `export default app`. Did not remove this file — kept even though `vercel.json` appears to bypass it.

## 7. Verification

- [x] 7.1 `node server.js` (or `npm run dev`) boots locally without `ERR_REQUIRE_ESM` or any import/export resolution error — confirmed: server starts, "Server is running on port 3000"
- [x] 7.2 `GET /quotes` and `GET /pictures` still respond 200 without auth, unchanged from before this change — confirmed via curl: both 200
- [x] 7.3 `GET /tasks` and `GET /habits` without an `Authorization` header still return `401`, confirming `lib/auth.js` (and `jose`) loads correctly under native ESM — confirmed via curl: both 401
- [ ] 7.4 A request to `/tasks` or `/habits` with a valid Supabase JWT still succeeds, confirming `jwtVerify`/`createRemoteJWKSet` behave identically post-conversion — **not run**: requires a real Supabase project (`SUPABASE_URL`) and a real Google-signed JWT, neither available in this environment (same constraint noted in `add-kanban-habit-tracker` 7.3/7.4)
- [ ] 7.5 Deploy to a Vercel preview and confirm `/tasks` and `/habits` no longer throw `ERR_REQUIRE_ESM` (the original failure this change fixes) — **not run**: requires pushing/deploying, holding for owner confirmation
- [ ] 7.6 Confirm `vercel-build` (`prisma generate && prisma migrate deploy`) still runs successfully — **not run**: `migrate deploy` runs against the live Supabase database, holding for owner confirmation before running
