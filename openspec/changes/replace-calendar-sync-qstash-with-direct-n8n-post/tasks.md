## 1. Replace QStash publish with direct POST

- [x] 1.1 In `lib/calendar-sync.ts`, remove the `Client` import from `@upstash/qstash` and the `qstash` instance
- [x] 1.2 Rewrite `publishCalendarSync` to build a `fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': secret }, body: JSON.stringify(payload) })` call instead of `qstash.publishJSON(...)`
- [x] 1.3 Keep the existing fire-and-forget shape: do not `await` the fetch in a way that blocks the caller, and `.catch()` (or check for a non-ok response and log) without throwing
- [x] 1.4 Keep the existing early return + `console.error` when `CALENDAR_WEBHOOK_URL` or `WEBHOOK_SECRET` is missing, unchanged

## 2. Dependency cleanup

- [x] 2.1 Remove `@upstash/qstash` from `package.json` and run the package manager's install/lockfile update
- [x] 2.2 Remove `QSTASH_TOKEN` from `.env.example` (also removed `QSTASH_URL`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` — grep confirmed none of the four were referenced anywhere in code, only `QSTASH_TOKEN` was)
- [x] 2.3 Confirm no other file in the codebase still imports `@upstash/qstash` or reads `QSTASH_TOKEN` (grep before removing) — confirmed clean, `tsc --noEmit` also passes

## 3. Verification

- [ ] 3.1 Manually verify: with a Google Calendar link connected and `syncToCalendar: true`, creating a Task triggers a request that lands in the n8n workflow's execution log (check n8n directly, since QStash's dashboard is no longer in the path)
- [ ] 3.2 Manually verify: the n8n workflow still receives the same body shape and `X-Webhook-Secret` header value it did before (compare against a pre-change execution log entry if available)
- [ ] 3.3 Manually verify: temporarily pointing `CALENDAR_WEBHOOK_URL` at an unreachable address does not throw or fail the Task/Habit/Event mutation — the mutation still succeeds and an error is logged server-side
- [ ] 3.4 Manually verify: the inbound `POST /webhooks/n8n/calendar-sync` callback (n8n → al-quotes) still works unmodified, confirming this change didn't touch that leg
