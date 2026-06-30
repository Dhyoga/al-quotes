## Why

Habit tracking currently offers only two blunt frequency options — `daily` or `weekly` — with no way to pin weekly habits to specific days, no reminder time for daily habits, and no control over whether a habit syncs to Google Calendar (every habit always syncs). Tasks received per-item calendar sync control in `add-per-task-calendar-sync-toggle`; habits need the same treatment, plus the richer scheduling that makes the feature genuinely useful.

## What Changes

- Add `weekDays Int[]` to `Habit`: for weekly habits, the days of the week on which the habit is expected (0 = Sunday … 6 = Saturday). An empty array keeps the existing "any day this week" behaviour, preserving backward compatibility.
- Add `reminderTime String?` to `Habit`: an optional `"HH:MM"` local-time string that records when the user intends to do the habit (informational — does not restrict when check-ins are accepted).
- Add `syncToCalendar Boolean @default(false)` to `Habit`: mirrors the Task field introduced in `add-per-task-calendar-sync-toggle`. Habit calendar sync now only fires when this flag is `true`.
- **BREAKING (soft)**: habits created without `syncToCalendar: true` will no longer sync to Google Calendar, even when the user has a connected calendar. Existing habits that already have a `CalendarSync` row are backfilled to `syncToCalendar = true` at migration time.
- `POST /habits` and `PATCH /habits/:id` accept the new fields (`weekDays`, `reminderTime`, `syncToCalendar`).
- When `syncToCalendar` transitions from `true` to `false` and the habit has an existing `CalendarSync` row, a delete sync job is published (same pattern as Tasks).
- RRULE generation for weekly habits with non-empty `weekDays` changes from `RRULE:FREQ=WEEKLY` to `RRULE:FREQ=WEEKLY;BYDAY=<days>` (e.g. `MO,WE,FR`).

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `habit-tracking`: new optional fields (`weekDays`, `reminderTime`, `syncToCalendar`) on create/update; check-in behaviour unchanged but `weekDays` becomes queryable alongside each habit.
- `google-calendar-sync`: habit sync is now gated on `syncToCalendar = true`, mirroring the Task gate added previously; disabling sync on a habit that has a `CalendarSync` row publishes a delete job; RRULE reflects selected week days when set.

## Impact

- `prisma/schema.prisma` — new fields on `Habit` model; new Prisma migration with backfill
- `lib/habits-repository.ts` — `syncHabitToCalendar` gated on `syncToCalendar`; delete-sync on flag flip; new fields passed through on create/update
- `routes/habits.ts` — accept and validate `weekDays`, `reminderTime`, `syncToCalendar` in POST and PATCH
- `lib/calendar-sync.ts` — `RRULE_BY_FREQUENCY` replaced by a function that incorporates `weekDays` for weekly habits
