## Why

This API currently only serves public, read-only content (Quotes, Pictures). The owner wants to use it as the backend for a personal productivity browser extension (built with WXT): a Kanban board for tasks and a habit tracker for recurring routines, both usable from day one and ready to support multiple users later via Google sign-in.

## What Changes

- New `/tasks` endpoint group: CRUD for Kanban tasks with `title`, `description`, `startDate`, `dueDate`, `priority` (Low/Medium/High), and a `status` workflow (`To Do` → `Doing` → `Done`).
- Manual drag-and-drop ordering within a column via a `position` field (fractional/float positioning).
- Append-only `TaskStatusHistory` log recording every status transition for a task.
- Comments on tasks: create, edit, and delete.
- New `/habits` endpoint group: CRUD for habits with `title`, `description`, `priority`, and `frequency` (`daily` or `weekly`).
- Sparse `HabitCheckIn` log: one row per completed period (`periodStart` + `completed`), no backfilled rows for missed periods.
- New authentication layer: Supabase Auth, Google OAuth only (no email/password). Express middleware verifies the Supabase-issued JWT on every request to `/tasks` and `/habits`.
- All Task and Habit data (including comments, history, and check-ins) is scoped to the authenticated user (`userId` filter applied explicitly in every query — no reliance on Postgres RLS, since the API connects via Prisma with a fixed connection role).
- CORS policy is widened from `GET`-only to also allow `POST`, `PUT`, `PATCH`, and `DELETE` for the new authenticated routes.
- Existing `/quotes` and `/pictures` endpoints are unchanged: still public, read-only, no auth required.

## Capabilities

### New Capabilities
- `user-auth`: Verifying Supabase-issued Google OAuth JWTs on protected routes and resolving the authenticated `userId` for request scoping.
- `kanban-tasks`: Task CRUD, 3-state status workflow, manual ordering, status history, and per-task comments.
- `habit-tracking`: Habit CRUD (daily/weekly) and sparse check-in logging.

### Modified Capabilities
- None. Existing Quotes and Pictures behavior is untouched.

## Impact

- **Database**: new Prisma models — `Task`, `TaskStatusHistory`, `Comment`, `Habit`, `HabitCheckIn` — added via `prisma/migrations`, living in the same Supabase-hosted Postgres database as `Quotes`/`Pictures`.
- **API surface**: two new resource routers (`/tasks`, `/habits`), distinct from the existing generic `createResourceRouter` (which only supports public read patterns).
- **Auth middleware**: new Express middleware to verify Supabase JWTs (via Supabase JWKS), applied only to `/tasks` and `/habits`.
- **CORS config** (`server.js`): write methods (`POST`/`PUT`/`PATCH`/`DELETE`) now allowed, previously `GET`-only.
- **Dependencies**: a JWT verification library (e.g. `jose`) for validating Supabase tokens; no Prisma changes needed.
- **Env vars**: Supabase project URL/JWKS endpoint needed for JWT verification.
- **Consumers**: a WXT browser extension (separate codebase, not part of this repo) will call these endpoints using a Supabase session token obtained via Google OAuth (`chrome.identity.launchWebAuthFlow`).
