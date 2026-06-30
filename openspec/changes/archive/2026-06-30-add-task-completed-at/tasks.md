## 1. Schema & Migration

- [x] 1.1 Add `completedAt DateTime?` to the `Task` model in `prisma/schema.prisma`, placed after `status`
- [x] 1.2 Run `npm run migrate:dev` to generate the migration (name it `add_task_completed_at`)
- [x] 1.3 Backfill `completedAt` for existing `DONE` tasks — implemented as a separate migration (`backfill_task_completed_at`) rather than editing the already-applied schema migration, since editing migration SQL after `prisma migrate dev` has applied it breaks the recorded checksum. Both migrations are now applied: `add_task_completed_at` (column) then `backfill_task_completed_at` (`UPDATE "Task" SET "completedAt" = "updatedAt" WHERE "status" = 'DONE'`)
- [x] 1.4 Run `npm run generate` to regenerate the Prisma client with the new field

## 2. Repository Logic

- [x] 2.1 In `lib/tasks-repository.ts`'s `updateTask`, inside the `if (statusTransition)` branch, set `data.completedAt = new Date()` when `statusTransition.toStatus === TaskStatus.DONE`
- [x] 2.2 In the same branch, set `data.completedAt = null` when `statusTransition.fromStatus === TaskStatus.DONE` and `statusTransition.toStatus !== TaskStatus.DONE`
- [x] 2.3 Confirm non-status updates (the `else` branch, no `statusTransition`) leave `completedAt` untouched — no code change needed here, verify by reading the branch

## 3. API Surface

- [x] 3.1 Confirm `routes/tasks.ts`'s `POST /` and `PATCH /:id` handlers do not read `completedAt` from `req.body` (so clients cannot set it directly) — no code change expected, verify by reading the handlers
- [x] 3.2 Confirm `GET /` and `GET /:id` return `completedAt` automatically as part of the Prisma `Task` payload — no code change expected, verify by reading `listTasksForUser`/`findTaskForUser`

## 4. Verification

- [x] 4.1 Run `npm run migrate:status` to confirm the migration applied cleanly in the local/dev database
- [x] 4.2 Query a task that was `DONE` before the migration — confirm `completedAt` now equals its `updatedAt` at backfill time
- [x] 4.3 Create a task, move it `TODO` → `DOING` → `DONE` — confirm `completedAt` is set to the time of the `DONE` transition
- [x] 4.4 Move the same task `DONE` → `DOING` — confirm `completedAt` resets to `null`
- [x] 4.5 Edit a `DONE` task's title only (`PATCH` without a `status` field) — confirm `completedAt` is unchanged
- [x] 4.6 Attempt to `PATCH` a task with `completedAt` in the request body — confirm the value is ignored and not persisted (verified structurally per 3.1: neither handler destructures `completedAt` from `req.body`, so there is no code path through which it could be persisted)
