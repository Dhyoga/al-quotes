## Context

`lib/period.ts` computes `periodStart` by zeroing UTC hours on `new Date()`. Both the server and the remindeen frontend mirror this logic deliberately (the frontend comment says "so the client's idea of 'current period' never drifts from the server's"). The result is that the "day" boundary is UTC midnight — 07:00 WIB — not local midnight. Users in UTC+7 cannot check in after midnight local time until 07:00.

The fix is minimal: make the client the authority on what date it is, send that date as a plain string, and have the server use it to construct the period key. No timezone database, no user timezone preference, no UTC conversion logic on either side.

## Goals / Non-Goals

**Goals:**
- Allow check-in immediately after local midnight regardless of timezone offset
- Keep client and server in agreement on what "today" is by making the client send the date
- Minimal surface area: touch only `routes/habits.ts`, `lib/habits-repository.ts`, `lib/period.ts`, and the two remindeen files

**Non-Goals:**
- Storing user timezone preferences
- Fixing the weekly `startOfIsoWeekUTC` logic (week boundary is less user-visible; a separate fix if needed)
- Changing existing `periodStart` values in the database (existing rows are unaffected)
- Any other endpoint beyond `POST /habits/:id/checkins`

## Decisions

### Client sends `YYYY-MM-DD`, server constructs midnight UTC from it

The client calls `new Date().toLocaleDateString('en-CA')` which returns `"2026-06-30"` in the user's local timezone regardless of UTC offset. The server receives this string and constructs `new Date("2026-06-30T00:00:00.000Z")` — midnight UTC for that calendar date. This is the same value the server would have stored if it had computed it from UTC at midnight; the only difference is that the client controls which calendar date is used.

This preserves the existing DB storage format (all `periodStart` values are UTC midnight timestamps) without a migration.

Alternative considered: send timezone offset (e.g. `"+07:00"`) and have the server convert. Rejected — adds conversion logic on the server that the client can avoid by just reporting the local date string directly.

Alternative considered: use local midnight instead of UTC midnight on both sides (i.e. `setHours(0,0,0,0)` not `setUTCHours`). Rejected — local midnight on the server (Vercel/UTC) is the same as UTC midnight, so this only fixes the client side and creates a new client/server mismatch.

### `date` is optional, falls back to server UTC date

Existing callers (MCP, direct API) that don't send `date` continue to use `new Date()` on the server. This is correct for them: if an MCP tool checks in a habit without specifying a date, the server's UTC date is a reasonable default (MCP callers are typically used programmatically, not by timezone-sensitive users in bed at 6am).

### `computePeriodStart` accepts `string | Date | undefined`

The existing signature is `computePeriodStart(frequency, date?)`. Extending it to also accept a `string` in `YYYY-MM-DD` format means no new function is needed and all existing call sites continue to work unchanged.

### Frontend: `toLocaleDateString('en-CA')` for `YYYY-MM-DD`

`'en-CA'` locale formats dates as `YYYY-MM-DD` natively in all modern browsers. This avoids a manual format string and is more reliable than `toISOString().slice(0,10)` which always returns UTC date.

### Frontend streak: compare date strings, not timestamps

`isCheckedInForCurrentPeriod` currently computes a UTC midnight timestamp and compares it to stored `periodStart` timestamps. After the fix, it compares `new Date().toLocaleDateString('en-CA')` against `periodStart.slice(0, 10)` (the date portion of the ISO string from the server). This removes the UTC arithmetic entirely on the client side.

## Risks / Trade-offs

- **Client clock can be wrong** → A client with a wrong local clock will send the wrong date. This is acceptable: the previous server-clock approach had the same problem shifted by timezone offset, and a deliberately wrong client clock is out of scope.
- **Existing check-ins stored as UTC midnight are still correct** → `"2026-06-29T00:00:00.000Z".slice(0,10)` → `"2026-06-29"`, which matches the date string the client would have sent. No data migration needed.
