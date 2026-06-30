# mcp-server Specification

## Purpose
Exposes the user's tasks, habits, and events to LLM-driven MCP clients (e.g. Claude, other agents) over the Streamable HTTP transport, authenticated by API key, so an assistant can read and manage a user's data on their behalf with the same scoping and ownership guarantees as the REST API.

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
The MCP server SHALL expose tools to list, create, and update tasks; list habits and record a check-in; and retrieve a combined "today" overview of tasks due today, habits not yet checked in today, and events occurring today — each tool scoped to the authenticated user's own data.

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
- **THEN** the system returns the authenticated user's tasks due today, habits not yet checked in for the current period, and events (one-time or recurring) occurring today, combined in a single response

#### Scenario: Getting today's overview includes a recurring event occurring today
- **WHEN** the `get_today_overview` tool is called and the user has a recurring event whose RRULE produces an occurrence within the current UTC day
- **THEN** the system includes that event in the response's `eventsToday`

#### Scenario: Getting today's overview excludes a recurring event not occurring today
- **WHEN** the `get_today_overview` tool is called and the user has a recurring event whose RRULE produces no occurrence within the current UTC day
- **THEN** the system does not include that event in `eventsToday`

#### Scenario: A malformed recurrence rule does not break the overview
- **WHEN** the `get_today_overview` tool is called and one of the user's events has a stored `rrule` that fails to parse
- **THEN** the system omits that event from `eventsToday` and still returns the user's `tasksDueToday` and `habitsPendingCheckIn`, rather than failing the entire call

### Requirement: Tool errors are self-explanatory
Errors returned from any tool call SHALL include a clear, human-readable description of what went wrong, sufficient for an LLM-driven caller to react correctly without a follow-up clarification turn.

#### Scenario: Calling update_task with a non-existent id
- **WHEN** the `update_task` tool is called with an `id` that does not exist or does not belong to the authenticated user
- **THEN** the system returns a tool error whose message clearly states the task could not be found, rather than an unhandled exception

#### Scenario: Calling update_event or delete_event with a non-existent id
- **WHEN** the `update_event` or `delete_event` tool is called with an `id` that does not exist or does not belong to the authenticated user
- **THEN** the system returns a tool error whose message clearly states the event could not be found, rather than an unhandled exception

### Requirement: Tool surface for events
The MCP server SHALL expose tools to list, create, update, and delete events, each scoped to the authenticated user's own data. Unlike tasks and habits, events expose a delete tool, since calendar events are more often removed outright than completed or archived.

#### Scenario: Listing events
- **WHEN** the `list_events` tool is called
- **THEN** the system returns all of the authenticated user's events, with no filtering

#### Scenario: Creating a one-time event
- **WHEN** the `create_event` tool is called with at least a `title` and `startAt`
- **THEN** the system creates a new event owned by the authenticated user and returns it

#### Scenario: Creating a recurring event without a rrule
- **WHEN** the `create_event` tool is called with `isRecurring: true` and no `rrule`
- **THEN** the system returns a tool error and creates no event

#### Scenario: Updating an event
- **WHEN** the `update_event` tool is called with an event `id` and one or more fields to change, and the event belongs to the authenticated user
- **THEN** the system updates only the specified fields and returns the updated event

#### Scenario: Updating an event owned by another user
- **WHEN** the `update_event` tool is called with an `id` belonging to a different user
- **THEN** the system returns a tool error and makes no change

#### Scenario: Updating a recurring event's rrule away, leaving isRecurring true
- **WHEN** the `update_event` tool is called on a recurring event, setting `rrule` to empty while `isRecurring` remains `true` (whether explicitly or by omission)
- **THEN** the system returns a tool error and makes no change

#### Scenario: Deleting an event
- **WHEN** the `delete_event` tool is called with an event `id` belonging to the authenticated user
- **THEN** the system deletes the event and returns a confirmation including the deleted event's `id`

#### Scenario: Deleting an event owned by another user
- **WHEN** the `delete_event` tool is called with an `id` belonging to a different user
- **THEN** the system returns a tool error and does not delete the event
