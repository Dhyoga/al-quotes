## 1. Prisma Schema & Migration

- [x] 1.1 Add `event` to the `CalendarEntityType` enum in `prisma/schema.prisma`
- [x] 1.2 Add the `Event` model to `prisma/schema.prisma`:
  ```
  model Event {
    id             Int      @id @default(autoincrement())
    userId         String
    title          String
    description    String?
    location       String?
    startAt        String
    endAt          String?
    isRecurring    Boolean  @default(false)
    rrule          String?
    syncToCalendar Boolean  @default(true)
    createdAt      DateTime @default(now())
    updatedAt      DateTime @updatedAt
    @@index([userId])
    @@index([userId, startAt])
  }
  ```
- [x] 1.3 Run `prisma migrate dev --name event-feature` to generate and apply the migration
- [x] 1.4 Run `prisma generate` to regenerate the Prisma client

## 2. Pusher: publishEventEvent

- [x] 2.1 Add `publishEventEvent(userId: string, event: string, payload: unknown): void` to `lib/pusher.ts`, following the same fire-and-forget pattern as `publishHabitEvent`
- [x] 2.2 Export `publishEventEvent` from `lib/pusher.ts`

## 3. Events Repository

- [x] 3.1 Create `lib/events-repository.ts`
- [x] 3.2 Implement `listEventsForUser(userId: string)`: returns all events for the user ordered by `startAt` ascending
- [x] 3.3 Implement `findEventForUser(userId: string, id: number)`: returns the event if it belongs to the user, else `null`
- [x] 3.4 Implement `createEvent(userId, data)`: creates the event, calls `publishEventEvent(..., 'event.created', event)`, and calls `syncEventToCalendar` if `syncToCalendar` is `true`
- [x] 3.5 Implement `updateEvent(userId, id, data)`: updates the event, calls `publishEventEvent(..., 'event.updated', event)`, and calls `syncEventToCalendar` if `syncToCalendar` is `true`
- [x] 3.6 Implement `deleteEvent(userId, id)`: snapshots `CalendarSync` row, deletes the event, calls `publishEventEvent(..., 'event.deleted', { id })`, and calls `syncDelete` if a sync row existed
- [x] 3.7 Implement `toCalendarPayload(event)` and `syncEventToCalendar(userId, event)` helpers (fire-and-forget `syncUpsert` call)

## 4. Events Routes

- [x] 4.1 Create `routes/events.ts` with an Express router, `requireJwt` middleware applied to all routes
- [x] 4.2 `POST /`: validate `title` (required), `startAt` (required), `isRecurring`/`rrule` consistency (rrule required when isRecurring is true); call `createEvent`; respond 201
- [x] 4.3 `GET /`: call `listEventsForUser`; respond 200 with array
- [x] 4.4 `GET /:id`: call `findEventForUser`; respond 200 or 404
- [x] 4.5 `PATCH /:id`: verify ownership via `findEventForUser` (404 if not found); build partial update object; call `updateEvent`; respond 200
- [x] 4.6 `DELETE /:id`: verify ownership via `findEventForUser` (404 if not found); call `deleteEvent`; respond 204

## 5. Server Wiring

- [x] 5.1 Import `eventsRoutes` from `./routes/events.js` in `server.ts`
- [x] 5.2 Mount at `app.use('/events', eventsRoutes)`

## 6. Manual Testing

- [x] 6.1 Create a one-time event via `POST /events` → confirm 201 and correct fields returned
- [x] 6.2 Create a recurring event with `isRecurring: true` and a valid RRULE → confirm stored correctly
- [x] 6.3 Create an event without `title` or without `startAt` → confirm 400
- [x] 6.4 Create a recurring event without `rrule` → confirm 400
- [x] 6.5 `GET /events` returns only the authenticated user's events
- [x] 6.6 `PATCH /events/:id` updates a field; `GET /events/:id` reflects the change
- [x] 6.7 `DELETE /events/:id` responds 204; subsequent `GET /events/:id` returns 404
- [x] 6.8 With Google Calendar connected and `syncToCalendar: true`, create an event → confirm a calendar upsert job is published (check QStash logs or n8n)
- [x] 6.9 Delete a synced event → confirm a calendar delete job is published
- [x] 6.10 Accessing another user's event returns 404

## 7. Calendar Sync Payload Fix & n8n Workflow

`entityType: 'event'` collides with the existing `event` action-string field in the QStash payload built by `syncUpsert` (see design.md). The n8n workflow also has no branch for `event` entities. Both must land together with the rest of this change — see design.md's Migration Plan for deploy ordering.

