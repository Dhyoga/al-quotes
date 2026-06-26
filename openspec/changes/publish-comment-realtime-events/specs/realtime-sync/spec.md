## ADDED Requirements

### Requirement: Comment mutations publish realtime events
Every successful Comment create, update, or delete via the REST API SHALL publish a corresponding event (`comment.created`, `comment.updated`, or `comment.deleted`) to that comment's task owner's private channel. The `comment.deleted` payload SHALL include both the comment's `id` and its `taskId`, since the per-user channel carries comment events for all of a user's tasks and a subscriber needs `taskId` to determine whether the deleted comment belongs to the task thread it currently has open.

#### Scenario: Adding a comment publishes an event
- **WHEN** a comment is created via `POST /tasks/:id/comments`
- **THEN** a `comment.created` event carrying the created comment (including its `taskId`) is published to the task owner's private channel

#### Scenario: Editing a comment publishes an event
- **WHEN** a comment's body is updated via `PATCH /tasks/:id/comments/:commentId`
- **THEN** a `comment.updated` event carrying the updated comment (including its `taskId`) is published to the task owner's private channel

#### Scenario: Deleting a comment publishes an event with its taskId
- **WHEN** a comment is deleted via `DELETE /tasks/:id/comments/:commentId`
- **THEN** a `comment.deleted` event carrying `{ id, taskId }` is published to the task owner's private channel

## MODIFIED Requirements

### Requirement: All Task and Habit mutations go through a single write path
The system SHALL perform all Task and Habit create/update/delete/check-in operations through `tasks-repository.ts` / `habits-repository.ts`, rather than calling Prisma directly from route handlers or MCP tool handlers. The system SHALL likewise perform all Comment create/update/delete operations through `comments-repository.ts`, rather than calling Prisma directly from route handlers.

#### Scenario: REST and MCP share the same write path
- **WHEN** a Task is created via `POST /tasks` and, separately, via the MCP `create_task` tool
- **THEN** both requests result in a call to the same `tasks-repository.ts` create function

#### Scenario: Comment routes use the comments repository
- **WHEN** a comment is created, updated, or deleted via any `/tasks/:id/comments` route
- **THEN** the route handler calls the corresponding function in `comments-repository.ts` rather than calling `prisma.comment.*` directly
