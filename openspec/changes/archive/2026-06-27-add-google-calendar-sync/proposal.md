## Why

Remindeen users want their Tasks and Habits reflected in their own Google Calendar, but today there is no calendar integration at all — Supabase's Google social login only grants `userinfo.email`/`userinfo.profile` scope. This change gives al-quotes a way to own a per-user Google Calendar connection and push Task/Habit changes out to an n8n workflow (hosted at `https://n8n.serdadu.dev/`) that performs the actual Google Calendar API calls on the user's behalf.

## What Changes

- Add a `GoogleCalendarLink` model: one row per user holding their Google `refreshToken` (plaintext for now — encryption at rest is a known, explicitly deferred follow-up), `calendarId` (default `"primary"`), `connectedAt`, `revokedAt`.
- Add a `CalendarSync` model: maps `(entityType, entityId)` — `"task"` or `"habit"` — to the `googleEventId` n8n created for it, so create/update/delete against Google Calendar are idempotent instead of insert-only.
- Add `POST /auth/google-calendar` (JWT-protected) to receive a Google refresh token obtained by a paired `remindeen` change (a separate "Connect Google Calendar" consent flow requesting `https://www.googleapis.com/auth/calendar.events` + offline access) and upsert the user's `GoogleCalendarLink`.
- Add `GET /auth/google-calendar` (JWT-protected) so the extension can check whether the calling user currently has a calendar linked, without storing that state locally.
- Add `DELETE /auth/google-calendar` (JWT-protected) to disconnect/revoke a user's calendar link.
- On Task/Habit create, update, and delete (not habit check-ins), if the calling user has a `GoogleCalendarLink`, refresh their Google access token server-side and publish a sync job — via Upstash QStash — to an n8n webhook (`CALENDAR_WEBHOOK_URL`), carrying a fresh `googleAccessToken` and the existing `googleEventId` (if any) so n8n knows whether to create or update the Calendar event. This is fire-and-forget: it must never fail or block the underlying mutation.
- Habits map to a single recurring Calendar event (RRULE, `FREQ=DAILY`/`FREQ=WEEKLY` per `Habit.frequency`) created once on habit create and updated/deleted on habit update/delete. Check-ins never trigger calendar sync.
- Add `POST /webhooks/n8n/calendar-sync`, called directly by n8n (not via QStash) after it creates/updates/deletes the real Calendar event, to report back the `googleEventId` so `CalendarSync` can be upserted or cleared.
- Add a new authentication strategy — `requireWebhookSecret` — distinct from the existing JWT and API-key strategies, since the caller here is a trusted service (n8n) acting on its own behalf, not a user. Both the outbound (al-quotes → n8n) and inbound (n8n → al-quotes) legs are authenticated with the same shared secret, sent as a header and compared in constant time.
- New dependency: `@upstash/qstash`.

**Out of scope for this change** (explicitly deferred): building the actual n8n workflow (manual, in n8n's UI, against the payload contract this change documents in `design.md`); encrypting `GoogleCalendarLink.refreshToken` at rest; retry/outage handling beyond what QStash provides out of the box for the al-quotes → n8n leg (the n8n → al-quotes callback leg is a single direct call with no retry).

## Capabilities

### New Capabilities
- `google-calendar-sync`: per-user Google Calendar connection lifecycle, the Task/Habit-to-Calendar-event sync contract (push via QStash to n8n, callback from n8n), and the shared-secret authentication strategy for that service-to-service traffic.

### Modified Capabilities
(none — `kanban-tasks` and `habit-tracking` REST behavior is unchanged; calendar sync is an additive side effect of existing mutations, not a change to their contracts. `user-auth`'s existing requirements about JWT/API-key usage on `/tasks` and `/habits` are untouched; the new webhook secret strategy applies only to the new `/webhooks/n8n/calendar-sync` route.)

## Impact

- `al-quotes/prisma/schema.prisma`: new `GoogleCalendarLink` and `CalendarSync` models + migration.
- `al-quotes/lib/tasks-repository.ts`, `lib/habits-repository.ts`: after the existing `publishTaskEvent`/`publishHabitEvent` calls, also trigger calendar sync when the user has a link. `deleteTask`/`deleteHabit` must snapshot any existing `CalendarSync.googleEventId` *before* deleting the row (today they publish `{ id }` *after* delete) so the deletion payload can carry it.
- New file `lib/google-calendar.ts`: refreshes a user's Google access token from their stored refresh token via Google's token endpoint.
- New file `lib/calendar-sync.ts` (or similar): builds the sync payload and calls QStash's `publishJSON` targeting `CALENDAR_WEBHOOK_URL`.
- `al-quotes/lib/auth.ts`: new `requireWebhookSecret` middleware (constant-time comparison against `WEBHOOK_SECRET`).
- New routes: `routes/google-calendar.ts` (mounted at `/auth/google-calendar`), `routes/calendar-webhook.ts` (mounted at `/webhooks/n8n/calendar-sync`).
- `al-quotes/server.ts`: mount both new routers.
- New env vars: `WEBHOOK_SECRET`, `CALENDAR_WEBHOOK_URL` (already added by the user), `QSTASH_TOKEN` (already added by the user).
- New dependency: `@upstash/qstash`.
- Paired with a `remindeen` change (`connect-google-calendar`) that adds the "Connect Google Calendar" UI action, submits the refresh token to `POST /auth/google-calendar`, and reads connection status from `GET /auth/google-calendar` for its connect/disconnect UI state — mirrors how `add-realtime-task-habit-events` (al-quotes) was paired with `add-realtime-kanban-habit-sync` (remindeen). This change has no user-visible effect until the paired change ships and the n8n workflow is built.
