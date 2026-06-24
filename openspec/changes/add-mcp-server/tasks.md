## 1. Dependencies

- [x] 1.1 Add `@modelcontextprotocol/sdk` to `package.json`
- [x] 1.2 Confirm `add-automation-api-keys` is implemented in the working tree (`ApiKey` model, `lib/api-keys.ts`, `/auth/api-keys` routes) — confirmed present; archiving that change is deferred to a separate `/opsx:archive` step, not done here

## 2. MCP-only auth middleware

- [x] 2.1 Add a `requireApiKey` middleware (or equivalent) in `lib/auth.ts` that accepts only an `rmd_live_...`-shaped bearer token, resolves it via the existing hash-lookup helper, rejects anything else (including valid JWTs) with `401`
- [x] 2.2 On successful lookup: reject `401` if `expiresAt` has passed; otherwise set `req.userId`, bump `lastUsedAt`/`expiresAt`, call `next()` — reusing the existing sliding-expiry helper from `lib/api-keys.ts`

## 3. MCP server and tools

- [x] 3.1 Add the `/mcp` route, constructing a fresh `McpServer` + `StreamableHTTPServerTransport` (`sessionIdGenerator: undefined`) per request
- [x] 3.2 Implement `list_tasks(status?, dueBefore?, dueAfter?)` using `tasks-repository.ts`
- [x] 3.3 Implement `create_task(title, description?, startDate?, dueDate?, priority?)`
- [x] 3.4 Implement `update_task(id, ...partial fields)` including status transitions
- [x] 3.5 Implement `list_habits()` using `habits-repository.ts`
- [x] 3.6 Implement `check_in_habit(habitId, date?)`
- [x] 3.7 Implement `get_today_overview()` — tasks due today + habits not yet checked in today
- [x] 3.8 Ensure every tool error returns clear, structured MCP error content (not a bare exception) so a calling LLM can react in one turn
- [x] 3.9 Mount the `/mcp` router in `server.ts`, with no `EXTENSION_ORIGIN` CORS restriction applied

## 4. Narrow REST auth back to JWT-only

- [x] 4.1 Swap `router.use(requireAuth)` → `router.use(requireJwt)` in `routes/tasks.ts`
- [x] 4.2 Swap `router.use(requireAuth)` → `router.use(requireJwt)` in `routes/habits.ts`

## 5. Verification

- [ ] 5.1 Manually verify: generate a key via `/auth/api-keys`, call a tool on `/mcp` with it, confirm success and `lastUsedAt`/`expiresAt` update
- [ ] 5.2 Manually verify: same key against `/tasks` or `/habits` directly now returns `401`
- [ ] 5.3 Manually verify: a JWT (no API key) against `/mcp` returns `401`
- [ ] 5.4 Manually verify: revoked key is rejected on `/mcp`
- [ ] 5.5 Manually verify `get_today_overview` against seeded tasks/habits returns the expected combined shape
- [ ] 5.6 Run `npm run typecheck`
