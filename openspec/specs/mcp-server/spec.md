# mcp-server Specification

## Purpose
TBD - created by archiving change add-mcp-server. Update Purpose after archive.

## Requirements
### Requirement: MCP endpoint authenticates via API key only
The `/mcp` endpoint SHALL accept only a valid, unexpired API key (`Authorization: Bearer rmd_live_...`) as proof of identity. A Supabase JWT SHALL NOT be accepted on this route.

#### Scenario: Valid API key allows a tool call
- **WHEN** a request to `/mcp` includes a valid, unexpired API key in the `Authorization` header
- **THEN** the system resolves the associated `userId` and processes the MCP request

#### Scenario: JWT is rejected
- **WHEN** a request to `/mcp` includes a Supabase JWT instead of an API key
- **THEN** the system responds with `401 Unauthorized`

#### Scenario: Expired or revoked key is rejected
- **WHEN** a request to `/mcp` includes an API key that has expired or been revoked
- **THEN** the system responds with `401 Unauthorized`

#### Scenario: Successful authentication extends the key's sliding expiry
- **WHEN** a request to `/mcp` is successfully authenticated with an API key
- **THEN** the system updates that key's `lastUsedAt` to now and `expiresAt` to 30 days from now, consistent with the sliding-expiry behavior defined for API keys generally

### Requirement: Stateless transport
The `/mcp` endpoint SHALL serve the MCP Streamable HTTP transport in stateless mode: each request SHALL be authenticated and handled independently, with no reliance on in-memory session state persisting between requests.

#### Scenario: Two consecutive tool calls do not share server-side session state
- **WHEN** a client sends two separate tool-call requests to `/mcp`, each with a valid API key
- **THEN** each request is authenticated and processed independently, and the success of either request does not depend on the other having been handled by the same server process

### Requirement: Tool surface for tasks and habits
The MCP server SHALL expose tools to list, create, and update tasks; list habits and record a check-in; and retrieve a combined "today" overview of tasks due today and habits not yet checked in today — each tool scoped to the authenticated user's own data.

#### Scenario: Listing tasks
- **WHEN** the `list_tasks` tool is called with an optional `status` filter
- **THEN** the system returns only the authenticated user's tasks matching that filter

#### Scenario: Creating a task
- **WHEN** the `create_task` tool is called with at least a `title`
- **THEN** the system creates a new task owned by the authenticated user and returns it

#### Scenario: Updating a task
- **WHEN** the `update_task` tool is called with a task `id` and one or more fields to change
- **THEN** the system updates only the specified fields on that task, if it belongs to the authenticated user

#### Scenario: Updating a task owned by another user
- **WHEN** the `update_task` tool is called with an `id` belonging to a different user
- **THEN** the system returns a tool error and makes no change

#### Scenario: Checking in a habit
- **WHEN** the `check_in_habit` tool is called with a `habitId` belonging to the authenticated user
- **THEN** the system records a check-in for the current period

#### Scenario: Getting today's overview
- **WHEN** the `get_today_overview` tool is called
- **THEN** the system returns the authenticated user's tasks due today and habits not yet checked in for the current period, combined in a single response

### Requirement: Tool errors are self-explanatory
Errors returned from any tool call SHALL include a clear, human-readable description of what went wrong, sufficient for an LLM-driven caller to react correctly without a follow-up clarification turn.

#### Scenario: Calling update_task with a non-existent id
- **WHEN** the `update_task` tool is called with an `id` that does not exist or does not belong to the authenticated user
- **THEN** the system returns a tool error whose message clearly states the task could not be found, rather than an unhandled exception
