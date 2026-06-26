## 1. Data model

- [x] 1.1 Add `GoogleCalendarLink` model (`userId` unique, `refreshToken`, `calendarId` default `"primary"`, `connectedAt`, `revokedAt`) to `prisma/schema.prisma`
- [x] 1.2 Add `CalendarEntityType` enum (`task`, `habit`) and `CalendarSync` model (`entityType`, `entityId`, `googleEventId`, unique on `(entityType, entityId)`) to `prisma/schema.prisma`
- [x] 1.3 Run `prisma migrate dev` and check in the generated migration

## 2. Dependencies & config

- [x] 2.1 Add `@upstash/qstash` to `package.json`
- [x] 2.2 Add `WEBHOOK_SECRET`, `CALENDAR_WEBHOOK_URL`, `QSTASH_TOKEN` to `.env.example` with comments explaining each

## 3. Auth: shared-secret strategy

- [x] 3.1 Add `requireWebhookSecret` middleware to `lib/auth.ts` (constant-time comparison via `crypto.timingSafeEqual`, length-checked first)
- [x] 3.2 Export `requireWebhookSecret` alongside `requireJwt`/`requireApiKey`

## 4. Google token handling

- [x] 4.1 Add `lib/google-calendar.ts` with a function that exchanges a stored refresh token for a fresh Google access token via Google's token endpoint
- [x] 4.2 Handle the case where Google rejects the refresh token (revoked access) — log and skip publishing the sync job rather than throwing

## 5. Calendar link endpoints

- [x] 5.1 Add `routes/google-calendar.ts`: `POST /auth/google-calendar` (JWT-protected, upserts `GoogleCalendarLink` for `req.userId`)
- [x] 5.2 Add `GET /auth/google-calendar` to the same router (JWT-protected, returns `{ connected: boolean, calendarId?: string }` for `req.userId`)
- [x] 5.3 Add `DELETE /auth/google-calendar` to the same router (JWT-protected, removes/revokes the link for `req.userId`)
- [x] 5.4 Mount the router in `server.ts` at `/auth/google-calendar`

## 6. Sync publishing

- [x] 6.1 Add `lib/calendar-sync.ts`: builds the outbound payload (per the contracts in `design.md`) and calls QStash's `publishJSON` against `CALENDAR_WEBHOOK_URL` with the `X-Webhook-Secret` header
- [x] 6.2 Add a habit-frequency-to-RRULE mapping (`daily` → `RRULE:FREQ=DAILY`, `weekly` → `RRULE:FREQ=WEEKLY`)
- [x] 6.3 In `lib/tasks-repository.ts`: after `createTask`/`updateTask`, look up the user's `GoogleCalendarLink` and any existing `CalendarSync` row, refresh the Google access token, and publish a `task.upserted` job if linked — fire-and-forget, errors logged only
- [x] 6.4 In `lib/tasks-repository.ts`: in `deleteTask`, read the existing `CalendarSync` row *before* deleting the Task row; if found, publish a `task.deleted` job carrying its `googleEventId` after the delete completes
- [x] 6.5 Mirror 6.3 and 6.4 in `lib/habits-repository.ts` for `createHabit`/`updateHabit`/`deleteHabit`, using `habit.upserted`/`habit.deleted` and the RRULE mapping
- [x] 6.6 Confirm `checkInHabit` is untouched — no sync job on check-in

## 7. Callback endpoint

- [x] 7.1 Add `routes/calendar-webhook.ts`: `POST /webhooks/n8n/calendar-sync`, protected by `requireWebhookSecret`
- [x] 7.2 Handle `{ action: "linked", entityType, entityId, googleEventId }` → `prisma.calendarSync.upsert`
- [x] 7.3 Handle `{ action: "unlinked", entityType, entityId }` → `prisma.calendarSync.deleteMany` (not `delete`, so a redundant callback isn't an error)
- [x] 7.4 Mount the router in `server.ts` at `/webhooks/n8n/calendar-sync`

## 8. Verification

- [x] 8.1 Manually verify: linking a calendar, creating a task, confirming a sync job lands in QStash's dashboard with the expected payload
- [x] 8.2 Manually verify: a user with no calendar link triggers no sync job on task/habit mutation
- [x] 8.3 Manually verify: `POST /webhooks/n8n/calendar-sync` rejects requests without the correct `X-Webhook-Secret`
- [x] 8.4 Manually verify: deleting a previously-synced task publishes a `task.deleted` job with a non-null `googleEventId`
- [x] 8.5 Manually verify: checking in a habit does not publish any sync job
