## Why

Calendar sync currently publishes outbound Task/Habit/Event sync jobs through Upstash QStash before they reach the n8n webhook, adding an external managed-queue dependency (and its retry/backoff/DLQ machinery) for what is, in practice, a single internal service-to-service call. We want to simplify the pipeline by posting directly from al-quotes to the n8n webhook, accepting the loss of QStash's built-in retry durability in exchange for one fewer moving part and one fewer paid dependency.

## What Changes

- **BREAKING** (internal architecture, not API-visible): `publishCalendarSync` in `lib/calendar-sync.ts` no longer calls `qstash.publishJSON(...)`. It instead issues a direct `fetch(CALENDAR_WEBHOOK_URL, { method: 'POST', headers: { 'X-Webhook-Secret': ... }, body: JSON.stringify(payload) })`.
- The request body, headers, and secret contract are unchanged — n8n's webhook trigger receives an identical payload either way. `al-quotes/n8n/Google Calendar Sync.json` requires no changes.
- The fire-and-forget error-handling pattern is preserved exactly: a failed POST is caught and `console.error`'d, never thrown into the calling Task/Habit/Event mutation (same pattern already used in `lib/pusher.ts`).
- This intentionally drops QStash's retry/backoff/dead-letter durability for the al-quotes → n8n leg. A single transient failure (e.g. n8n briefly unreachable) now means that one sync job is silently dropped rather than retried. Accepted tradeoff — see design.md.
- Remove the now-unused `@upstash/qstash` dependency from `package.json` and the `QSTASH_TOKEN` env var from `.env.example`. `CALENDAR_WEBHOOK_URL` and `WEBHOOK_SECRET` are unchanged and still required.
- The inbound `POST /webhooks/n8n/calendar-sync` callback leg (n8n → al-quotes) is unaffected — it was already a direct HTTP call, not routed through QStash.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `google-calendar-sync`: the "Sync jobs are delivered through a durable queue" requirement changes from QStash-mediated delivery to a direct HTTP POST, dropping the automatic-retry guarantee.

## Impact

- `al-quotes/lib/calendar-sync.ts` — `publishCalendarSync` implementation (QStash client call → direct `fetch`).
- `al-quotes/package.json` — remove `@upstash/qstash` dependency.
- `al-quotes/.env.example` — remove `QSTASH_TOKEN`.
- No changes to `al-quotes/n8n/Google Calendar Sync.json`, the inbound callback route, the Task/Habit/Event mutation call sites, or `remindeen`.
- Operational: sync job failures are no longer retried automatically; they surface only in server logs until the next mutation on that entity re-triggers a sync attempt.
