## Why

The Kanban board and habit tracker in the `remindeen` extension only fetch Task/Habit data on load. When that data changes via the `/mcp` tools (an agent like Claude acting on the user's behalf) or from another device, an already-open extension has no way to know until the user manually refreshes. We need a push channel so the extension can stay in sync without polling.

## What Changes

- Centralize all Task and Habit mutations (create/update/delete, habit check-in) — currently spread across `routes/tasks.ts`, `routes/habits.ts`, and `lib/mcp-tools.ts`, each calling Prisma directly — into `tasks-repository.ts` / `habits-repository.ts` as the single write path. (This was already the stated intent in `add-mcp-server`'s proposal but was never actually implemented.)
- Every successful mutation at that single write path triggers a Pusher event on a private, per-user channel (`private-user-{userId}`). Because REST routes and MCP tools both go through the same repository functions, both paths are covered by one trigger call — no duplicated publish logic per call site.
- Add a new `POST /pusher/auth` endpoint that authorizes subscription to a private channel: validates the caller's Supabase JWT, confirms the `userId` encoded in the requested channel name matches the token's subject, and signs the auth response with the Pusher app secret.
- Define a stable event contract (event names per change type, payload shape) for Task and Habit changes. This contract is what the client side (a separate, paired change in the `remindeen` repo) will consume.
- Pusher triggers are best-effort: a failure to publish an event SHALL NOT fail or roll back the underlying API/MCP response to the original caller.

## Capabilities

### New Capabilities
- `realtime-sync`: Pusher private-channel authorization, the Task/Habit event contract, and trigger-on-mutation behavior.

### Modified Capabilities
(none — `kanban-tasks` and `habit-tracking` REST/MCP behavior is unchanged; centralizing writes into the repository layer is an internal implementation detail, not a spec-level behavior change)

## Impact

- `lib/tasks-repository.ts`, `lib/habits-repository.ts`: gain create/update/delete (and check-in, for habits) functions; become the only callers of `prisma.task.*` / `prisma.habit.*` / `prisma.habitCheckIn.*` for writes.
- `routes/tasks.ts`, `routes/habits.ts`, `lib/mcp-tools.ts`: mutation handlers call the repository functions instead of Prisma directly.
- New file (e.g. `lib/pusher.ts`): server-side Pusher client + the trigger-on-mutation helper.
- New route (e.g. mounted in `server.ts` or `routes/pusher-auth.ts`): `POST /pusher/auth`.
- `server.ts`: mount the new route; confirm whether `/pusher/auth` needs to join the `EXTENSION_ORIGIN` CORS allowlist already used for `/auth/api-keys` (the extension, a browser context, is the caller here — unlike `/mcp`, which isn't CORS-restricted).
- New dependency: `pusher` (official Node SDK).
- No Prisma schema changes.
- Builds on `add-mcp-server` and `add-automation-api-keys` (both functionally complete; only manual-verification tasks remain on `add-mcp-server`).
