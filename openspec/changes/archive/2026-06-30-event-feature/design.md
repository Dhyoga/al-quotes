## Context

The server already has Task and Habit models following the same CRUD+Pusher+CalendarSync pattern. The `CalendarSync` table uses a `CalendarEntityType` enum (`task | habit`) and a generic `entityId` integer, so adding `event` to the enum is the only schema dependency outside the new `Event` table. The `syncUpsert` and `syncDelete` helpers in `lib/calendar-sync.ts` are generic over `CalendarEntityType` for routing and persistence — but `syncUpsert`'s payload shape has a latent key collision that only surfaces once `entityType` can be `'event'` (see Decisions below), and the downstream n8n workflow (`al-quotes/n8n/Google Calendar Sync.json`) has its task/habit branching hardcoded and needs an explicit `event` branch.

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

### Rename the `syncUpsert`/`syncDelete` action field from `event` to `action`

`syncUpsert` in `lib/calendar-sync.ts` builds the QStash payload as:

```ts
publishCalendarSync({
  event: `${entityType}.upserted`,   // action string, e.g. "task.upserted"
  entityType,
  ...
  [entityType]: entityPayload,       // entity data, keyed by its own type
});
```

This works for `task`/`habit` because neither collides with the literal key `event`. Once `entityType` can be `'event'`, the computed key `[entityType]: entityPayload` is *also* named `event`, and in a JS object literal the later key wins — `entityPayload` (the Event row) silently overwrites the action string. The n8n workflow's **"Is Upsert?"** node reads `$json.body.event.includes('upserted')`; with the action string clobbered, `body.event` becomes an object and `.includes` throws, failing every event upsert webhook.

**Decision:** rename the action-string field from `event` to `action` in both `syncUpsert` and `syncDelete`. The entity-data key stays keyed by `entityType` (`task` / `habit` / `event`) — fully generic, no special-casing, and consistent English naming across all three entity types. The only consumer of the action-string field is n8n's "Is Upsert?" node, so this is a two-sided, fully internal rename (no other backend or frontend code reads `body.event` as the action string).

Alternative considered: keep the action field named `event` and rename the event-entity payload key to something else (e.g. `acara`) to dodge the collision. Rejected — it would make `acara` the only non-English identifier in an otherwise fully English codebase, just to work around a naming accident.

### MCP tool surface: full CRUD parity for events, including delete

`list_tasks`/`create_task`/`update_task` and `list_habits`/`check_in_habit` are the existing MCP tool surface — notably, neither task nor habit exposes a delete tool, even though `deleteTask` exists in the repository. Events break that precedent deliberately: `list_events`, `create_event`, `update_event`, and `delete_event` are all registered. Tasks/habits are typically resolved by completing or archiving them; events are calendar entries a user is more likely to need to outright remove (wrong date entered, plans cancelled), so an LLM-driven caller needs delete access to be useful for event management.

`list_events` takes no filter parameters (unlike `list_tasks`, which accepts `status`/`dueBefore`/`dueAfter`). This mirrors `list_habits` rather than `list_tasks`, and is consistent with the events feature's own non-goal of date-range querying in this version — giving the MCP tool filtering that `GET /events` itself doesn't have would be a new, unrequested capability.

### `startAt`/`endAt` validated strictly in MCP tool schemas, diverging from the HTTP route

`routes/events.ts` never validates the format of `startAt`/`endAt` — it passes whatever string arrives straight through to the `String` columns and downstream to Google Calendar. The MCP tool schemas use `z.string().datetime({ offset: true })` instead, which is stricter than the route. This is a deliberate, acknowledged divergence: LLM-generated input is exactly the kind of unstructured input datetime validation exists to catch, and a malformed `startAt` silently breaking calendar sync is worse than rejecting it at the MCP boundary with a clear tool error.

`isRecurring`/`rrule` cross-field validation is done as a manual inline check in the tool handler (mirroring the `if (isRecurring && !rrule)` pattern in `routes/events.ts`, including the merge-with-existing logic `update_event` needs), not a zod `.refine()` — consistent with how the rest of `lib/mcp-tools.ts` already handles validation that doesn't fit cleanly into a per-field schema.

### `get_today_overview` gains `eventsToday` via a new `lib/recurrence.ts`

Non-recurring events use the same UTC-day-window check tasks already use for `dueDate`. Recurring events need RRULE expansion, which nothing in this codebase does today — `buildHabitRrule` in `lib/calendar-sync.ts` only *generates* RRULE strings, never parses them. The stored RRULE strings (for both habits and events) never carry `DTSTART`, so expansion requires supplying `dtstart` separately from `event.startAt`:

```ts
rrulestr(event.rrule, { dtstart: new Date(event.startAt) }).between(start, end, true)
```

This lands in a new `lib/recurrence.ts` exporting a general-purpose `getEventOccurrencesInRange(event, start, end)`, rather than a single-purpose boolean check — `lib/period.ts` already establishes the pattern of a standalone helper module for date/recurrence math, and a range-based API leaves a clean reuse hook (e.g. a future remindeen "today" or date-range view) without requiring a second helper later.

