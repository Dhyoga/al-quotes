## MODIFIED Requirements

### Requirement: Calendar sync is published on Task and Habit mutations
The system SHALL publish a calendar sync job for a Task, Habit, or Event create, update, or delete only when the owning user has an active `GoogleCalendarLink` and the entity's `syncToCalendar` flag is `true`. The system SHALL NOT publish a sync job for habit check-ins.

#### Scenario: Task created by a user with a calendar link and the flag enabled
- **WHEN** a user with an active `GoogleCalendarLink` creates a Task with `syncToCalendar: true`
- **THEN** the system publishes a `task.upserted` sync job

#### Scenario: Task created with sync disabled
- **WHEN** a user creates a Task with `syncToCalendar: false` (or omits the flag)
- **THEN** the system does NOT publish a calendar sync job, regardless of the user's calendar connection status

#### Scenario: Habit created by a user with sync enabled
- **WHEN** a user with an active `GoogleCalendarLink` creates a Habit with `syncToCalendar: true`
- **THEN** the system publishes a `habit.upserted` sync job

#### Scenario: Habit created with sync disabled (default)
- **WHEN** a user creates a Habit without `syncToCalendar: true` (or with `syncToCalendar: false`)
- **THEN** the system does NOT publish a calendar sync job

#### Scenario: Event created by a user with sync enabled (default)
- **WHEN** a user with an active `GoogleCalendarLink` creates an Event with `syncToCalendar: true` (or omits the flag, since it defaults to `true`)
- **THEN** the system publishes an `event.upserted` sync job

#### Scenario: Event created with sync disabled
- **WHEN** a user creates an Event with `syncToCalendar: false`
- **THEN** the system does NOT publish a calendar sync job

#### Scenario: Calendar sync failure does not fail the mutation
- **WHEN** the calendar sync job publish fails (network error, QStash unavailable, etc.)
- **THEN** the Task, Habit, or Event mutation still succeeds and the error is logged
