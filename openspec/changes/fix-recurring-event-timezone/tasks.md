## 1. Workflow: consolidate date resolution

- [x] 1.1 In `n8n/Google Calendar Sync.json`, add a new Code node `Resolve Sync DateTime` wired between `Is Upsert?` (true branch) and `Has Google Event Id?`.
- [x] 1.2 Move today's per-entity-type date selection ternary (`task.startDate || task.dueDate`, `event.startAt`, `$now` for habits) into this node, producing `resolvedStart` and `resolvedEnd` on the item.
- [x] 1.3 Update `Insert Event` and `Patch Event` to read `$json.resolvedStart` / `$json.resolvedEnd` instead of re-deriving the ternary inline.

## 2. Workflow: offset-to-timezone resolution

- [x] 2.1 In the `Resolve Sync DateTime` node, parse the trailing UTC offset off `resolvedStart` (`Z`, `+00:00`, or `[+-]HH:MM`).
- [x] 2.2 Map whole-hour offsets to the corresponding `Etc/GMT` zone with sign inverted per POSIX convention (`+07:00` → `Etc/GMT-7`; verify against `-05:00` → `Etc/GMT+5` too, not just the positive case).
- [x] 2.3 Map zero offset (`Z` / `+00:00`) to `"Etc/UTC"`.
- [x] 2.4 Fall back to `"UTC"` for offsets with a non-zero minute component (e.g. `+05:30`), matching current behavior for that case.
- [x] 2.5 Attach the resolved value as `resolvedTimeZone` on the item.
- [x] 2.6 Update `Insert Event` and `Patch Event`'s `jsonBody` to use `$json.resolvedTimeZone` for both `start.timeZone` and `end.timeZone`, removing the hardcoded `'UTC'`.

## 3. Manual verification (no CI coverage for this workflow file)

- [ ] 3.1 Exercise `Resolve Sync DateTime` with representative inputs and confirm output: an Event with `startAt` carrying `+07:00`, a Task with only `dueDate` set, a Task with both `startDate` and `dueDate` set, a Habit (`$now` path), and an input with a `+05:30` offset.
- [ ] 3.2 Against a real connected test calendar, create a recurring weekly Event with `BYDAY=FR` and a local start time earlier than the test account's UTC offset (mirroring the original 06:00 WIB Friday report); confirm generated occurrences land on the correct local weekday in Google Calendar, not shifted by a day.
- [ ] 3.3 Confirm Google Calendar's API accepts an `Etc/GMT-N` value for `timeZone` without error (resolves the open question in design.md) — capture the result either way.
- [ ] 3.4 Edit (PATCH) an existing recurring synced Event after deploying the fix and confirm the corrected `timeZone` takes effect on future occurrences without duplicating or corrupting already-generated occurrences (resolves the second open question in design.md).

## 4. Deploy

- [ ] 4.1 Re-import the updated `Google Calendar Sync.json` into the n8n instance, replacing the active workflow.
- [ ] 4.2 Confirm the previous workflow version is retrievable from git history in case a rollback is needed.
