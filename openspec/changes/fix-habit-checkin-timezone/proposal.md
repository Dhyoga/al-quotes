## Why

Habit check-in periods are computed from `new Date()` on the server using UTC midnight as the day boundary. For users in UTC+7 (WIB), the "new day" starts at 07:00 local time — before that, the server still considers it the previous day, so a user who checked in the previous evening cannot check in again until after 07:00 the next morning. The client mirrors this UTC logic intentionally, so the check-in button also shows "already done" before 07:00 local time. The fix makes the client authoritative over what "today" means: it sends its local calendar date, and the server uses that date directly for the period.

## What Changes

- `POST /habits/:id/checkins` accepts an optional `date` field in the request body (format: `YYYY-MM-DD`). When provided, the server uses this date to compute `periodStart` instead of `new Date()`. When absent, it falls back to the current UTC date (existing behaviour, unchanged for callers that don't send a date).
- `lib/period.ts` `computePeriodStart` continues to accept an optional `Date` argument; a new overload (or the same function) also accepts a `YYYY-MM-DD` string and constructs midnight UTC from it directly.
- The remindeen frontend (`hooks/use-habits.ts`) sends `{ date: <local-YYYY-MM-DD> }` in the check-in POST body, using `new Date().toLocaleDateString('en-CA')` to get the user's local calendar date without any UTC conversion.
- The remindeen frontend (`lib/habit-streak.ts`) updates `isCheckedInForCurrentPeriod` to compare against the local calendar date rather than UTC midnight, so the check-in button reflects the user's local date from the moment they wake up.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `habit-tracking`: the check-in endpoint now accepts a client-supplied `date` string; period start is derived from this date rather than the server's UTC clock.

## Impact

- `routes/habits.ts` — extract `date` from `req.body` in `POST /:id/checkins`, pass to `checkInHabit`
- `lib/habits-repository.ts` — `checkInHabit` passes the date string through to `computePeriodStart`
- `lib/period.ts` — `computePeriodStart` accepts a `YYYY-MM-DD` string in addition to a `Date` object
- `remindeen/hooks/use-habits.ts` — `checkIn()` sends `{ date: today-local }` in body
- `remindeen/lib/habit-streak.ts` — `isCheckedInForCurrentPeriod` and `computePeriodStart` use local date