New dependency: `rrule` (npm). Lightweight, no heavy transitive deps, ESM-compatible — fits the project's `"type": "module"` setup.

**Timezone caveat, inherited not introduced:** `event.startAt` is offset-aware, but once parsed into a `Date` it collapses to a UTC instant, and `get_today_overview`'s "today" window is already plain UTC day boundaries (`startOfDay.setUTCHours(0,0,0,0)`) for tasks. Events join that existing imprecision rather than introducing a new one — a recurring event very near a day boundary could in theory land on the "wrong" UTC day, same class of edge case that already exists for task due-dates today. Accepted, not fixed, in this change.

**Malformed RRULE strings must not break the whole response:** `routes/events.ts` only checks `rrule` is truthy, never that it's syntactically valid RRULE syntax — so a bad string could already exist in the DB before this change ships. `rrulestr()` throws on invalid input. Expansion is wrapped in a per-event try/catch that skips and logs the offending event rather than letting one bad RRULE take down `tasksDueToday`/`habitsPendingCheckIn` alongside it — same defensive posture as the existing fire-and-forget calendar-sync error swallowing elsewhere in the codebase.

### Ownership checks must be replicated by the MCP tool handlers, not assumed

`updateEvent`/`deleteEvent` in `lib/events-repository.ts` do **not** filter by `userId` at the Prisma level (`prisma.event.delete({ where: { id } })`) — ownership is enforced entirely by the caller doing `findEventForUser(userId, id)` first and only proceeding if found. `routes/events.ts` gets this right today via its 404-before-mutate pattern. `update_event` and `delete_event` MCP tools must replicate that exact pre-check (same `findEventForUser`-then-`toolError` pattern `update_task` already uses) or they become a cross-user data hole. `delete_event` returns `toolResult({ id, deleted: true })` after that check succeeds — there's no existing delete-tool precedent to mirror, since this is the first one.

### n8n workflow needs an explicit `event` branch

`al-quotes/n8n/Google Calendar Sync.json`'s **"Insert Event"** and **"Patch Event"** nodes build the Google Calendar API body with a binary ternary: `entityType === 'task' ? task.* : habit.*`. There is no third branch, so an `event` payload would silently fall into the habit branch: `summary`/`description` would read `undefined` (`habit.title`/`habit.description` instead of `event.title`/`event.description`), `start`/`end` would use `$now.toISO()` / `$now.plus({hours:1})` instead of `event.startAt`/`event.endAt`, and `recurrence` would stay `undefined` even for a recurring event (the existing check is `entityType === 'habit'` only).

**Decision:** add an explicit `entityType === 'event'` branch to both nodes:
- `summary` ← `event.title`, `description` ← `event.description`
- `location` ← `event.location` (new — no entity sets `location` on the Calendar API body today, since neither Task nor Habit has a location field)
- `start.dateTime` ← `event.startAt`, `end.dateTime` ← `event.endAt ?? event.startAt` (events may omit `endAt`)
- `recurrence` ← `event.isRecurring ? [event.rrule] : undefined` (habits always recur; events only recur conditionally)

The **"Is Upsert?"**, **"Has Google Event Id?"**, **"Delete Event"**, **"Callback: Linked"**, and **"Callback: Unlinked"** nodes are already generic over `entityType`/`entityId` and need no change beyond the `action` field rename above.

## Risks / Trade-offs

- **No date-range query** — the client fetches all events and filters locally. Acceptable for small event counts; add DB-side date filtering later if needed.
- **`startAt` sort order** — listing events by `startAt` string-order works correctly only when offsets are consistent (same offset sorts correctly). For cross-timezone users, a UTC index would be needed. Deferred.
- **`CalendarEntityType` enum migration** — adding `event` to a Postgres enum requires a migration. Non-destructive, no downtime risk.
- **`event`/`action` field rename is a breaking change for the n8n workflow** — the API and the n8n workflow must deploy together (or the workflow updated first, since it's backward-compatible-read: `action` simply wouldn't exist yet on old payloads, only an issue for in-flight QStash jobs published before the rename and consumed after — acceptable given QStash jobs are processed near-instantly and this is a low-traffic internal sync).

## Migration Plan

1. `prisma migrate dev --name event-feature`: adds `Event` table and `event` to `CalendarEntityType`
2. Update `al-quotes/n8n/Google Calendar Sync.json`: rename the `Is Upsert?` condition to read `action` instead of `event`, and add the `entityType === 'event'` branch to `Insert Event`/`Patch Event` (see Decisions above); re-import/activate in n8n
3. Deploy API — new `/events` routes are additive; the `event`→`action` rename in `lib/calendar-sync.ts` changes the sync payload shape, so deploy this alongside step 2
4. Deploy remindeen frontend (paired change)
5. Rollback: remove `Event` table and `event` from enum (data loss only for any created events); revert the n8n workflow and the `action` field rename together
