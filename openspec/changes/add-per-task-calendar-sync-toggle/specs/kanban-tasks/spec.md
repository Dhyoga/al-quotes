## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: No assignee or attachment fields
Tasks SHALL NOT support assignee fields or image/attachment fields, since the system is used by a single user per task.

#### Scenario: Task fields are limited to single-user fields
- **WHEN** a task is created or updated
- **THEN** the system only accepts `title`, `description`, `startDate`, `dueDate`, `priority`, `status`, `position`, and `syncToCalendar` fields, and rejects any assignee or image/attachment fields
