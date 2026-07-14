## Context

`lib/calendar-sync.ts` publishes calendar sync jobs from two call sites (`syncUpsert`, `syncDelete`) through one shared function, `publishCalendarSync`. It currently wraps a QStash client (`@upstash/qstash`) whose `publishJSON` call takes `{ url, body, headers }` and hands off storage, retry/backoff, and dead-lettering to Upstash's managed queue before it reaches `CALENDAR_WEBHOOK_URL` (the n8n webhook).

That choice was deliberate at the time (see the archived `add-google-calendar-sync` design.md): al-quotes runs as a stateless Vercel serverless function, so if a direct call to n8n failed there was no local place to retry from. QStash filled that gap.

The ask now is to remove that indirection and call n8n directly.

## Goals / Non-Goals

**Goals:**
- Replace the QStash-mediated publish with a direct HTTP POST to `CALENDAR_WEBHOOK_URL`, preserving the exact request contract (JSON body, `X-Webhook-Secret` header) n8n already expects.
- Preserve the fire-and-forget contract: a delivery failure must never propagate into the Task/Habit/Event mutation that triggered it.
- Remove the `@upstash/qstash` dependency and `QSTASH_TOKEN` env var once nothing references them.

**Non-Goals:**
- Rebuilding retry/backoff/dead-lettering in-process. This change accepts a straight downgrade in delivery durability for this leg — no replacement mechanism is being built.
- Any change to the n8n workflow (`n8n/Google Calendar Sync.json`) — it receives the same request shape regardless of what sends it.
- Any change to the inbound `POST /webhooks/n8n/calendar-sync` callback leg, which was already a direct call.

## Decisions

**Direct `fetch` instead of a POST-with-retry helper.** Considered wrapping the new direct call in a small manual retry (e.g. 1–2 retries with backoff) to partially recover the durability being removed. Rejected for this change: the proposal's explicit intent is to simplify, and a hand-rolled retry loop reintroduces the complexity being removed while covering fewer failure modes than QStash did (no dead-letter visibility, no persistence across a cold start). If delivery reliability becomes a problem in practice, that's a separate change to weigh against reintroducing a queue rather than something to half-solve here.

**Fire-and-forget, not awaited on the response body.** `publishCalendarSync` keeps its current signature (`void`, no `await` by callers) and behavior: kick off the request, `.catch` logs the error, nothing propagates. This matches `lib/pusher.ts`'s existing pattern and requires no changes to `syncUpsert`/`syncDelete` call sites beyond what's inside `publishCalendarSync` itself.

**No payload or header changes.** The JSON body and `X-Webhook-Secret` header are constructed identically to what QStash was forwarding; only the transport changes. This keeps `n8n/Google Calendar Sync.json` and the inbound callback contract untouched, minimizing blast radius to a single function.

## Risks / Trade-offs

- **[Risk] Silent job loss on transient failure** — a network blip or momentary n8n outage now drops that one sync job instead of QStash retrying it. → **Mitigation**: none built into this change (accepted tradeoff, per Non-Goals). The next Task/Habit/Event mutation on the same entity will naturally re-trigger a fresh sync attempt, which self-heals most cases in practice since these entities are mutated repeatedly.
- **[Risk] No dead-letter visibility** — previously, a permanently-failing job would show up in QStash's dashboard; now it only appears as a `console.error` in Vercel logs. → **Mitigation**: none — consistent with this being an accepted, explicit simplification rather than an oversight.
- **[Risk] Slightly higher latency in the calling request** — QStash's `publishJSON` returns once the job is enqueued (fast); a direct `fetch` to n8n only resolves once n8n's webhook responds (or the fetch is fired without awaiting the response). → **Mitigation**: keep the `fetch` un-awaited by the caller (matching current fire-and-forget shape), so this doesn't add latency to the Task/Habit/Event mutation response.

## Migration Plan

1. Implement the direct `fetch` in `publishCalendarSync`, remove the QStash client instantiation and import.
2. Remove `@upstash/qstash` from `package.json`, remove `QSTASH_TOKEN` from `.env.example`.
3. Deploy — no coordinated deploy ordering needed with the n8n workflow or with `remindeen`, since the request contract to n8n is unchanged and no other system depends on QStash for this leg.
4. No rollback complexity beyond reverting the commit — no data migration, no schema change.

## Open Questions

None outstanding; the durability tradeoff is accepted per the proposal.
