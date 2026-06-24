## Why

`add-automation-api-keys` built a durable, per-user `ApiKey` credential so headless automation could authenticate without an interactive Google OAuth step. The original consumer was "Hermes Agent," a personal Telegram-driven agent. The plan has since narrowed: instead of Hermes Agent (or any other automation) calling `/tasks`/`/habits` directly with a bearer key, every such consumer SHALL talk to Remindeen through a standard **MCP server**. This lets an LLM-driven client (Hermes Agent, Claude Desktop, Claude Code, etc.) pick tools from a described schema instead of hardcoding REST integration code, and gives Remindeen one consistent automation surface instead of "whatever each integration decided to do with raw endpoints."

## What Changes

- Add a new `/mcp` endpoint exposing an MCP server over the **Streamable HTTP** transport, run in **stateless mode** (`sessionIdGenerator: undefined`) — each request authenticates and is served independently, with no in-memory session expected to survive between calls. This fits Vercel's serverless execution model, where a long-lived process or persistent session is not guaranteed across invocations.
- `/mcp` authenticates exclusively via the existing `rmd_live_...` API key (`Authorization: Bearer <key>`), looked up and resolved to a `userId` using the same hashing/lookup helpers `add-automation-api-keys` already built (`lib/api-keys.ts`, the API-key branch of `lib/auth.ts`). No JWT path on this route — a browser session is never the credential for `/mcp`.
- Expose an initial, agent-friendly tool surface (not a 1:1 mirror of REST), backed directly by the existing `tasks-repository.ts` / `habits-repository.ts`:
  - `list_tasks` — filter by `status`, `dueBefore`, `dueAfter`
  - `create_task`
  - `update_task` — partial fields, including status transitions
  - `list_habits`
  - `check_in_habit`
  - `get_today_overview` — tasks due today + habits not yet checked in today; a composite convenience tool with no REST equivalent, aimed at the "how's my day look" query shape Hermes Agent expects from Telegram messages
- **Narrow `automation-api-keys` to MCP only.** `/tasks` and `/habits` revert to JWT-only authentication (`requireJwt`), undoing the dual-auth (JWT-or-API-key) behavior `add-automation-api-keys` added to those routes. An API key now only ever proves identity at `/mcp`.
- `/auth/api-keys` (generate/list/revoke) is unchanged — still JWT-only, still the only way to mint or revoke a key.
- `/mcp` is **not** restricted by the `EXTENSION_ORIGIN` CORS allowlist used for `/auth/api-keys`. MCP clients (Hermes Agent as a server process, Claude Desktop as a local app) are not browsers; CORS is a browser-enforced boundary and doesn't apply to them. The API key itself is the access control on this route.

## Capabilities

### New Capabilities
- `mcp-server`: the `/mcp` endpoint, its stateless transport behavior, API-key authentication, and its tool surface.

### Modified Capabilities
- `user-auth`: `/tasks` and `/habits` require a Supabase JWT exclusively again; API keys are no longer accepted on these routes.

## Impact

- `al-quotes/server.ts`: mount the new `/mcp` router.
- `al-quotes/routes/tasks.ts`, `al-quotes/routes/habits.ts`: swap `router.use(requireAuth)` → `router.use(requireJwt)`.
- New file(s): an MCP route/handler (e.g. `routes/mcp.ts` or `lib/mcp-server.ts` + thin mount) constructing a fresh `McpServer` + `StreamableHTTPServerTransport` per request, registering the tools above.
- New dependency: `@modelcontextprotocol/sdk`.
- No Prisma schema changes — reuses the `ApiKey` model and helpers from `add-automation-api-keys` as-is.
- **Depends on `add-automation-api-keys`** for the `ApiKey` model, `lib/api-keys.ts` helpers, and `/auth/api-keys` routes. That change is functionally complete (only its manual verification tasks are unchecked) and is expected to be archived as-is before or alongside this one — its original "Why" (Hermes Agent needs a durable credential) is still accurate; this change just changes how that credential is consumed.
