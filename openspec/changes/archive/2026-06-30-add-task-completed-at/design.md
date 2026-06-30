## Context

The remindeen Kanban board is being redesigned to page through tasks by the ISO week they were completed (paired frontend change `add-kanban-habit-pagination` in the `remindeen` repo). That UI needs a reliable "completed at" timestamp per task. Today the only candidates are:

- `updatedAt` — touched by *any* field update, not just status changes. A task edited (title/description/priority) weeks after being marked DONE would silently jump to the wrong week.
- `TaskStatusHistory` — already records every transition (`fromStatus`, `toStatus`, `changedAt`), but is never read by any route; deriving "most recent transition into DONE" from it requires either a new endpoint or eager-loading the relation on every task list/get call.

This was already weighed against the alternative during exploration (see paired remindeen proposal's history): a dedicated `completedAt` column was chosen over exposing `TaskStatusHistory` because it keeps the read path (the hot path — `GET /tasks` is called on every Kanban load) to a single flat field instead of a join + derive-in-application-code step, and it gives the same "most recent completion" semantics as the latest history row would, since it's overwritten/cleared on every transition.

## Goals / Non-Goals

**Goals:**
- Give every `Task` a `completedAt` field that answers "when did this most recently become DONE," independent of unrelated edits.
- Keep `GET /tasks` (and all other task read paths) free of joins — `completedAt` is a plain column.
- Backfill existing DONE tasks so the field is populated immediately after migration, not just for tasks completed going forward.

**Non-Goals:**
- Preserving a full completion *history* (e.g. a task done, reopened, then done again twice) — `completedAt` only tracks the latest completion, matching how `TaskStatusHistory` would be queried anyway (`ORDER BY changedAt DESC` for `toStatus = DONE`). Multiple-completion history remains available in `TaskStatusHistory` for any future need, untouched by this change.
- Exposing `TaskStatusHistory` via the API — out of scope; nothing in this change reads that table.
- Any remindeen/frontend work — covered by the paired change `add-kanban-habit-pagination`.

## Decisions

**1. New `completedAt DateTime?` column on `Task`, not a computed/derived value.**
Rationale: `GET /tasks` is unauthenticated-by-JWT but still a frequent, simple list query (`prisma.task.findMany`). Deriving `completedAt` from `TaskStatusHistory` on every read would mean either an N+1 query per task or a `groupBy`/window-function query to find the latest `DONE` transition per task — meaningfully more complex than a flat column for a read path that already has no joins today.

**2. Set/clear `completedAt` inside the existing `statusTransition` branch of `updateTask`, not a separate code path.**
`lib/tasks-repository.ts`'s `updateTask` already has a dedicated transactional branch (`if (statusTransition)`) that runs exactly when status changes and already writes a `TaskStatusHistory` row. Adding `completedAt` assignment there means it shares the same transaction and the same trigger condition as the history write, so the two can never drift out of sync:
- `toStatus === 'DONE'` → `data.completedAt = new Date()`
- `fromStatus === 'DONE' && toStatus !== 'DONE'` → `data.completedAt = null`
- Any non-status update (no `statusTransition`) never touches `completedAt`.

**3. Backfill via `updatedAt`, accepting it as an approximation for pre-existing data.**
For tasks already `DONE` before this migration ships, there is no way to recover the *actual* completion moment retroactively with full accuracy — `updatedAt` may reflect a later edit, not the completion itself. This was discussed explicitly: the alternative (deriving from `TaskStatusHistory` for the backfill only, one-time) would be more accurate where history rows exist, but the simpler `updatedAt` backfill was chosen since it's a one-time, good-enough approximation and avoids writing one-off migration logic that reads a different table. See Risks below for the user-facing consequence.

**4. `completedAt` is never client-settable.**
Like `status` and `position`, it's system-derived. `routes/tasks.ts`'s `POST`/`PATCH` handlers don't read a `completedAt` key from `req.body` at all (mirroring how they already ignore unknown fields), so clients cannot inject an arbitrary completion date.

## Risks / Trade-offs

- **[Risk] Backfilled `completedAt` (from `updatedAt`) may be wrong for tasks edited after completion, prior to this migration** → Mitigation: this is a one-time historical approximation affecting only tasks already DONE before deploy; all completions going forward are exact (set at the moment of the status transition). Accepted as a known limitation per explicit decision, not silently swallowed — documented here and in the proposal.
- **[Risk] A task bounced DONE → DOING → DONE loses the timestamp of its first completion** → Mitigation: acceptable per Non-Goals; `completedAt` always reflects the *latest* completion, which is what "which week did this get done" should show in the Kanban UI. Full history remains in `TaskStatusHistory` if ever needed later.
- **[Trade-off] Denormalized field instead of single source of truth in `TaskStatusHistory`** → Accepted: simplicity and read-path performance outweigh the minor duplication, since `completedAt` is always derivable from (and kept consistent with) the latest `DONE` transition recorded in history.

## Migration Plan

1. Add `completedAt DateTime?` to the `Task` model in `prisma/schema.prisma`.
2. Generate a Prisma migration that:
   - `ALTER TABLE "Task" ADD COLUMN "completedAt" TIMESTAMP(3);`
   - `UPDATE "Task" SET "completedAt" = "updatedAt" WHERE "status" = 'DONE';`
3. Update `lib/tasks-repository.ts`'s `updateTask` to set/clear `completedAt` in the `statusTransition` branch.
4. Deploy migration before deploying the paired `remindeen` change that reads `completedAt` — the frontend must not read a field that doesn't exist yet. No rollback concerns beyond a standard `prisma migrate` down (drop column), since the field is purely additive and nothing else depends on it within this change.
