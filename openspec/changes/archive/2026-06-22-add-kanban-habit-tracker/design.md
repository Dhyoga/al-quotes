## Context

The API (`al-quotes` / "Remindeen API") currently serves two public, read-only resources (`Quotes`, `Pictures`) through Express + Prisma, deployed on Vercel, with Postgres hosted on Supabase. There is no authentication and CORS only allows `GET`. This change adds the first write-capable, per-user resources (`Task`, `Habit`) and the first authentication layer, consumed by a WXT browser extension via Google OAuth.

Single owner today, but designed for multi-user from the start since Supabase Auth (Google OAuth) is being introduced now rather than deferred.

## Goals / Non-Goals

**Goals:**
- Add `/tasks` (Kanban) and `/habits` endpoints, each user-scoped.
- Verify Supabase-issued Google OAuth JWTs in Express, without depending on Postgres RLS.
- Keep `/quotes` and `/pictures` exactly as they are: public, unauthenticated, unscoped.
- Support drag-and-drop ordering within a Kanban column, and an append-only history of status changes.
- Support daily/weekly habits with a sparse completion log (no rows for missed periods).

**Non-Goals:**
- Row Level Security enforcement at the Postgres level. The API connects via a single Prisma connection string (not per-request Supabase client), so RLS policies would not be evaluated against `auth.uid()`. User isolation is enforced entirely in application code (every query filtered by `userId`).
- Email/password or non-Google login methods.
- Image/attachment support on tasks, or assignee/multi-assignee support (explicitly single-user-per-task).
- Building the WXT extension itself — only the API it calls.

## Decisions

### 1. Two separate resource routers, not one polymorphic "Task" model
`Task` (Kanban) and `Habit` are modeled as distinct Prisma models with distinct routers (`/tasks`, `/habits`) rather than a single `Task` model with a `recurrence` discriminator field.
- **Alternative considered**: one unified model with `recurrence: none | daily | weekly`. Rejected because the two have materially different lifecycles (Kanban: one mutable `status`; Habit: an immutable definition plus a separate completion log) and forcing them into one shape would mean many fields are only valid for one type, increasing branching logic in both schema and API responses.

### 2. Status history is denormalized current-state + append-only log
`Task.status` is a plain column (cheap to query "all tasks in Doing"), and every change appends a row to `TaskStatusHistory` (`taskId`, `fromStatus`, `toStatus`, `changedAt`).
- **Alternative considered**: derive current status from the latest history row only (fully normalized). Rejected as it requires a windowed/latest-row subquery for every list view, which is unnecessary cost for a single-user-scoped table.

### 3. Habit completion is a sparse log keyed by `periodStart`
`HabitCheckIn` has one row per completed period (`habitId`, `periodStart`, `completed`, `completedAt`), with a unique constraint on `(habitId, periodStart)`. Daily and weekly habits share the same table: `periodStart` is the date (for daily) or the start of the ISO week (for weekly).
- No rows are created for missed periods — "missed" is computed later as the absence of a row for an expected period, not stored explicitly.
- **Alternative considered**: dense log with a row pre-created for every period (requiring a scheduler/cron to backfill). Rejected: adds an operational dependency (cron) for no current benefit, since the owner does not need "missed" to be queryable as a first-class row yet.

### 4. Manual ordering via fractional `position`
`Task.position` is a float. Inserting between two tasks sets `position` to the average of its new neighbors' positions, so a drag-and-drop move only ever updates the single moved row.
- **Alternative considered**: integer position with reindexing (shift all subsequent rows by 1 on insert). Rejected: more writes per drag operation for no real benefit at this scale (single user, small column sizes). Accepted trade-off: float precision will degrade after many insertions at the same spot and may eventually need a rebalancing pass — acceptable given the low write volume expected.

