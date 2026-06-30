# kanban-tasks Specification

## Purpose
TBD - created by archiving change add-kanban-habit-tracker. Update Purpose after archive.
## Requirements
### Requirement: Create task
Authenticated users SHALL be able to create a task with a required `title` and optional `description`, `startDate`, `dueDate`, and `priority`. A newly created task SHALL default to status `TODO`.

#### Scenario: Create a task with required fields
- **WHEN** an authenticated user submits a new task with at least a `title`
- **THEN** the system creates the task with status `TODO`, associates it with the user, and returns the created task

### Requirement: Three-state status workflow
A task's `status` SHALL be one of `TODO`, `DOING`, or `DONE`.

#### Scenario: Update task status
- **WHEN** a user updates a task's status to one of `TODO`, `DOING`, or `DONE`
- **THEN** the system updates the task's status and appends a record to the task's status history

#### Scenario: Reject invalid status value
- **WHEN** a user attempts to set a task's status to a value other than `TODO`, `DOING`, or `DONE`
- **THEN** the system rejects the request with a validation error and does not change the task

### Requirement: Status change history
Every status transition on a task SHALL be recorded in an append-only history log.

#### Scenario: Status history accumulates across transitions
- **WHEN** a task moves from `TODO` to `DOING`, and later from `DOING` to `DONE`
- **THEN** the system records two separate history entries, each with the previous status, new status, and a timestamp

### Requirement: Completion timestamp tracking
Tasks SHALL carry a `completedAt` timestamp that reflects the most recent transition into `DONE` status, distinct from `updatedAt`. The field SHALL be `null` for tasks that have never been `DONE`.

#### Scenario: Task transitions into DONE
- **WHEN** a task's status is updated from `TODO` or `DOING` to `DONE`
- **THEN** the system sets the task's `completedAt` to the current time

#### Scenario: Task transitions out of DONE
- **WHEN** a task's status is updated from `DONE` to `TODO` or `DOING`
- **THEN** the system clears the task's `completedAt` back to `null`

#### Scenario: Editing a DONE task without changing its status
- **WHEN** a user updates a `DONE` task's title, description, priority, or other non-status field
- **THEN** the system leaves `completedAt` unchanged

#### Scenario: completedAt is not directly settable
- **WHEN** a client includes a `completedAt` value in a create or update request body
- **THEN** the system ignores it; `completedAt` is only ever derived from status transitions

### Requirement: Manual ordering within a column
Tasks SHALL support a `position` value used for drag-and-drop ordering within the same status column.

#### Scenario: Reorder a task within its column
- **WHEN** a user moves a task to a new position within the same status column
- **THEN** the system updates only that task's `position` value, without changing the `position` of other tasks in the column

### Requirement: Comments on tasks
Authenticated users SHALL be able to create, edit, and delete comments on tasks they own. Every comment create, update, and delete SHALL publish a realtime event on the task owner's private channel, per the `realtime-sync` capability.

#### Scenario: Add a comment
- **WHEN** a user adds a comment with body text to a task they own
- **THEN** the system creates the comment, associates it with the task, and publishes a `comment.created` event to the task owner's private channel

#### Scenario: Edit a comment
- **WHEN** a user edits the body of a comment they previously created
- **THEN** the system updates the comment's body, the request succeeds, and a `comment.updated` event is published to the task owner's private channel

#### Scenario: Delete a comment
- **WHEN** a user deletes a comment they created
- **THEN** the system removes the comment, it no longer appears on the task, and a `comment.deleted` event carrying the comment's `id` and `taskId` is published to the task owner's private channel

### Requirement: Per-task calendar sync flag
Tasks SHALL support an optional `syncToCalendar` boolean field, settable on create and update, defaulting to `false` for newly created tasks.

#### Scenario: Creating a task without specifying the flag
- **WHEN** an authenticated user creates a task without passing `syncToCalendar`
- **THEN** the system creates the task with `syncToCalendar` set to `false`

#### Scenario: Creating a task with the flag enabled
- **WHEN** an authenticated user creates a task with `syncToCalendar: true`
- **THEN** the system creates the task with `syncToCalendar` set to `true`

#### Scenario: Toggling the flag on an existing task
- **WHEN** an authenticated user updates a task's `syncToCalendar` value
- **THEN** the system persists the new value for that task

### Requirement: No assignee or attachment fields
Tasks SHALL NOT support assignee fields or image/attachment fields, since the system is used by a single user per task.

#### Scenario: Task fields are limited to single-user fields
- **WHEN** a task is created or updated
- **THEN** the system only accepts `title`, `description`, `startDate`, `dueDate`, `priority`, `status`, `position`, and `syncToCalendar` fields, and rejects any assignee or image/attachment fields

