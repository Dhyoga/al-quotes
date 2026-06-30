## ADDED Requirements

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
