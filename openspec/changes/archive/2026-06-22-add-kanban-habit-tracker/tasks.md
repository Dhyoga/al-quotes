## 1. Database schema

- [x] 1.1 Add `Task` model to `prisma/schema.prisma` (`id`, `userId`, `title`, `description`, `startDate`, `dueDate`, `priority`, `status`, `position`, `createdAt`, `updatedAt`)
- [x] 1.2 Add `Priority` enum (`Low`, `Medium`, `High`) and `TaskStatus` enum (`TODO`, `DOING`, `DONE`)
- [x] 1.3 Add `TaskStatusHistory` model (`id`, `taskId`, `fromStatus`, `toStatus`, `changedAt`)
- [x] 1.4 Add `Comment` model (`id`, `taskId`, `body`, `createdAt`, `updatedAt`)
- [x] 1.5 Add `Habit` model (`id`, `userId`, `title`, `description`, `priority`, `frequency`, `createdAt`, `updatedAt`) and `HabitFrequency` enum (`daily`, `weekly`)
- [x] 1.6 Add `HabitCheckIn` model (`id`, `habitId`, `periodStart`, `completed`, `completedAt`) with a unique constraint on `(habitId, periodStart)`
- [x] 1.7 Generate and review the Prisma migration (`prisma migrate dev`), confirm it only adds new tables/enums and does not touch `Quotes`/`Pictures`

## 2. Auth middleware

- [x] 2.1 Add a JWT verification dependency (e.g. `jose`) and configure it against the Supabase project's JWKS endpoint
- [x] 2.2 Implement an Express middleware that reads the `Authorization: Bearer <token>` header, verifies the Supabase JWT, and attaches the resolved `userId` (JWT `sub`) to `req`
- [x] 2.3 Return `401 Unauthorized` when the header is missing or the token is invalid/expired
- [x] 2.4 Add required Supabase env vars (project URL / JWKS endpoint) to local `.env` and Vercel project settings — `.env` filled in with real `SUPABASE_URL`/`EXTENSION_ORIGIN`; **Vercel project settings still need the same values set manually before deploy**

## 3. Kanban tasks API

- [x] 3.1 Create `lib/` helper(s) for user-scoped Task queries (e.g. `findTaskForUser`, `listTasksForUser`) so every query is structurally filtered by `userId`
- [x] 3.2 Implement `POST /tasks` (create, defaults to status `TODO`, validates `priority`/`status` enum values)
- [x] 3.3 Implement `GET /tasks` (list, scoped to authenticated user)
- [x] 3.4 Implement `GET /tasks/:id` (scoped; 404 if not owned by the user)
- [x] 3.5 Implement `PATCH /tasks/:id` (update fields; reject assignee/image fields if sent)
- [x] 3.6 Implement status transition logic: on status change, update `Task.status` and append a `TaskStatusHistory` row in the same transaction
- [x] 3.7 Implement `PATCH /tasks/:id/position` (or equivalent) for drag-and-drop reordering using fractional position calculation
- [x] 3.8 Implement `DELETE /tasks/:id` (scoped to owner)
- [x] 3.9 Apply the auth middleware (Section 2) to the `/tasks` router

## 4. Task comments API

- [x] 4.1 Implement `POST /tasks/:id/comments` (create, scoped to task owner)
- [x] 4.2 Implement `GET /tasks/:id/comments` (list comments for a task the user owns)
- [x] 4.3 Implement `PATCH /tasks/:id/comments/:commentId` (edit body, scoped to owner)
- [x] 4.4 Implement `DELETE /tasks/:id/comments/:commentId` (scoped to owner)

## 5. Habit tracking API

- [x] 5.1 Create user-scoped Habit query helper(s)
- [x] 5.2 Implement `POST /habits` (create, validates `frequency` enum)
- [x] 5.3 Implement `GET /habits` (list, scoped to authenticated user)
- [x] 5.4 Implement `GET /habits/:id` (scoped; 404 if not owned)
- [x] 5.5 Implement `PATCH /habits/:id` and `DELETE /habits/:id` (scoped to owner)
- [x] 5.6 Implement `POST /habits/:id/checkins` computing `periodStart` from `frequency` (today's date for daily, start of ISO week for weekly) and relying on the unique constraint to avoid duplicate rows for the same period
- [x] 5.7 Implement `GET /habits/:id/checkins` (list check-ins for a habit the user owns)
- [x] 5.8 Apply the auth middleware (Section 2) to the `/habits` router

## 6. Server configuration

- [x] 6.1 Update CORS config in `server.js` to allow `POST`/`PUT`/`PATCH`/`DELETE` for `/tasks` and `/habits`, while keeping `/quotes` and `/pictures` on the existing `GET`-only policy
- [x] 6.2 Restrict CORS origin for the new write-capable routes to the extension's `chrome-extension://<extension-id>` origin instead of `*`
- [x] 6.3 Mount the new `/tasks` and `/habits` routers in `server.js`

## 7. Verification

- [x] 7.1 Manually verify `/quotes` and `/pictures` still respond without auth and reject non-GET methods as before — confirmed via curl: both return 200 on GET; no write routes exist for either (unchanged from before this change)
- [x] 7.2 Manually verify `/tasks` and `/habits` reject requests without a valid Supabase JWT — confirmed via curl: missing `Authorization` header returns 401 on both routers
- [x] 7.3 Manually verify a task created by one authenticated user is not visible/editable by another user's token — confirmed by owner against a real Supabase project and two real Google-signed JWTs
- [x] 7.4 Manually verify a full task lifecycle: create → move through TODO/DOING/DONE → confirm `TaskStatusHistory` entries → add/edit/delete a comment → reorder via `position` — confirmed by owner
- [x] 7.5 Manually verify a full habit lifecycle: create daily and weekly habits → check in → confirm duplicate check-in for the same period does not create a second row — confirmed by owner