- [x] 7.1 In `lib/calendar-sync.ts`, rename the action-string field from `event` to `action` in both `syncUpsert` (`event: \`${entityType}.upserted\`` → `action: ...`) and `syncDelete` (`event: \`${entityType}.deleted\`` → `action: ...`). Leave the `[entityType]: entityPayload` key as-is (now safe: `action` no longer collides with `entityType: 'event'`)
- [x] 7.2 In `al-quotes/n8n/Google Calendar Sync.json`, update the **"Is Upsert?"** node's condition from `$json.body.event.includes('upserted')` to `$json.body.action.includes('upserted')`
- [x] 7.3 In the **"Insert Event"** and **"Patch Event"** nodes, extend the `summary`/`description` ternary to a 3-way branch covering `entityType === 'event'`, reading `event.title`/`event.description`
- [x] 7.4 In the same two nodes, set `location` from `event.location` (new — no existing entity sets `location` on the Calendar API body)
- [x] 7.5 In the same two nodes, branch `start.dateTime`/`end.dateTime` for `entityType === 'event'` to use `event.startAt`/`event.endAt ?? event.startAt` instead of `$now`-based defaults
- [x] 7.6 In the same two nodes, extend the `recurrence` expression so `entityType === 'event' && event.isRecurring` also produces `[event.rrule]` (currently only `entityType === 'habit'` is checked)
- [x] 7.7 Re-import/update the workflow in the n8n instance and confirm it's active
- [x] 7.8 Manual test: with Google Calendar connected, create a recurring event with `syncToCalendar: true` → confirm the n8n execution succeeds (no `.includes` crash on a non-string `action`), the Google Calendar event is created with the correct title/time/recurrence, and the `linked` callback sets `CalendarSync.googleEventId`
- [x] 7.9 Manual test: create a non-recurring event and a recurring one back-to-back → confirm neither crashes the workflow and both produce correctly-shaped Google Calendar events

## 8. MCP Tool Support for Events

- [x] 8.1 Add `rrule` to `package.json` dependencies
- [x] 8.2 Create `lib/recurrence.ts` exporting `getEventOccurrencesInRange(event, start: Date, end: Date): Date[]`, using `rrulestr(event.rrule, { dtstart: new Date(event.startAt) }).between(start, end, true)` for recurring events; wrap parsing in try/catch and return `[]` (plus `console.error`) on a malformed `rrule` instead of throwing
- [x] 8.3 In `lib/mcp-tools.ts`, register `list_events`: no input parameters, calls `listEventsForUser(userId)`
- [x] 8.4 Register `create_event`: zod schema with `title` (required, min 1), `description`/`location` (optional), `startAt`/`endAt` (`z.string().datetime({ offset: true })`, `startAt` required), `isRecurring` (optional boolean), `rrule` (optional string), `syncToCalendar` (optional boolean); inline check that `rrule` is present when `isRecurring` is true (mirroring `routes/events.ts`), returning a `toolError` if not; calls `createEvent`
- [x] 8.5 Register `update_event`: zod schema mirrors `create_event` but all fields optional plus required `id`; verify ownership via `findEventForUser` first (`toolError` if not found); merge-with-existing `isRecurring`/`rrule` check identical to `routes/events.ts`'s PATCH handler; calls `updateEvent`
- [x] 8.6 Register `delete_event`: input `{ id: z.number().int() }`; verify ownership via `findEventForUser` first (`toolError` if not found); calls `deleteEvent`; returns `toolResult({ id, deleted: true })`
- [x] 8.7 Extend `get_today_overview`: compute UTC day window (reuse existing `startOfDay`/`endOfDay`); for each of the user's events, include it in `eventsToday` if non-recurring and `startAt` falls in the window, or if recurring and `getEventOccurrencesInRange` returns at least one occurrence in the window; add `eventsToday` to the returned object alongside `tasksDueToday`/`habitsPendingCheckIn`
- [x] 8.8 Rewrite the `Purpose` section of `openspec/specs/mcp-server/spec.md` (currently a TBD stub left over from the original MCP change) to describe the full tool surface across tasks, habits, and events

## 9. Manual Testing — MCP Tools

- [x] 9.1 `list_events` via an MCP client returns only the authenticated user's events
- [x] 9.2 `create_event` with a recurring event and valid RRULE → confirm it's created and visible via `GET /events`
- [x] 9.3 `create_event` with `isRecurring: true` and no `rrule` → confirm a tool error, no event created
- [x] 9.4 `update_event` on another user's event id → confirm a tool error, no change made
- [x] 9.5 `delete_event` on an owned event → confirm it's removed and a `toolResult({ id, deleted: true })` is returned
- [x] 9.6 `delete_event` on another user's event id → confirm a tool error, event not deleted
- [x] 9.7 `get_today_overview` with a one-time event today, a recurring event occurring today, and a recurring event not occurring today → confirm `eventsToday` includes the first two and excludes the third
- [x] 9.8 `get_today_overview` with an event whose stored `rrule` is malformed → confirm the call still succeeds and returns `tasksDueToday`/`habitsPendingCheckIn` correctly, skipping just that event
