## Context

The server already has Task and Habit models following the same CRUD+Pusher+CalendarSync pattern. The `CalendarSync` table uses a `CalendarEntityType` enum (`task | habit`) and a generic `entityId` integer, so adding `event` to the enum is the only schema dependency outside the new `Event` table. The `syncUpsert` and `syncDelete` helpers in `lib/calendar-sync.ts` are already generic over `CalendarEntityType`, so no changes are needed there.

## Goals / Non-Goals

**Goals:**
- New `Event` model with time, location, recurrence, and calendar sync support
- Full CRUD at `/events` (JWT-gated, user-scoped)
- Real-time events via Pusher on create/update/delete
- Google Calendar sync following the existing fire-and-forget pattern
- `startAt`/`endAt` stored as ISO 8601 strings with timezone offset (e.g. `"2026-07-04T09:00:00+07:00"`)

**Non-Goals:**
- Single-occurrence editing within a recurring series
- Push notification / reminder delivery (stored in `reminderTime` equivalent — out of scope)
- Attendees or invites
- Event search or date-range querying in this version (client fetches all and filters)

## Decisions

### `startAt`/`endAt` stored as `String` (ISO 8601 with offset)

PostgreSQL `TIMESTAMP` always stores UTC; storing the original offset would require a separate column or a `TIMESTAMPTZ` with application-level offset tracking. Since the primary consumer is Google Calendar (which accepts ISO 8601 strings with offsets directly), and since the remindeen frontend can display these strings without conversion, storing the raw offset string in a `String` column preserves full fidelity with zero conversion logic.

Sorting by time for queries is deferred: an index on a stored computed UTC timestamp can be added later if needed.

Alternative considered: store as `DateTime` (UTC) + separate `timezone String`. Rejected — two columns, more conversion code, no benefit for the current use case.

### `rrule String?` for recurrence, series-only edit/delete

A single RRULE string (e.g. `"RRULE:FREQ=WEEKLY;BYDAY=FR"`) describes the full recurrence pattern and is passed directly to the Google Calendar sync payload. Editing or deleting a recurring event always targets the `Event` row (the series master) — there is no per-occurrence tracking in the DB. The Google Calendar event is updated as a series.

Single-occurrence overrides (Google Calendar's "this and following events" / "only this event") are explicitly out of scope.

### `syncToCalendar Boolean @default(true)`

Events are almost always meant to be visible on a calendar (unlike habits, which default to `false`). Defaulting to `true` matches user expectations for a calendar event, while still allowing opt-out.

### `publishEventEvent` in `lib/pusher.ts`

Follows the exact same pattern as `publishHabitEvent` and `publishTaskEvent`: fire-and-forget trigger on the user's private channel. Events: `event.created`, `event.updated`, `event.deleted`.

### Route structure mirrors `/habits`

```
POST   /events           create
GET    /events           list for user
GET    /events/:id       get one
PATCH  /events/:id       update
DELETE /events/:id       delete
```

All routes require JWT. The `:id` routes verify ownership via `findEventForUser` before mutating.

### `lib/events-repository.ts` mirrors `lib/habits-repository.ts`

Functions: `listEventsForUser`, `findEventForUser`, `createEvent`, `updateEvent`, `deleteEvent`. `createEvent` and `updateEvent` call `syncEventToCalendar` (fire-and-forget) when `syncToCalendar` is `true`. `deleteEvent` snapshots the `CalendarSync` row before deletion and calls `syncDelete` if one exists.

The calendar payload for an event:

```ts
{
  title: event.title,
  description: event.description,
  location: event.location,
  startAt: event.startAt,   // ISO string with offset
  endAt: event.endAt,
  isRecurring: event.isRecurring,
  rrule: event.rrule,
}
```

## Risks / Trade-offs

- **No date-range query** — the client fetches all events and filters locally. Acceptable for small event counts; add DB-side date filtering later if needed.
- **`startAt` sort order** — listing events by `startAt` string-order works correctly only when offsets are consistent (same offset sorts correctly). For cross-timezone users, a UTC index would be needed. Deferred.
- **`CalendarEntityType` enum migration** — adding `event` to a Postgres enum requires a migration. Non-destructive, no downtime risk.

## Migration Plan

1. `prisma migrate dev --name event-feature`: adds `Event` table and `event` to `CalendarEntityType`
2. Deploy API — new `/events` routes are additive; no existing behaviour changes
3. Deploy remindeen frontend (paired change)
4. Rollback: remove `Event` table and `event` from enum (data loss only for any created events)
