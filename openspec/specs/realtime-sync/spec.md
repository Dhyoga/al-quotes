# realtime-sync Specification

## Purpose
TBD - created by archiving change add-realtime-task-habit-events. Update Purpose after archive.

## Requirements

### Requirement: Private per-user realtime channel
The system SHALL expose a private Pusher channel per user, named `private-user-{userId}`, carrying Task and Habit change events for that user only.

#### Scenario: Channel name is scoped to one user
- **WHEN** any Task or Habit event is published
- **THEN** it is published only to the `private-user-{userId}` channel of the user who owns that Task or Habit

### Requirement: Channel subscription requires Pusher auth
The system SHALL expose `POST /pusher/auth`, which authorizes a subscription request only if the caller presents a valid Supabase JWT whose `userId` matches the `userId` encoded in the requested `channel_name`.

#### Scenario: Authorized subscription succeeds
- **WHEN** a request to `POST /pusher/auth` includes a valid Supabase JWT and requests `channel_name=private-user-{userId}` where `{userId}` matches the JWT's subject
- **THEN** the system returns a Pusher-signed auth response permitting the subscription

#### Scenario: Mismatched user is rejected
- **WHEN** a request to `POST /pusher/auth` includes a valid Supabase JWT for user A but requests `channel_name=private-user-{userId}` for a different user B
- **THEN** the system responds with `403 Forbidden` and does not return a signed auth response

#### Scenario: Missing or invalid token is rejected
- **WHEN** a request to `POST /pusher/auth` is missing the `Authorization` header, or includes an invalid or expired JWT
- **THEN** the system responds with `401 Unauthorized` and does not return a signed auth response

#### Scenario: Extension origin is allowed to call the auth endpoint
- **WHEN** a request to `POST /pusher/auth` originates from the extension's configured `EXTENSION_ORIGIN`
- **THEN** the request is not blocked by CORS

### Requirement: Task mutations publish realtime events
Every successful Task create, update, or delete — regardless of whether it was performed via the REST API or an MCP tool — SHALL publish a corresponding event (`task.created`, `task.updated`, or `task.deleted`) to that task's owner's private channel.

#### Scenario: Creating a task via REST publishes an event
- **WHEN** a task is created via `POST /tasks`
- **THEN** a `task.created` event carrying the created task is published to the owner's private channel

#### Scenario: Creating a task via MCP publishes an event
- **WHEN** a task is created via the MCP `create_task` tool
- **THEN** a `task.created` event carrying the created task is published to the owner's private channel

#### Scenario: Updating a task (including status or position changes) publishes an event
- **WHEN** a task's fields, status, or position are updated via `PATCH /tasks/:id`, `PATCH /tasks/:id/position`, or the MCP `update_task` tool
- **THEN** a `task.updated` event carrying the updated task is published to the owner's private channel

#### Scenario: Deleting a task publishes an event
- **WHEN** a task is deleted via `DELETE /tasks/:id`
- **THEN** a `task.deleted` event carrying the deleted task's id is published to the owner's private channel

### Requirement: Habit mutations publish realtime events
Every successful Habit create, update, delete, or check-in — regardless of whether it was performed via the REST API or an MCP tool — SHALL publish a corresponding event (`habit.created`, `habit.updated`, `habit.deleted`, or `habit.checkedIn`) to that habit's owner's private channel.

#### Scenario: Creating a habit publishes an event
- **WHEN** a habit is created via `POST /habits`
- **THEN** a `habit.created` event carrying the created habit is published to the owner's private channel

#### Scenario: Updating a habit publishes an event
- **WHEN** a habit is updated via `PATCH /habits/:id`
- **THEN** a `habit.updated` event carrying the updated habit is published to the owner's private channel

#### Scenario: Deleting a habit publishes an event
- **WHEN** a habit is deleted via `DELETE /habits/:id`
- **THEN** a `habit.deleted` event carrying the deleted habit's id is published to the owner's private channel

#### Scenario: Checking in a habit via MCP publishes an event
- **WHEN** a habit check-in is recorded via the MCP `check_in_habit` tool
- **THEN** a `habit.checkedIn` event carrying the check-in record is published to the owner's private channel

### Requirement: Realtime publishing never blocks or fails the underlying mutation
A failure to publish a realtime event SHALL NOT cause the originating REST request or MCP tool call to fail.

#### Scenario: Pusher is unreachable but the write still succeeds
- **WHEN** a Task or Habit mutation succeeds at the database level but the subsequent Pusher publish call fails (e.g. network error, Pusher outage)
- **THEN** the REST response or MCP tool result still reports success, as if the publish had not been attempted

### Requirement: All Task and Habit mutations go through a single write path
The system SHALL perform all Task and Habit create/update/delete/check-in operations through `tasks-repository.ts` / `habits-repository.ts`, rather than calling Prisma directly from route handlers or MCP tool handlers.

#### Scenario: REST and MCP share the same write path
- **WHEN** a Task is created via `POST /tasks` and, separately, via the MCP `create_task` tool
- **THEN** both requests result in a call to the same `tasks-repository.ts` create function
