## Why

The app currently tracks recurring habits and one-off tasks, but has no way to represent calendar events — a specific moment in time with a name, optional location, and optional recurrence. Users want to select a date in the remindeen calendar UI, create an event with a time and description, and optionally sync it to Google Calendar. This adds the backend model, CRUD routes, and calendar sync pipeline for events.

## What Changes

- Add `Event` model to the Prisma schema with fields: `id`, `userId`, `title`, `description?`, `location?`, `startAt` (ISO 8601 string with timezone offset), `endAt?` (same format), `isRecurring Boolean @default(false)`, `rrule String?` (iCal RRULE string), `syncToCalendar Boolean @default(true)`.
- Add `event` to the `CalendarEntityType` enum so the existing `CalendarSync` table can record event↔Google-event linkage.
- Add `POST /events`, `GET /events`, `GET /events/:id`, `PATCH /events/:id`, `DELETE /events/:id` routes (all JWT-gated).
- Calendar sync for events follows the same fire-and-forget pattern as Tasks and Habits: upsert job on create/update when `syncToCalendar` is true, delete job on delete when a `CalendarSync` row exists.
- Editing or deleting a recurring event always operates on the full series (no single-occurrence editing in this version).
- Real-time events published on create, update, and delete via Pusher (same pattern as habits and tasks).
- New `lib/events-repository.ts` with `listEventsForUser`, `findEventForUser`, `createEvent`, `updateEvent`, `deleteEvent`.
- Add MCP tools `list_events`, `create_event`, `update_event`, `delete_event` so an LLM-driven MCP client gets the same CRUD access to events that it already has for tasks and habits, and fold events into `get_today_overview`'s combined response.

## Capabilities

### New Capabilities
- `events`: CRUD for user-owned calendar events with optional Google Calendar sync

### Modified Capabilities
- `google-calendar-sync`: sync pipeline now also handles `event` entity type in addition to tasks and habits; `CalendarEntityType` enum gains `event` value
- `mcp-server`: tool surface gains `list_events`/`create_event`/`update_event`/`delete_event`; `get_today_overview` gains an `eventsToday` field covering both one-time and recurring events occurring in the current UTC day

## Impact

- `prisma/schema.prisma` — new `Event` model, `event` added to `CalendarEntityType` enum; new Prisma migration
- `lib/events-repository.ts` — new file
- `routes/events.ts` — new file
- `server.ts` (or router index) — mount `/events` router
- `lib/calendar-sync.ts` — `event` entity type wired into sync helpers; the action-string field in `syncUpsert`/`syncDelete` is renamed from `event` to `action` to avoid colliding with the `[entityType]: entityPayload` key when `entityType === 'event'` (see design.md)
- `al-quotes/n8n/Google Calendar Sync.json` — add an `entityType === 'event'` branch to the **Insert Event**/**Patch Event** nodes (title/description/location/start/end/recurrence sourced from the event payload instead of falling through to the habit branch), and update **Is Upsert?** to read the renamed `action` field (see design.md)
- `lib/pusher.ts` — add `publishEventEvent` function (or reuse existing pattern)
- `lib/mcp-tools.ts` — register `list_events`/`create_event`/`update_event`/`delete_event`; extend `get_today_overview` with `eventsToday`
- `lib/recurrence.ts` — new file, `getEventOccurrencesInRange(event, start, end)` RRULE expansion helper
- `package.json` — new dependency: `rrule`
- `openspec/specs/mcp-server/spec.md` — Purpose line (currently a TBD stub left over from the original MCP change) gets rewritten to describe the full tool surface (tasks, habits, events) once this change is archived
