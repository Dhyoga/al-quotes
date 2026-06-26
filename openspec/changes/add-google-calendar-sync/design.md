## Context

al-quotes already has two trusted-caller patterns: a Supabase JWT proving "this request acts as user X" (`requireJwt`), and a long-lived API key with the same meaning for headless automation (`requireApiKey`, from `add-automation-api-keys`). Neither fits a third caller this change introduces: n8n, a service al-quotes itself invokes and which calls back — it isn't acting *as* any user, it's acting as itself, reporting the result of work al-quotes asked it to do.

al-quotes is deployed as a single Vercel serverless function (`vercel.json`, `@vercel/node`) — there is no long-running process. That rules out a self-hosted broker/worker (e.g. BullMQ+Redis) for retrying failed deliveries; Upstash QStash (already provisioned, `QSTASH_TOKEN` set) fills that role as a managed, HTTP-based queue that does its own retry/backoff/DLQ and fits a stateless deployment.

Supabase's own session refresh only refreshes the Supabase JWT — it does not refresh Google's `provider_token`. Google access tokens are short-lived (~1 hour) and Supabase does not persist `provider_refresh_token` beyond the initial OAuth exchange. So al-quotes must independently store the Google refresh token and mint fresh access tokens on demand; nothing upstream does this for it.

Existing Task/Habit mutation flow already centralizes writes through `lib/tasks-repository.ts` / `lib/habits-repository.ts` (from `add-realtime-task-habit-events`), which already trigger a Pusher event per mutation. Calendar sync hooks into the same call sites.

## Goals / Non-Goals

**Goals:**
- Define the exact JSON contract for both directions of the al-quotes ↔ n8n integration, stable enough that the n8n workflow (built separately, manually) can be implemented against it without al-quotes changing again.
- Define `requireWebhookSecret` as a first-class third auth strategy.
- Make Task/Habit → Calendar event mapping idempotent via `CalendarSync`, including delete.

