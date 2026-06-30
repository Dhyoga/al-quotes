## 1. Prisma Schema & Migration

- [x] 1.1 Add `weekDays Int[] @default([])` to `Habit` model in `prisma/schema.prisma`
- [x] 1.2 Add `reminderTime String?` to `Habit` model in `prisma/schema.prisma`
- [x] 1.3 Add `syncToCalendar Boolean @default(false)` to `Habit` model in `prisma/schema.prisma`
- [x] 1.4 Run `prisma migrate dev --name enhance-habits` to generate the migration
- [x] 1.5 Add backfill SQL to the generated migration: `UPDATE "Habit" SET "syncToCalendar" = true WHERE id IN (SELECT "entityId" FROM "CalendarSync" WHERE "entityType" = 'habit')`
- [x] 1.6 Run `prisma generate` to regenerate the Prisma client

## 2. Calendar Sync: RRULE Update

- [x] 2.1 Replace `RRULE_BY_FREQUENCY` constant in `lib/calendar-sync.ts` with a `buildHabitRrule(frequency: HabitFrequency, weekDays: number[]): string` function
- [x] 2.2 Implement day-integer-to-iCal-abbreviation mapping (`0→SU, 1→MO, 2→TU, 3→WE, 4→TH, 5→FR, 6→SA`) inside `buildHabitRrule`
- [x] 2.3 For `daily` return `"RRULE:FREQ=DAILY"`; for `weekly` with empty `weekDays` return `"RRULE:FREQ=WEEKLY"`; for `weekly` with non-empty days return `"RRULE:FREQ=WEEKLY;BYDAY=<sorted-days>"`
- [x] 2.4 Update any existing callers of `RRULE_BY_FREQUENCY` to use `buildHabitRrule`

## 3. Habits Repository: Sync Gate & Delete-on-Flip

- [x] 3.1 Update `toCalendarPayload` in `lib/habits-repository.ts` to call `buildHabitRrule(habit.frequency, habit.weekDays)` for the `rrule` field
- [x] 3.2 Add a `syncToCalendar` guard to `syncHabitToCalendar`: only call `syncUpsert` when `habit.syncToCalendar === true`
- [x] 3.3 In `updateHabit`, snapshot the old habit before the update (via `prisma.habit.findUnique`) so the pre-update `syncToCalendar` value is available
- [x] 3.4 After the update, if `syncToCalendar` flipped from `true` to `false` and a `CalendarSync` row exists, call `syncDelete` (fire-and-forget, same pattern as `deleteHabit`)

## 4. Routes: Accept New Fields

- [x] 4.1 In `routes/habits.ts` `POST /`, extract `weekDays`, `reminderTime`, `syncToCalendar` from `req.body` alongside the existing fields
- [x] 4.2 Validate `weekDays`: must be an array of integers each in 0–6; reject with 400 if invalid
- [x] 4.3 Validate `reminderTime`: must match `/^\d{2}:\d{2}$/` with hours 00–23 and minutes 00–59, or be absent/null; reject with 400 if invalid
- [x] 4.4 Pass `weekDays`, `reminderTime`, `syncToCalendar` to `createHabit`
- [x] 4.5 In `routes/habits.ts` `PATCH /:id`, extract and validate the same three fields; add them to the `data` object passed to `updateHabit` when present

## 5. Manual Testing

- [ ] 5.1 Create a weekly habit with `weekDays: [5]` (Friday) and `syncToCalendar: true` while connected to Google Calendar → confirm the created event has `RRULE:FREQ=WEEKLY;BYDAY=FR`
- [x] 5.2 Create a daily habit with `reminderTime: "05:30"` → confirm field is stored and returned by GET
- [ ] 5.3 Create a habit with `syncToCalendar: false` while connected → confirm no Google Calendar event is created
- [ ] 5.4 Update a synced habit to `syncToCalendar: false` → confirm the calendar event is removed
- [x] 5.5 Confirm existing habits that had a CalendarSync row were backfilled with `syncToCalendar: true` after migration
