## Context

`al-quotes/n8n/Google Calendar Sync.json` has two nodes — `Insert Event` and `Patch Event` — that independently re-derive the same "which date field for this entity type" ternary (`task.startDate || task.dueDate`, `event.startAt`, or `$now` for habits) inside their `jsonBody` expressions, and both hardcode `timeZone: 'UTC'`. Google Calendar expands an event's `RRULE` (`BYDAY` in particular) in the frame given by `timeZone`, not in the offset embedded in `dateTime`. Because nothing in the system declares the entity's real offset, every recurring sync is silently expanded in UTC and re-displayed in the user's local zone, shifting occurrences by a day whenever the local recurrence hour is smaller than the UTC offset (see proposal.md for the worked example: 06:00 WIB Friday → Saturday).

There is no IANA timezone tracked anywhere in `al-quotes` (confirmed: no `timeZone`/`Asia/` references in `lib/`) or in the `remindeen` client. The only timezone signal available anywhere in the pipeline is the numeric UTC offset already embedded in the `dateTime` string itself (e.g. `+07:00`), produced by `remindeen`'s `buildIsoWithOffset`.

## Goals / Non-Goals

**Goals:**
- Make recurring Task/Event/Habit syncs expand `RRULE` in the entity's actual UTC-offset frame instead of a hardcoded UTC frame.
- Fix this once, in a single place, for all three entity types rather than duplicating logic across the `Insert Event` and `Patch Event` nodes.
- Avoid any database migration or change to the `remindeen` client / API contract.

**Non-Goals:**
- Correctly handling fractional-hour UTC offsets (e.g. India +05:30, Nepal +05:45). `Etc/GMT` zones are whole-hour only; this fix targets the whole-hour offsets actually in use today (WIB +7, WITA +8, WIT +9) and leaves fractional offsets as a known gap (see Risks).
- Tracking a user's real IANA timezone (DST-aware) end-to-end. That's the "IANA timezone end-to-end" alternative considered and explicitly deferred — bigger surface (schema + client + API), not needed while the user base is fixed-offset zones.
- Backfilling or correcting Google Calendar events that were already created with the wrong recurrence — out of scope for this change; existing bad recurring events would need a manual delete/recreate (separately, not part of this proposal).

## Decisions

### Resolve date + timezone once, before the Insert/Patch branch
Add a single n8n "Code" node — `Resolve Sync DateTime` — wired between `Is Upsert?` (true branch) and `Has Google Event Id?`. It computes the entity-type date selection (today's ternary, moved here verbatim) once, derives the offset, and attaches `resolvedStart`, `resolvedEnd`, `resolvedTimeZone` onto the item. `Insert Event` and `Patch Event` then both just read `$json.resolvedStart` / `$json.resolvedEnd` / `$json.resolvedTimeZone` instead of re-deriving anything.

Alternative considered: do the offset parsing independently inside each of `Insert Event` and `Patch Event`'s own `jsonBody` expression. Rejected — it would keep the existing duplication between the two nodes and double the places a future change to date-field selection has to be made consistently.

Alternative considered: compute the timezone server-side in `al-quotes/lib/calendar-sync.ts` before publishing to QStash. Rejected for this change — `calendar-sync.ts` forwards `entityPayload` opaquely and doesn't currently know which field within it (`startDate` vs `dueDate` vs `startAt`) is the effective start; replicating that per-entity-type selection there would duplicate it in a second place (TypeScript *and* n8n) rather than collapsing it to one. Revisit this if the "IANA timezone end-to-end" alternative is ever picked up, since at that point the timezone has to be known earlier in the pipeline (at write time) rather than derived late.

### Offset → `Etc/GMT` mapping
Parse the trailing offset off the resolved `dateTime` string (`Z` or `[+-]HH:MM`). Map whole-hour offsets to the corresponding `Etc/GMT` IANA zone, e.g. `+07:00` → `Etc/GMT-7`, `Z`/`+00:00` → `Etc/UTC`.

**Sign is inverted by POSIX convention**: `Etc/GMT-7` means UTC+7, not UTC-7. This is the single easiest place to silently reintroduce the same class of bug, so the mapping function gets an explicit comment/test pinning `+07:00 → Etc/GMT-7` (not `Etc/GMT+7`).

Offsets with a non-zero minute component (e.g. `+05:30`) have no valid `Etc/GMT` equivalent; the code node falls back to `'UTC'` for those (today's behavior — no regression, just no fix for that case either, per Non-Goals).

## Risks / Trade-offs

- **[Risk] Fractional-hour offsets silently keep today's bug** → Mitigation: explicitly out of scope (Non-Goals); falls back to current `'UTC'` behavior rather than producing an invalid `timeZone` value that would fail the whole API call.
- **[Risk] Unverified assumption that Google Calendar's API accepts `Etc/GMT-N` as a valid `timeZone` value** (it's a real IANA identifier, but Google's UI doesn't surface it, so the API path is untested in this codebase) → Mitigation: verify with a manual `Insert Event` test against a real `+07:00` payload before merging; call out as an Open Question below.
- **[Risk] n8n workflow JSON has no automated test coverage** (unlike `al-quotes`'s TypeScript, which may have unit tests) → Mitigation: the new `Resolve Sync DateTime` Code node is a single, isolable function — manually exercise it with representative inputs (task with `startDate`, event with `startAt`, habit's `$now` path, an offset with non-zero minutes) before deploying; consider pinning sample inputs/outputs in `tasks.md` as a manual test checklist since there's no CI for this file.
- **[Trade-off] Fixed-offset zones don't follow DST** → acceptable: none of WIB/WITA/WIT observe DST, and this is explicitly scoped to whole-hour, non-DST offsets (Non-Goals).

## Migration Plan

- No database migration.
- Deploy by re-importing the updated `Google Calendar Sync.json` into the n8n instance (replacing the existing workflow); `al-quotes` and `remindeen` are both unaffected and need no deploy coordination.
- Rollback: re-import the previous version of `Google Calendar Sync.json` from git history — no data needs to be reverted since this only changes how new sync jobs are processed going forward, not stored state.
- Already-wrong recurring events in users' Google Calendars are not auto-corrected by this change; a synced entity will self-correct only the next time it's upserted (edited) after the fix is deployed, since `Patch Event` will then send the corrected `timeZone` for that event's existing recurrence series.

## Open Questions

- Does Google Calendar's `events.insert`/`events.patch` actually accept `Etc/GMT-N` identifiers for `timeZone` without error? Needs a manual smoke test against a real connected calendar before considering this done.
- Should `Patch Event` updates correct the `timeZone` of an *existing* recurring series mid-stream, or could that cause Google to reinterpret/duplicate already-generated occurrences? Worth a manual check on one real recurring event during testing, since the proposal currently assumes a patch silently fixes it going forward.
