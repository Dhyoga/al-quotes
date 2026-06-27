## Context

Calendar sync today is gated only on `GoogleCalendarLink` existing for the user (see `lib/calendar-sync.ts` and `lib/tasks-repository.ts`). Every Task create/update publishes a `task.upserted` job, and delete publishes `task.deleted` if a `CalendarSync` row exists. There's no concept of "this task, specifically, should sync" — it's all-or-nothing per user. The Remindeen extension's Kanban modal redesign (`mature-kanban-task-modal` in the `remindeen` repo) is adding a per-task toggle, so the API and MCP surface need a field for it and the sync pipeline needs to honor it.

## Goals / Non-Goals

**Goals:**
- Add a per-task `syncToCalendar` flag that gates calendar sync independently of the account-level connection.
- Preserve continuity for tasks already visible on a user's calendar when the flag is introduced (no orphaned events left to silently go stale).
- Make disabling the flag on a synced task remove the corresponding calendar event, not just stop updating it.
- Expose the field through both the REST API and the MCP tools so any client (board UI or AI agent) can control it.

**Non-Goals:**
- No change to how the account-level `GoogleCalendarLink` connection works (still a separate opt-in, per `calendar-connection` spec).
- No change to Habit calendar sync (Habits aren't gaining a per-item toggle in this change).
- No UI work — that's entirely in the `remindeen` repo's paired change.

## Decisions

**Field name and type: `syncToCalendar: Boolean @default(false)` on `Task`.**
Matches the naming already used in conversation and mirrors the existing `CalendarSync`/`GoogleCalendarLink` vocabulary. Defaulting new rows to `false` matches the product decision that calendar sync is opt-in per task, not opt-out.

**Migration backfill: `true` for tasks with an existing `CalendarSync` row, `false` otherwise.**
Considered defaulting everything to `false` uniformly (simpler migration), but that would silently stop updating events that are currently live on a user's calendar — the event would freeze at its last state and never get cleaned up, which is worse than the current behavior. Backfilling from `CalendarSync` presence is a one-time, deterministic join (`Task` has no direct FK to `CalendarSync`, but `entityType_entityId` lookup against `CalendarEntityType.task` is enough), and it's the only state we have that reflects "this task is actually on the calendar today."

**Gating logic lives in `syncTaskToCalendar` (`lib/tasks-repository.ts`), not in `lib/calendar-sync.ts`.**
`calendar-sync.ts`'s `syncUpsert`/`syncDelete` are entity-agnostic (shared with Habits) and already take an `entityId` + payload; they shouldn't know about Task-specific fields. `tasks-repository.ts` already wraps `syncUpsert`/`syncDelete` in `syncTaskToCalendar`/`deleteTask`, so the new `if (!task.syncToCalendar) return` check and the toggle-off delete call both belong there, next to the existing `GoogleCalendarLink` check inside `syncUpsert` (which stays as the account-level gate).

**Toggling off triggers a delete job, mirroring the existing task-delete path.**
`updateTask` already knows the previous and new field values are diffed by the caller (`routes/tasks.ts` builds a partial `Prisma.TaskUpdateInput`). The repository layer will compare `existing.syncToCalendar` (true) against the incoming value (false) the same way it already compares `existing.status` against an incoming status to decide whether to record a status transition — same shape, different field. When that transition is detected, call `syncDelete` with the task's existing `CalendarSync.googleEventId` instead of `syncUpsert`.

**MCP tools pass `syncToCalendar` straight through.**
`create_task` and `update_task` already forward most fields 1:1 into `CreateTaskInput`/`UpdateTaskInput`. Adding `syncToCalendar: z.boolean().optional()` to both Zod schemas and threading it into the existing `data`/`CreateTaskInput` objects requires no new branching in `mcp-tools.ts` — the branching lives in the repository layer described above.

## Risks / Trade-offs

- **[Risk]** Callers (API or MCP) that don't pass `syncToCalendar` on create get `false`, a behavior change from "always syncs if connected" → **Mitigation**: called out as **BREAKING** in the proposal; acceptable per product decision, and the board UI will default new tasks' toggle to off to match.
- **[Risk]** The backfill migration runs a query per existing task (or one join) to check `CalendarSync` membership at deploy time → **Mitigation**: `CalendarSync` is keyed by `(entityType, entityId)` with presumably modest row counts (single-user-per-task app); a single `UPDATE ... WHERE EXISTS` SQL migration step covers it without app-level iteration.
- **[Risk]** Toggling the flag rapidly (on/off/on) could race with in-flight QStash jobs from a prior toggle, leaving the calendar in an inconsistent state → **Mitigation**: same fire-and-forget, eventually-consistent model the rest of calendar sync already accepts (publish failures are only logged); not a new class of risk introduced by this change.

## Migration Plan

1. Add `syncToCalendar Boolean @default(false)` to the `Task` model in `schema.prisma`.
2. Generate the Prisma migration, then hand-edit the generated SQL to add a backfill statement: `UPDATE "Task" SET "syncToCalendar" = true WHERE EXISTS (SELECT 1 FROM "CalendarSync" WHERE "entityType" = 'task' AND "entityId" = "Task"."id")`, run after the column is added with its default.
3. Deploy `routes/tasks.ts`, `lib/tasks-repository.ts`, and `lib/mcp-tools.ts` changes together with the migration (single deploy, no need for a feature-flagged rollout since this is an additive field with a safe default).
4. Rollback: dropping the column is safe (no other code reads it yet outside this change); revert the deploy and a follow-up migration removes the column if needed.
