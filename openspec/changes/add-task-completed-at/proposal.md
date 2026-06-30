## Why

The remindeen Kanban UI is about to group `DONE` tasks by the ISO week they were completed (e.g. "Week 26"), so a returning user can see what got finished in past weeks instead of one flat, unordered DONE list. There is currently no way to know *when* a task became `DONE` — `Task` only has `createdAt`/`updatedAt`, and `updatedAt` is overwritten by any later edit (title, description, priority), which would silently misattribute a task to the wrong week. `TaskStatusHistory` already records every status transition with a timestamp, but that table is never read by the API. This change adds a dedicated `completedAt` field on `Task` that reliably answers "when did this become DONE," independent of unrelated edits.

## What Changes

- `Task` gains a `completedAt DateTime?` column.
- Migration backfills `completedAt = updatedAt` for every existing task where `status = 'DONE'`.
- `updateTask`'s status-transition path sets `completedAt = now()` when a task transitions **into** `DONE`, and clears it back to `null` when a task transitions **out of** `DONE` (e.g. moved back to `DOING`).
- `completedAt` is returned on every `Task` API response (list, get-by-id, create, update) since it's a plain model field with no extra serialization step.
- `completedAt` is not directly settable by clients — it is only ever derived from status transitions, same trust boundary as `status` itself today (status changes go through the same code path that already manages `TaskStatusHistory`).

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `kanban-tasks`: tasks now carry a `completedAt` timestamp that reflects the most recent transition into `DONE`, distinct from `updatedAt`.

## Impact

- `prisma/schema.prisma` — add `completedAt DateTime?` to `Task`
- New Prisma migration — add column + backfill existing `DONE` rows from `updatedAt`
- `lib/tasks-repository.ts` — `updateTask`'s `statusTransition` branch sets/clears `completedAt` based on `toStatus`/`fromStatus`
- `routes/tasks.ts` — no route changes needed; `completedAt` rides along on existing `Task` payloads
- No breaking changes to existing API consumers — this is an additive, optional field