### 5. Auth: Supabase Auth (Google OAuth only), verified in Express middleware
The existing Postgres database is already hosted on Supabase, so Supabase Auth is added without introducing a new infrastructure provider. Google is the only sign-in method (no email/password).
- Express middleware verifies the Supabase-issued JWT (via Supabase's JWKS endpoint) on every `/tasks` and `/habits` request, and extracts `userId` (the JWT `sub` claim) for use in every Prisma query's `WHERE userId = ...` filter.
- **Alternative considered**: Clerk. Rejected primarily because (a) the database is already on Supabase, so Supabase Auth avoids a second platform/account, and (b) Clerk's browser-extension support is built around a "primary domain" web app whose session is synced into the extension via cookies — this project has no companion web app, only the extension, making Supabase's plain REST-based OAuth flow a better fit.
- **Alternative considered**: switching the runtime data path from Prisma to direct Supabase client/PostgREST calls from the extension (which would make RLS enforcement real, as a DB-level defense-in-depth layer). Rejected for this change: it would mean rewriting the existing public Quotes/Pictures routes too (to avoid two different DB-access patterns in the same codebase) and would move business logic (e.g. auto-writing `TaskStatusHistory`) into Postgres triggers instead of application code. The owner chose to keep one consistent Express+Prisma pattern across all resources; RLS-as-defense-in-depth is an explicit accepted trade-off, not an oversight.

### 6. OAuth flow inside the WXT extension uses `chrome.identity.launchWebAuthFlow`
Standard `supabase-js` `signInWithOAuth()` assumes a normal web page redirect flow, which is unreliable inside an extension popup (the popup can be destroyed by Chrome before the redirect completes). The extension instead calls `chrome.identity.launchWebAuthFlow()` from a background script, using a `https://<extension-id>.chromiumapp.org/` redirect URI registered in both the Google Cloud OAuth client and the Supabase Auth redirect URL allowlist, then manually exchanges the returned code/token via `supabase.auth.setSession()` / `exchangeCodeForSession()`.
- This is a property of the extension codebase (out of scope for implementation here) but is recorded because it constrains what the Express API can assume about how tokens arrive (a standard Supabase JWT in the `Authorization: Bearer` header — the exchange mechanics happen client-side).

### 7. CORS: widen methods, scope by route
`server.js` currently allows only `GET` for all origins. `/tasks` and `/habits` need `POST`/`PUT`/`PATCH`/`DELETE`. Since requests now carry user-identifying JWTs, cross-origin write access is gated by JWT verification (not by CORS itself), but CORS should still be tightened to recognize the extension's origin (`chrome-extension://<extension-id>`) rather than left as `origin: '*'` for write-capable routes.

## Risks / Trade-offs

- **[Risk]** A future engineer (or the owner, months later) adds a new `/tasks` or `/habits` query and forgets the `userId` filter, leaking data across users. → **Mitigation**: keep all Prisma access for these models behind a small set of shared query helpers (e.g. `findTaskForUser`) rather than ad-hoc `prisma.task.findMany()` calls scattered across routes, so the filter is structural rather than per-call discipline.
- **[Risk]** Float `position` values lose precision after many insertions clustered in the same region. → **Mitigation**: acceptable at current scale; a rebalancing endpoint/script can be added later if it becomes a problem.
- **[Risk]** `chrome.identity.launchWebAuthFlow` + Supabase PKCE wiring is unproven for this specific combination and may require iteration once the extension is actually built. → **Mitigation**: this is flagged as a spike to validate early in extension development, independent of this API change.
- **[Risk]** Sparse habit logging means "current streak" or "missed days" must be computed by the consumer (or a future endpoint) by diffing expected periods against existing rows, rather than reading a single column. → **Mitigation**: acceptable for now; revisit if streak display becomes a requirement.

## Migration Plan

- New Prisma models only — no changes to existing `Quotes`/`Pictures` tables, so existing data and endpoints are unaffected.
- Migration is purely additive (`prisma migrate dev` generating new tables); safe to deploy without downtime via the existing `vercel-build: prisma generate && prisma migrate deploy` pipeline.
- New env vars required: Supabase project URL and JWKS endpoint (or JWT secret) for token verification — must be set in Vercel project settings before deploying the auth middleware.
- Rollback: dropping the new tables/routes does not affect `/quotes` or `/pictures`; safe to revert independently.

## Open Questions

- Should a rebalancing mechanism for `position` be built now or deferred until it's actually needed?
- Should there be a dedicated endpoint to compute habit streaks/missed periods, or is that left entirely to the extension client for now?
