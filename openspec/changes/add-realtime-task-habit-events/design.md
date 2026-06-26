## Context

`al-quotes` is an Express app deployed on Vercel (serverless, stateless functions), backed by a Postgres database (hosted on the same Supabase project that also provides the extension's auth) via Prisma. It serves Task/Habit data two ways: REST (`/tasks`, `/habits`, JWT-authenticated) and MCP (`/mcp`, API-key-authenticated, added by `add-mcp-server`). Today, mutations are implemented independently in `routes/tasks.ts`, `routes/habits.ts`, and `lib/mcp-tools.ts`, each calling `prisma.task.*` / `prisma.habit.*` directly.

The user has already provisioned a Pusher Channels app and added its credentials: `app_id`/`key`/`secret`/`cluster` in `al-quotes/.env` (server-side, correct), and `key`/`cluster` only in `remindeen/.env.local` (client-side; `secret` was removed from there during this exploration since it must never ship in a browser extension bundle).

Supabase Realtime (Broadcast-from-database or Postgres Changes) was considered and discussed as an alternative, since the Postgres instance backing this app is itself a Supabase project — but Pusher Channels was the user's explicit, final choice.

## Goals / Non-Goals

**Goals:**
- One write path per entity (Task, Habit) that both REST routes and MCP tools call through.
- Every successful Task/Habit mutation — regardless of whether it originated from REST or MCP — results in a Pusher event, with no per-call-site publish logic to remember.
- Channel security: a user can only receive events for their own data.
- A Pusher outage or error never causes an otherwise-successful API/MCP write to fail.

**Non-Goals:**
- Client-side subscription, reconnection/backfill, or UI wiring — that's a separate, paired change in the `remindeen` repo.
- Presence, typing indicators, or any multi-user collaboration feature — Task/Habit data is single-owner; there's no shared-board use case here.
- Guaranteed/exactly-once delivery. Pusher is a best-effort notification layer; REST remains the source of truth, and the client side is expected to reconcile via a full refetch on (re)connect.

## Decisions

**1. Centralize writes in the repository layer, not inline at call sites.**
`tasks-repository.ts` and `habits-repository.ts` gain create/update/delete (and `checkIn` for habits) functions; `routes/tasks.ts`, `routes/habits.ts`, and `lib/mcp-tools.ts` are changed to call these instead of `prisma.*` directly.
- Alternative considered: add a `pusher.trigger()` call at each of the 8 existing call sites individually. Rejected — duplicates logic across REST and MCP and is easy to miss on the next new write path.
- Alternative considered: a generic Prisma middleware that fires on any write. Rejected — too implicit; per-entity event naming and payload shaping doesn't map cleanly onto a generic hook.

**2. The repository functions themselves call the publish helper, not their callers.**
After the underlying Prisma call resolves, the repository function calls a shared `publishTaskEvent` / `publishHabitEvent` helper before returning. This guarantees REST and MCP are both covered structurally — there's nothing for a future caller to remember.

**3. Channel model: one private channel per user — `private-user-{userId}`.**
`POST /pusher/auth` validates the caller's Supabase JWT using the existing verification path in `lib/auth.ts` (no new verifier), extracts `userId`, confirms it matches the `userId` encoded in the requested `channel_name`, and returns Pusher's signed auth response.
- Alternative: presence channels. Rejected — there's no "who else is here" concept; data is single-user.
- Alternative: a public channel with an unguessable name. Rejected — security-through-obscurity, and still requires per-user filtering server-side, which a private channel gives for free.

**4. `/pusher/auth` joins the `EXTENSION_ORIGIN` CORS allowlist.**
Unlike `/mcp` (not browser-restricted, since its callers are server processes/local apps), `/pusher/auth` is called directly by the extension from a browser context, the same shape as `/auth/api-keys` — so it follows that existing CORS pattern.

**5. Event contract: granular, named events carrying the full current row.**
Events are named per entity+action (`task.created`, `task.updated`, `task.deleted`, `habit.created`, `habit.updated`, `habit.deleted`, `habit.checkedIn`), and the payload for created/updated events is the row exactly as returned by Prisma (serialized directly, not through a hand-maintained DTO, so payload and API shape can't silently drift). Delete events carry just `{ id }`.
- Alternative: a single generic "something changed, go refetch" signal. Rejected for this iteration — it would force a round-trip GET on every event, undercutting the latency benefit of pushing at all. Revisit if full-row payloads ever raise a size or sensitive-field concern.

**6. Best-effort delivery, isolated from the primary write.**
`pusher.trigger()` calls are wrapped so a failure (or the Pusher API being down) is logged and swallowed, never propagated as a failure of the surrounding repository function or the original API/MCP response.

**7. Server-side Pusher client: `lib/pusher.ts`, a module-level singleton** constructed from the existing bare `app_id`/`key`/`secret`/`cluster` env vars.

## Risks / Trade-offs

- [Risk] Full-row payloads could leak a sensitive field if the Task/Habit schema grows one later → Mitigation: revisit with an explicit allowlist if/when that happens; today's schema has no such fields.
- [Risk] Refactoring all 8 existing write call sites at once is a wide-blast-radius change across both REST and MCP → Mitigation: sequence `tasks.md` to migrate and verify Task fully before touching Habit; re-run `add-mcp-server`'s existing manual-verification checklist after the refactor.
- [Risk] Silent, repeated Pusher trigger failures (e.g. bad/rotated credentials) would have no visible signal today → Mitigation: log failures so they surface in Vercel function logs; defer alerting to a later change if it proves necessary.
- [Risk] `/pusher/auth` is a new endpoint; a bug in channel-name/userId matching could let a user authorize a channel that isn't theirs → Mitigation: reuse the existing, already-exercised JWT verification path rather than writing new auth logic.
- [Risk] Drag-and-drop reordering (`PATCH /tasks/:id/position`) may shift more than one row per user action, which could fire an event storm of single-row updates → Mitigation: confirm in `tasks.md` whether reorder ever touches multiple rows, and consider a batched event type if so.

## Migration Plan

- Purely additive: new repository functions are added alongside the refactor of existing call sites; Task is migrated and verified before Habit, so each lands as an independently checkable step.
- No Prisma schema changes.
- Safe to deploy ahead of the paired `remindeen` change — no client subscribes yet, so this change is invisible to end users until that follow-up ships.
- Rollback: if the repository refactor regresses a write path, revert that call site back to a direct Prisma call. The Pusher trigger itself never needs a rollback path since failures are already isolated and non-blocking.

## Open Questions

- Should `/pusher/auth` have any rate limiting beyond JWT verification, given it's a new endpoint reachable from the extension's CORS origin?
- `Comment` (a sub-resource of Task, with its own create/update/delete routes under `/tasks/:id/comments`) is out of scope for this change — the user's ask was specifically about the Kanban board and habit tracker UI, and the `kanban-tasks` spec doesn't surface comments. Revisit if comments become user-facing in the board view.

Resolved during design: `PATCH /tasks/:id/position` ([routes/tasks.ts:107-140](routes/tasks.ts#L107-L140)) always updates exactly one row — it uses fractional midpoint positioning between neighbors rather than bulk renumbering — so no batched event type is needed; `task.updated` covers it like any other single-row change.
