## Why

Calendar sync is currently account-wide: once a user connects Google Calendar, every Task create/update/delete syncs automatically with no way to exclude individual tasks. Remindeen's Kanban modal is being redesigned to let users opt a specific task into calendar sync via a toggle, so the API needs a per-task flag that the sync pipeline respects, and the MCP tools need to expose it so AI-driven task management stays consistent with the board.

## What Changes

- Add a `syncToCalendar` boolean field to the `Task` model, defaulting to `false` for new tasks.
- Backfill `syncToCalendar = true` for existing tasks that already have a `CalendarSync` row at migration time, so calendar events that are already visible to the user keep receiving updates instead of silently going stale; all other existing tasks backfill to `false`.
- `POST /tasks` and `PATCH /tasks/:id` accept an optional `syncToCalendar` boolean.
- The calendar sync pipeline (`syncTaskToCalendar` in `lib/tasks-repository.ts`) only publishes a sync job when `syncToCalendar` is `true`, in addition to the existing "user has an active `GoogleCalendarLink`" condition.
- Turning `syncToCalendar` off on a task that has an existing `CalendarSync` row publishes a delete job for that task's calendar event (same as task deletion does today), so the event doesn't linger in the user's calendar after sync is disabled.
- Turning `syncToCalendar` on (or task creation with it on) behaves like today's upsert path: publishes a sync job that creates or updates the event.
- `create_task` and `update_task` MCP tools accept an optional `syncToCalendar` boolean and pass it through to the same repository functions.
- **BREAKING**: tasks created by API/MCP callers who don't pass `syncToCalendar` will no longer sync even if the user has a connected calendar, since the default flips from "always sync when connected" to "off unless explicitly enabled."

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `kanban-tasks`: tasks now accept a `syncToCalendar` field alongside the existing single-user field set (`title`, `description`, `startDate`, `dueDate`, `priority`, `status`, `position`).
- `google-calendar-sync`: sync-job publishing on Task mutations is now gated by the task's own `syncToCalendar` flag, not just the user's calendar link; disabling the flag on a previously-synced task triggers an explicit delete job.

## Impact

- `prisma/schema.prisma` — new `syncToCalendar` column on `Task`, plus a migration with the backfill described above.
- `lib/tasks-repository.ts` — `createTask`, `updateTask`, `syncTaskToCalendar` gain the gating/delete-on-disable logic.
- `routes/tasks.ts` — accept and validate `syncToCalendar` on create and update.
- `lib/mcp-tools.ts` — `create_task` and `update_task` tool schemas and handlers gain `syncToCalendar`.
- Coordinates with the `remindeen` repo's `mature-kanban-task-modal` change, which adds the toggle UI that drives this field.
