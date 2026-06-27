## ADDED Requirements

### Requirement: Disabling per-task sync removes the calendar event
The system SHALL publish a delete sync job when a Task's `syncToCalendar` flag transitions from `true` to `false` and that task has an existing `CalendarSync` row, so the event does not linger in the user's calendar after sync is disabled for that task.

#### Scenario: Turning the toggle off removes a previously synced event
- **WHEN** a user with an active `GoogleCalendarLink` updates a Task's `syncToCalendar` from `true` to `false`, and that Task has an existing `CalendarSync` row
- **THEN** the system publishes a `task.deleted` sync job carrying that row's `googleEventId`

#### Scenario: Turning the toggle off when never synced is not an error
- **WHEN** a user updates a Task's `syncToCalendar` from `true` to `false`, but that Task has no existing `CalendarSync` row
- **THEN** the system does not publish any sync job and the update still succeeds

### Requirement: Existing synced tasks are backfilled to keep syncing
When the per-task `syncToCalendar` flag is introduced, the system SHALL set it to `true` for any Task that already has a `CalendarSync` row at migration time, and `false` for all other Tasks, so calendar events already visible to a user continue to receive updates rather than going stale.

#### Scenario: A previously synced task keeps syncing after migration
- **WHEN** the `syncToCalendar` column is added and a Task already has a `CalendarSync` row
- **THEN** that Task's `syncToCalendar` is set to `true`, and a subsequent update to that Task still publishes a `task.upserted` sync job

#### Scenario: A never-synced task defaults to off after migration
- **WHEN** the `syncToCalendar` column is added and a Task has no `CalendarSync` row
- **THEN** that Task's `syncToCalendar` is set to `false`

## MODIFIED Requirements

### Requirement: Calendar sync is published on Task and Habit mutations
The system SHALL publish a calendar sync job for a Task or Habit create, update, or delete only when the owning user has an active `GoogleCalendarLink` and, for Tasks specifically, only when the Task's `syncToCalendar` flag is `true`. The system SHALL NOT publish a sync job for habit check-ins.

#### Scenario: Task created by a user with a calendar link and the flag enabled
- **WHEN** a user with an active `GoogleCalendarLink` creates a Task with `syncToCalendar: true`
- **THEN** the system publishes a `task.upserted` sync job carrying a freshly refreshed Google access token and a `null` `googleEventId`

#### Scenario: Task created by a user with a calendar link but the flag disabled
- **WHEN** a user with an active `GoogleCalendarLink` creates a Task with `syncToCalendar: false` (or omitted)
- **THEN** the system does not publish any sync job

#### Scenario: Task created by a user without a calendar link
- **WHEN** a user with no `GoogleCalendarLink` creates a Task
- **THEN** the system does not publish any sync job, regardless of the Task's `syncToCalendar` value

#### Scenario: Task updated when a prior sync exists and the flag is still enabled
- **WHEN** a user with an active `GoogleCalendarLink` updates a Task that already has a `CalendarSync` row and `syncToCalendar` remains `true`
- **THEN** the system publishes a `task.upserted` sync job carrying the existing `googleEventId`

#### Scenario: Task deleted after being synced
- **WHEN** a user with an active `GoogleCalendarLink` deletes a Task that has an existing `CalendarSync` row
- **THEN** the system publishes a `task.deleted` sync job carrying that row's `googleEventId`, snapshotted before the Task row is deleted

#### Scenario: Task deleted without ever being synced
- **WHEN** a user with an active `GoogleCalendarLink` deletes a Task that has no `CalendarSync` row
- **THEN** the system does not publish any sync job

#### Scenario: Habit check-in never triggers sync
- **WHEN** a user checks in on a Habit
- **THEN** the system does not publish any sync job, regardless of whether the user has a `GoogleCalendarLink`