**Non-Goals:**
- Building the n8n workflow itself.
- Encrypting `GoogleCalendarLink.refreshToken` at rest (plaintext column for now).
- Guaranteeing delivery of the n8n → al-quotes callback (single direct call, no retry — if it fails, the `CalendarSync` row simply doesn't get updated, and the next mutation on that entity will look like a fresh create instead of an update on the n8n side; this is a known, accepted gap).
- Handling Google refresh-token revocation proactively (no background check that a stored token still works — failures surface lazily, the next time a sync attempt tries to refresh it).

## Decisions

### Where Google token custody lives: al-quotes, not n8n

n8n's built-in Google Calendar / OAuth2 credential model is one static credential per credential record — it isn't designed to swap Google accounts per execution, which a multi-user product needs. Instead, al-quotes stores each user's Google refresh token, refreshes it server-side right before publishing a sync job, and hands n8n a ready-to-use `googleAccessToken` in the payload. n8n's workflow uses a generic **HTTP Request** node with `Authorization: Bearer {{ $json.googleAccessToken }}` — not the dedicated Google Calendar node — so the credential is per-execution data, not a stored credential.

### Transport: QStash for al-quotes → n8n, direct HTTP for n8n → al-quotes

The outbound leg needs durability (al-quotes is stateless; if it can't reach n8n synchronously, there's no local place to retry from). QStash's `publishJSON` takes over storage + retry + backoff + dead-lettering for that leg, reachable via one HTTP call from al-quotes.

The inbound callback leg is a single, synchronous write-back of sync metadata triggered by an n8n workflow that's already mid-execution — there's no equivalent durability need, and round-tripping it through QStash would add latency and complexity for no benefit. It's a plain `fetch`/HTTP POST from n8n straight to al-quotes.

### Auth: one shared secret, both directions, header-based

A single `WEBHOOK_SECRET` value, sent as `X-Webhook-Secret` on both legs:
- Outbound (al-quotes → n8n via QStash): set via QStash's `headers` option on `publishJSON`, forwarded verbatim to n8n. Verified on the n8n side using the Webhook node's built-in **Header Auth** credential — no custom code in n8n.
- Inbound (n8n → al-quotes): verified by the new `requireWebhookSecret` middleware.

One secret instead of two was chosen for operational simplicity (one env var, rotated together) given the low blast radius of either leg being compromised — at worst it lets someone impersonate al-quotes to this one n8n workflow, or write spurious `googleEventId` values for a task they don't otherwise have access to via any other route. Two secrets remains a cheap future hardening if needed.

`requireWebhookSecret` (in `lib/auth.ts`, parallel to `requireJwt`/`requireApiKey`):
```
const requireWebhookSecret = (req, res, next) => {
  const provided = req.headers['x-webhook-secret'];
  const expected = process.env.WEBHOOK_SECRET;
  if (
    typeof provided !== 'string' ||
    !expected ||
    provided.length !== expected.length ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  ) {
    return res.status(401).json({ message: 'Invalid webhook secret' });
  }
  next();
};
```
Length is checked before `timingSafeEqual` because that function throws (rather than returning false) on mismatched buffer lengths.

### Data model: separate `CalendarSync` table, not columns on Task/Habit

Keeps `Task`/`Habit` ignorant of Google entirely — calendar sync is an optional, bolt-on concern, not core to what a task or habit is. Also lets the same shape cover both entity types via `entityType` + `entityId` instead of two parallel nullable columns.

```prisma
model GoogleCalendarLink {
  id           Int       @id @default(autoincrement())
  userId       String    @unique
  refreshToken String
  calendarId   String    @default("primary")
  connectedAt  DateTime  @default(now())
  revokedAt    DateTime?
}

enum CalendarEntityType {
  task
  habit
}

model CalendarSync {
  id            Int                @id @default(autoincrement())
  entityType    CalendarEntityType
  entityId      Int
  googleEventId String
  updatedAt     DateTime           @updatedAt

  @@unique([entityType, entityId])
}
```

### Payload contract: al-quotes → n8n (via QStash)

`POST` (QStash delivers this as the body+headers given to `publishJSON`) to `CALENDAR_WEBHOOK_URL`:

Headers:
```
Content-Type: application/json
X-Webhook-Secret: <WEBHOOK_SECRET>
```

Body — task create/update:
```json
{
  "event": "task.upserted",
  "entityType": "task",
  "entityId": 42,
  "googleEventId": null,
  "googleAccessToken": "ya29....",
  "calendarId": "primary",
  "task": {
    "title": "Finish report",
    "description": "Quarterly numbers",
    "startDate": "2026-06-26T02:00:00.000Z",
    "dueDate": "2026-06-27T10:00:00.000Z",
    "priority": "High",
    "status": "TODO"
  }
}
```
`googleEventId: null` means create; a non-null value means update the existing event.

Body — task delete:
```json
{
  "event": "task.deleted",
  "entityType": "task",
  "entityId": 42,
  "googleEventId": "abc123googleeventid",
  "googleAccessToken": "ya29....",
  "calendarId": "primary"
}
```
If `googleEventId` is `null` here, the task had never been synced (no `CalendarSync` row existed) — al-quotes simply does not publish a delete event in that case, there's nothing for n8n to delete.

Body — habit create/update:
```json
{
  "event": "habit.upserted",
  "entityType": "habit",
  "entityId": 7,
  "googleEventId": null,
  "googleAccessToken": "ya29....",
  "calendarId": "primary",
  "habit": {
    "title": "Read Quran",
    "description": "10 minutes after Fajr",
    "priority": "Medium",
    "frequency": "daily",
    "rrule": "RRULE:FREQ=DAILY"
  }
}
```
`frequency: "weekly"` maps to `"rrule": "RRULE:FREQ=WEEKLY"`. al-quotes computes the `rrule` string so n8n doesn't need frequency-mapping logic.

Body — habit delete: same shape as task delete, with `"event": "habit.deleted"`, `"entityType": "habit"`.

### Payload contract: n8n → al-quotes callback

`POST /webhooks/n8n/calendar-sync`

Headers:
```
Content-Type: application/json
X-Webhook-Secret: <WEBHOOK_SECRET>
```

Body — after create or update (upsert the sync row):
```json
{
  "action": "linked",
  "entityType": "task",
  "entityId": 42,
  "googleEventId": "abc123googleeventid"
}
```

Body — after delete (clear the sync row):
```json
{
  "action": "unlinked",
  "entityType": "task",
  "entityId": 42
}
```

Handler behavior: `linked` → `prisma.calendarSync.upsert` keyed on `(entityType, entityId)`. `unlinked` → `prisma.calendarSync.deleteMany` on the same key (`deleteMany` rather than `delete` so a redundant/duplicate callback isn't an error).

### Delete ordering fix in the repositories

`deleteTask`/`deleteHabit` currently delete the row, then publish `{ id }`. For calendar sync to know which Google event to remove, the existing `CalendarSync` row must be read *before* the Task/Habit row is deleted (it doesn't need to be deleted in the same transaction — `CalendarSync` rows aren't foreign-keyed to `Task`/`Habit`, so they're cleaned up via the `unlinked` callback, not cascade).

### Fire-and-forget contract for the publish call

Calendar sync publishing must never throw into the calling mutation. Same pattern as `lib/pusher.ts`'s `publish()`: call QStash, `.catch(error => console.error(...))`, don't `await` it on the response path. A user with no `GoogleCalendarLink` short-circuits before any of this runs — looking up the link is one indexed query, not a network call, so it doesn't need the same fire-and-forget treatment.

## Risks / Trade-offs

- **Plaintext refresh tokens in Postgres** → Accepted for now; anyone with DB access can use a stored token to act on a user's Calendar within the `calendar.events` scope. Mitigation deferred to a follow-up (app-level encryption, e.g. via a KMS-backed key).
- **Callback leg has no retry** → If n8n's callback to al-quotes fails (network blip, al-quotes briefly down), the `CalendarSync` mapping silently fails to update. The next mutation will look like a fresh create to n8n (no `googleEventId` on file), producing a duplicate Calendar event rather than updating the old one. Mitigation: none in this change; acceptable given low expected failure rate for a single direct call; could add a retry or reconciliation job later if it proves to be a real problem.
- **One shared secret for both directions** → A leak compromises both legs at once. Mitigation: easy to split into two secrets later since both are just env-var comparisons; not worth the operational overhead now.
- **`googleAccessToken` travels through QStash and n8n** → A ~1-hour-lived token scoped to `calendar.events` only, visible in QStash's dashboard/logs and n8n's execution history. Mitigation: scope is already minimized to `calendar.events`; token expires quickly; treat n8n and QStash as trusted infrastructure (same trust level as treating Vercel's own logs as trusted).
- **n8n must be told the right number of timezone-aware fields** → `startDate`/`dueDate` are sent as UTC ISO strings; n8n/Google Calendar API needs a timezone for correct display. This is deferred to whoever builds the n8n workflow — worth flagging as an open question below rather than solved here, since al-quotes doesn't currently store a user timezone anywhere.

## Migration Plan

1. Add `GoogleCalendarLink` and `CalendarSync` Prisma models, run migration.
2. Add `requireWebhookSecret` to `lib/auth.ts`.
3. Add `lib/google-calendar.ts` (token refresh) and `lib/calendar-sync.ts` (QStash publish + payload building).
4. Wire the publish calls into `tasks-repository.ts` / `habits-repository.ts`, fixing the delete-then-publish ordering to snapshot-then-delete-then-publish.
5. Add `routes/google-calendar.ts` and `routes/calendar-webhook.ts`, mount both in `server.ts`.
6. Deploy. This change is inert for every user until: (a) the paired remindeen change ships "Connect Google Calendar", and (b) the n8n workflow is built against the contracts above. No rollback complexity beyond a normal revert — no existing behavior changes.

## Open Questions

- Where does a user's timezone come from for the Calendar event (`startDate`/`dueDate`/RRULE)? Not resolved in this change — likely needs a `timezone` field somewhere (user settings?) before the n8n workflow can produce correctly-displayed events. Flagging for whoever builds the n8n side.
- Should `CalendarSync` rows for a deleted `GoogleCalendarLink` (user disconnects calendar) be proactively cleaned up, or left as orphaned rows that just never get referenced again? Leaning toward "leave them" for now — cheap to revisit.
