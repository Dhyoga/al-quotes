## 1. Pusher infrastructure

- [x] 1.1 Add the `pusher` package as a dependency.
- [x] 1.2 Create `lib/pusher.ts`: a module-level Pusher server client constructed from the existing bare `app_id`/`key`/`secret`/`cluster` env vars.
- [x] 1.3 In `lib/pusher.ts`, add `publishTaskEvent(userId, event, payload)` and `publishHabitEvent(userId, event, payload)` helpers that call `pusher.trigger('private-user-' + userId, event, payload)`, each wrapped so a rejection/throw is logged and swallowed rather than propagated.

## 2. Centralize Task writes and publish events

- [x] 2.1 Add `createTask`, `updateTask` (handling both plain field updates and the status-transition transaction that also writes `TaskStatusHistory`), and `deleteTask` to `lib/tasks-repository.ts`, moving the logic currently inline in `routes/tasks.ts` (`POST /`, `PATCH /:id`, `PATCH /:id/position`, `DELETE /:id`) and `lib/mcp-tools.ts` (`create_task`, `update_task`).
- [x] 2.2 Each new repository function calls `publishTaskEvent` after its Prisma call resolves (`task.created`, `task.updated`, `task.deleted`), with delete publishing `{ id }` as the payload.
- [x] 2.3 Update `routes/tasks.ts`'s `POST /`, `PATCH /:id`, `PATCH /:id/position`, and `DELETE /:id` handlers to call the new repository functions instead of `prisma.task.*` directly.
- [x] 2.4 Update `lib/mcp-tools.ts`'s `create_task` and `update_task` tools to call the same repository functions instead of `prisma.task.*` directly.
- [x] 2.5 Confirm `nextPosition` (used by both `routes/tasks.ts` and `lib/mcp-tools.ts` to default a new task's position) is deduplicated into `lib/tasks-repository.ts` rather than kept as two separate copies.

## 3. Centralize Habit writes and publish events

- [x] 3.1 Add `createHabit`, `updateHabit`, `deleteHabit`, and `checkInHabit` to `lib/habits-repository.ts`, moving the logic currently inline in `routes/habits.ts` (`POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/checkins`) and `lib/mcp-tools.ts` (`check_in_habit`).
- [x] 3.2 Each new repository function calls `publishHabitEvent` after its Prisma call resolves (`habit.created`, `habit.updated`, `habit.deleted`, `habit.checkedIn`), with delete publishing `{ id }` as the payload.
- [x] 3.3 Update `routes/habits.ts`'s `POST /`, `PATCH /:id`, `DELETE /:id`, and `POST /:id/checkins` handlers to call the new repository functions instead of `prisma.habit.*` / `prisma.habitCheckIn.*` directly.
- [x] 3.4 Update `lib/mcp-tools.ts`'s `check_in_habit` tool to call the same repository function instead of `prisma.habitCheckIn.upsert` directly.

## 4. Pusher channel authorization endpoint

- [x] 4.1 Add a new route handler for `POST /pusher/auth`: verify the Supabase JWT using the existing logic in `lib/auth.ts`, parse the requested `channel_name`, return `403` if its encoded `userId` doesn't match the token's `userId`, otherwise return `pusher.authorizeChannel(socket_id, channel_name)`'s result.
- [x] 4.2 Mount the new route in `server.ts`.
- [x] 4.3 Add `/pusher/auth` to the existing `EXTENSION_ORIGIN` CORS allowlist (the same one used for `/auth/api-keys`).

## 5. Verification

- [ ] 5.1 Manually verify: creating, updating (including a status change and a position change), and deleting a task via REST each publish the expected event (observe via Pusher's debug console or a temporary test subscriber).
- [ ] 5.2 Manually verify: `create_task` and `update_task` via `/mcp` each publish the same events as their REST counterparts.
- [ ] 5.3 Manually verify: creating, updating, deleting, and checking in a habit via REST each publish the expected event.
- [ ] 5.4 Manually verify: `check_in_habit` via `/mcp` publishes the same event as its REST counterpart.
- [ ] 5.5 Manually verify: `POST /pusher/auth` succeeds for a user's own channel, returns `403` for another user's channel, and `401` with no/invalid JWT.
- [ ] 5.6 Manually verify: temporarily breaking the Pusher credentials does not cause `POST /tasks` (or any other mutation) to fail — the write still succeeds and only the publish fails (check logs).
- [ ] 5.7 Re-run `add-mcp-server`'s existing manual-verification checklist (tasks.md section 5) to confirm the write-path refactor didn't regress MCP auth/behavior.
- [x] 5.8 Run `npm run typecheck`.
