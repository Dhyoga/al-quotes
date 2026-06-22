## ADDED Requirements

### Requirement: Create task
Authenticated users SHALL be able to create a task with a required `title` and optional `description`, `startDate`, `dueDate`, and `priority`. A newly created task SHALL default to status `To Do`.

#### Scenario: Create a task with required fields
- **WHEN** an authenticated user submits a new task with at least a `title`
- **THEN** the system creates the task with status `To Do`, associates it with the user, and returns the created task

### Requirement: Three-state status workflow
A task's `status` SHALL be one of `To Do`, `Doing`, or `Done`.

#### Scenario: Update task status
- **WHEN** a user updates a task's status to one of `To Do`, `Doing`, or `Done`
- **THEN** the system updates the task's status and appends a record to the task's status history

#### Scenario: Reject invalid status value
- **WHEN** a user attempts to set a task's status to a value other than `To Do`, `Doing`, or `Done`
- **THEN** the system rejects the request with a validation error and does not change the task

### Requirement: Status change history
Every status transition on a task SHALL be recorded in an append-only history log.

#### Scenario: Status history accumulates across transitions
- **WHEN** a task moves from `To Do` to `Doing`, and later from `Doing` to `Done`
- **THEN** the system records two separate history entries, each with the previous status, new status, and a timestamp

### Requirement: Manual ordering within a column
Tasks SHALL support a `position` value used for drag-and-drop ordering within the same status column.

#### Scenario: Reorder a task within its column
- **WHEN** a user moves a task to a new position within the same status column
- **THEN** the system updates only that task's `position` value, without changing the `position` of other tasks in the column

### Requirement: Comments on tasks
Authenticated users SHALL be able to create, edit, and delete comments on tasks they own.

#### Scenario: Add a comment
- **WHEN** a user adds a comment with body text to a task they own
- **THEN** the system creates the comment and associates it with the task

#### Scenario: Edit a comment
- **WHEN** a user edits the body of a comment they previously created
- **THEN** the system updates the comment's body and the request succeeds

#### Scenario: Delete a comment
- **WHEN** a user deletes a comment they created
- **THEN** the system removes the comment, and it no longer appears on the task

### Requirement: No assignee or attachment fields
Tasks SHALL NOT support assignee fields or image/attachment fields, since the system is used by a single user per task.

#### Scenario: Task fields are limited to single-user fields
- **WHEN** a task is created or updated
- **THEN** the system only accepts `title`, `description`, `startDate`, `dueDate`, `priority`, `status`, and `position` fields, and rejects any assignee or image/attachment fields
