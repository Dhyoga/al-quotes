## Context

`add-automation-api-keys` shipped a working `ApiKey` credential (opaque `rmd_live_...` token, SHA-256 hash storage, sliding 30-day expiry, JWT-gated management endpoints) and wired `/tasks`/`/habits` to accept either a Supabase JWT or that key. The motivating use case was a personal automation agent ("Hermes Agent") calling those REST endpoints directly.

That plan has changed: Hermes Agent (and any other AI-driven client) should talk to Remindeen through MCP tool calls, not bespoke REST integration. The `ApiKey` credential itself doesn't need to change — only *where* it's accepted, and what sits behind it.

`al-quotes` deploys to Vercel (`vercel.json` present), which runs request handling as serverless functions. There is no guarantee that two requests are served by the same warm process, so anything that depends on in-memory state surviving between requests (like a stateful MCP session keyed by `mcp-session-id`) is unreliable here.

## Goals / Non-Goals

**Goals:**
- Let any MCP-compatible client (Hermes Agent, Claude Desktop, Claude Code, future others) call Remindeen's tasks/habits as tools, authenticated by a key the user generated themselves.
- Keep the tool surface usable by an LLM picking tools from natural-language input — not a thin 1:1 REST mirror.
- Make `/mcp` work correctly on Vercel's serverless model, with no dependency on session state surviving across requests.
- Narrow the API key's reach to exactly one route (`/mcp`), since that's now the only sanctioned non-interactive entry point.

**Non-Goals:**
- Rate limiting or abuse detection on `/mcp` calls (inherited non-goal from `add-automation-api-keys`; still out of scope, though noted as a risk below since LLM-driven callers can retry more aggressively than a human).
- Scoped/read-only keys, or per-tool permissions. A key still grants full read/write on that user's tasks and habits, same as before.
- Server-initiated push/streaming notifications. Stateless mode means no persistent stream between calls; every tool call is a self-contained request/response.
- Changing how the extension itself authenticates (Google OAuth + JWT untouched).

## Decisions

**Transport: Streamable HTTP in stateless mode.**
The MCP TypeScript SDK's `StreamableHTTPServerTransport` supports a stateless mode by passing `sessionIdGenerator: undefined`. In this mode there's no `mcp-session-id` to track, and a fresh `McpServer` + transport pair is constructed per incoming request, used once, and discarded. This sidesteps the serverless cold-start/no-shared-memory problem entirely — there is no state to lose. The cost is no support for server-to-client push notifications between calls, which this app doesn't need (every interaction is a direct tool call in response to something the user said).

**Auth: reuse the existing API-key lookup path, mounted only at `/mcp`.**
`lib/auth.ts` already has the logic to detect an `rmd_live_...`-shaped bearer token, hash it, look it up, check `expiresAt`, and bump `lastUsedAt`/`expiresAt` on success. `/mcp`'s middleware calls this same logic directly (not through `requireAuth`'s JWT-or-key branching, since `/mcp` should never accept a JWT — automation agents don't have one). A JWT-shaped bearer token at `/mcp` is just an invalid credential, not a different valid one.

**`/tasks` and `/habits` revert to JWT-only.**
Now that `/mcp` is the dedicated automation gateway, there's no remaining reason for the REST endpoints to accept a second credential type. Narrowing this reduces the attack surface on the routes the extension itself depends on for its everyday JWT-based usage, and makes the system's shape easier to reason about: *one* non-interactive credential, *one* place it's valid.

**No CORS restriction on `/mcp`.**
The `EXTENSION_ORIGIN` CORS allowlist exists because `/auth/api-keys` is called from the browser extension, where CORS is the relevant boundary. `/mcp`'s clients (a Node process for Hermes Agent, a desktop app for Claude Desktop) aren't browsers and don't send a CORS preflight in the way that matters — the API key is the actual gate here, not origin. Locking CORS down on this route would do nothing for security and could break legitimate non-browser clients that do send an `Origin` header.

**Tool granularity: composite, agent-friendly, not REST-mirrored.**
`get_today_overview` exists specifically because Hermes Agent's primary interface is a Telegram message like "gimana hari ini?" — answering that by calling `list_tasks` and `list_habits` separately and stitching them together is exactly the kind of work that should live in the tool, not be reconstructed by every LLM client that connects. Other tools (`update_task` taking partial fields, rather than separate endpoints per field) follow the same principle: minimize the number of tool calls needed to satisfy one natural-language request.

## Risks / Trade-offs

- **[Risk]** No rate limiting means a misbehaving or looping LLM-driven client could hammer `/mcp` far more than a human would via the extension → **Mitigation**: none built now; flagged as a fast-follow if it becomes a real problem. The 30-day sliding expiry and manual revoke are the only backstops.
- **[Risk]** Stateless mode means tool call errors must be self-explanatory in a single response (no follow-up clarification turn within the same "session") → **Mitigation**: return clear, structured error content in the MCP tool response (e.g. "no task with that id" rather than a bare 404), since the calling LLM only gets one shot per request to react.
- **[Trade-off]** Dropping API-key support from `/tasks`/`/habits` is a breaking change for anyone who started depending on the dual-auth behavior `add-automation-api-keys` shipped — acceptable here because that behavior was never deployed/announced as a stable integration point (verification tasks for it are still unchecked) and there are no known external consumers yet.

## Migration Plan

1. Ensure `add-automation-api-keys` is in place (`ApiKey` model, `lib/api-keys.ts`, `/auth/api-keys` routes) — archive it as-is if not already.
2. Add `@modelcontextprotocol/sdk` dependency.
3. Build the `/mcp` route: stateless `StreamableHTTPServerTransport`, API-key-only auth middleware, register the tool set.
4. Swap `requireAuth` → `requireJwt` on `routes/tasks.ts` and `routes/habits.ts`.
5. Deploy; manually verify a generated key works against `/mcp` (e.g. via the MCP Inspector or a minimal client) and that the same key is rejected on `/tasks`/`/habits`.
6. Rollback: `/mcp` route and its mount can be removed independently; reverting `requireJwt` back to `requireAuth` on `/tasks`/`/habits` restores the prior (briefly-shipped) dual-auth behavior if needed.

## Open Questions

- Final tool list may grow (e.g. `delete_task`, `list_today_check_ins`) as real Hermes Agent usage surfaces gaps — this change ships a first usable set, not a closed one.
- Should `/mcp` log which tool was called and by which key's `label`, for the user's own visibility into what their automations are doing? Not designed here; worth a follow-up if Hermes Agent usage grows beyond one user.
