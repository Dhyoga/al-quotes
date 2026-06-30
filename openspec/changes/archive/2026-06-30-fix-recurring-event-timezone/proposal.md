## Why

Recurring Tasks, Events, and Habits synced to Google Calendar land on the wrong day for any user whose local clock is ahead of UTC and whose recurrence time-of-day is earlier than that offset (e.g. a 06:00 WIB Friday run shows up as Saturday). The n8n sync workflow sends the correct offset-bearing `dateTime` but hardcodes `start.timeZone: 'UTC'`, so Google expands the `RRULE` in the UTC wall-clock frame instead of the user's actual frame, silently shifting every generated occurrence by a day while leaving the single anchor instance correct — making the bug invisible until a user counts the days in their actual calendar.

## What Changes

- Replace the hardcoded `timeZone: 'UTC'` in the n8n `Insert Event` and `Patch Event` nodes with a timezone value derived from the UTC offset already present in the incoming `dateTime` string (e.g. `+07:00` → `Etc/GMT-7`).
- Add a small offset-to-`Etc/GMT` mapping step in the n8n workflow (or equivalently in `al-quotes/lib/calendar-sync.ts` if computed server-side before publishing) so the derived zone has no DST ambiguity and is a valid IANA name Google's API will accept.
- No database schema changes and no changes to the `remindeen` client — the fix is fully contained to the sync pipeline between `al-quotes` and Google Calendar, and applies uniformly to Task, Event, and Habit payloads since they share the same Insert/Patch Event nodes.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `google-calendar-sync`: recurring Task/Event/Habit syncs must expand their `RRULE` in the same UTC-offset frame as the entity's actual local start time, not a hardcoded `UTC` frame, so generated occurrences land on the correct calendar day.

## Impact

- `al-quotes/n8n/Google Calendar Sync.json` — `Insert Event` and `Patch Event` node bodies (`start.timeZone` / `end.timeZone`).
- Possibly `al-quotes/lib/calendar-sync.ts` if the offset-to-zone mapping is computed before publishing rather than inside the n8n workflow itself (see design.md for the tradeoff).
- Affects every entity type that can recur via this workflow: Task, Event, Habit.
- No effect on non-recurring events (the anchor instant was already correct) and no effect on users whose UTC offset is 0 or negative, or whose recurrence time-of-day is later than their offset magnitude.
