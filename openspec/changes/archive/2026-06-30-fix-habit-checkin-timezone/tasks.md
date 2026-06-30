## 1. Backend: lib/period.ts

- [x] 1.1 Extend `computePeriodStart` to accept `date?: string | Date`: when `date` is a `YYYY-MM-DD` string, construct `new Date(\`${date}T00:00:00.000Z\`)` and pass it to `startOfDayUTC`; when it is a `Date` or `undefined`, use existing logic unchanged

## 2. Backend: routes/habits.ts

- [x] 2.1 In `POST /:id/checkins`, extract `date` from `req.body`
- [x] 2.2 Validate `date` when present: must match `/^\d{4}-\d{2}-\d{2}$/` and parse to a valid calendar date; respond 400 with a descriptive message if invalid
- [x] 2.3 Pass the validated `date` string (or `undefined`) to `checkInHabit`

## 3. Backend: lib/habits-repository.ts

- [x] 3.1 Update `checkInHabit` signature to accept an optional `date?: string` parameter in addition to the existing `date?: Date`
- [x] 3.2 Pass `date` to `computePeriodStart` so it flows through to `lib/period.ts`

## 4. Frontend: remindeen/hooks/use-habits.ts

- [x] 4.1 In the `checkIn` function, compute today's local date string: `const today = new Date().toLocaleDateString('en-CA')`
- [x] 4.2 Include `{ date: today }` in the JSON body of the `POST /habits/:id/checkins` request

## 5. Frontend: remindeen/lib/habit-streak.ts

- [x] 5.1 Update `isCheckedInForCurrentPeriod` to compute the current period as a date string (`new Date().toLocaleDateString('en-CA')` for daily) and compare against `periodStart.slice(0, 10)` from each stored check-in, instead of comparing UTC timestamps
- [x] 5.2 Update `computePeriodStart` (client copy) to return a local-date-based value for daily habits so the streak computation stays consistent with the new check-in logic; alternatively, update `computeCurrentStreak` to use date strings for the cursor comparison
- [x] 5.3 Ensure `computeCurrentStreak` still correctly walks backward through periods (daily = subtract 1 day from the local date string, weekly = subtract 7 days from the ISO week start)

## 6. Verification

- [x] 6.1 Test at a simulated time before 07:00 WIB (i.e. before 00:00 UTC next day): check in a daily habit → confirm a new check-in is created for the local date, not the previous UTC date
- [x] 6.2 Test that the check-in button shows "not yet done" immediately after local midnight, even before 07:00 WIB
- [x] 6.3 Test that checking in twice on the same local day does not create a duplicate row
- [x] 6.4 Test that MCP / direct API check-in without `date` still works (falls back to server UTC date)
- [x] 6.5 Test that an invalid `date` value (e.g. `"not-a-date"`) returns 400
