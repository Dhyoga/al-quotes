## Context

`Habit` currently has two fixed frequencies (`daily`/`weekly`) with no day selection, no reminder time, and unconditional Google Calendar sync. `Task` received a `syncToCalendar` opt-in flag in `add-per-task-calendar-sync-toggle`; habits need the same. Three new nullable/defaulted fields are added to `Habit`, along with matching route and sync logic changes.

## Goals / Non-Goals

**Goals:**
- Add `weekDays Int[]`, `reminderTime String?`, `syncToCalendar Boolean @default(false)` to `Habit`
- Gate habit calendar sync on `syncToCalendar = true` (mirrors Task behaviour)
- Publish a delete-sync job when `syncToCalendar` flips from true→false on an existing synced habit
- Generate correct RRULE for weekly habits with specific days
- Backfill existing habits with `syncToCalendar = true` when they already have a `CalendarSync` row

**Non-Goals:**
- Enforcing which days a check-in is allowed (user may check in any day — `weekDays` is advisory)
- Reminder notifications / push delivery (stored as data only)
- Per-check-in timezone handling (separate `fix-habit-checkin-timezone` change)
- UI changes (handled by a paired remindeen change)

## Decisions

### `weekDays` as `Int[]` (Postgres array)

`weekDays` stores day-of-week integers (0 = Sunday … 6 = Saturday). An empty array `[]` means "any day" and preserves current weekly behaviour for existing rows — no backfill needed for `weekDays`. The array is small (max 7 elements), ordering is irrelevant, and Postgres native arrays avoid a join table for a trivial domain.

Alternative considered: `weekDays String?` (comma-separated "MO,WE,FR"). Rejected — harder to validate and query; array is more explicit.

### `reminderTime String?` as `"HH:MM"`

Stored as a plain string in 24-hour `HH:MM` format (e.g. `"05:30"`). The value is local time — the client knows the user's timezone and interprets it. The server treats it as opaque metadata.

Alternative considered: storing as a `DateTime` or a `Time` type. Rejected — Prisma has no native `Time` type; a full `DateTime` carries false precision and timezone baggage for what is simply a clock time.

### RRULE function replaces `RRULE_BY_FREQUENCY` lookup

`RRULE_BY_FREQUENCY` is a static `Record<HabitFrequency, string>`. It is replaced by a `buildHabitRrule(frequency, weekDays)` function:
- `daily` → `RRULE:FREQ=DAILY` (unchanged)
- `weekly`, empty `weekDays` → `RRULE:FREQ=WEEKLY` (unchanged)
- `weekly`, non-empty `weekDays` → `RRULE:FREQ=WEEKLY;BYDAY=<days>` (e.g. `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR`)

Day integers map to iCal abbreviations: `0→SU, 1→MO, 2→TU, 3→WE, 4→TH, 5→FR, 6→SA`. The function lives in `lib/calendar-sync.ts` alongside the existing sync helpers.

### Delete-sync on `syncToCalendar` flip (same pattern as Tasks)

`updateHabit` in `habits-repository.ts` receives the old habit value before the update. If `syncToCalendar` transitions true→false and a `CalendarSync` row exists, `syncDelete` is called (fire-and-forget, same as task deletion). The update otherwise proceeds regardless of sync outcome.

### Migration backfill

Prisma migration adds the three columns with defaults. A `prisma.$executeRaw` backfill in the same migration sets `syncToCalendar = true` for habits that already have a `CalendarSync` row, mirroring the Task backfill from `add-per-task-calendar-sync-toggle`.

## Risks / Trade-offs

- **Existing habit calendar events go stale for habits backfilled to `syncToCalendar = false`** → Mitigated by the backfill: only habits with an existing `CalendarSync` row get `true`; habits that never synced remain `false` and have no event to go stale.
- **`weekDays` order in RRULE** → iCal parsers treat `BYDAY` as a set, not an ordered list, so sort order doesn't matter. We sort ascending for deterministic output.
- **`reminderTime` is client-timezone-dependent** → Stored as-is; the server never interprets it as UTC. This is correct for a reminder field but means calendar sync cannot use it to set a precise `DTSTART` time without knowing the user's timezone. For this change, the calendar event time remains unchanged (no `DTSTART` override).

## Migration Plan

1. Generate Prisma migration: `prisma migrate dev --name enhance-habits`
   - Adds `weekDays Int[] @default([])`, `reminderTime String?`, `syncToCalendar Boolean @default(false)` to `Habit`
   - Backfill: `UPDATE "Habit" SET "syncToCalendar" = true WHERE id IN (SELECT "entityId" FROM "CalendarSync" WHERE "entityType" = 'habit')`
2. Deploy API (`al-quotes`) — new fields are optional, no client changes required on deploy
3. Deploy UI (`remindeen`) — adds form controls for the new fields
4. Rollback: remove the three columns (no foreign keys, no cascade complexity)
