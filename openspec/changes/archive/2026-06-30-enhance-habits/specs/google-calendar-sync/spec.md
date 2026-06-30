## MODIFIED Requirements

### Requirement: Calendar sync is published on Task and Habit mutations
The system SHALL publish a calendar sync job for a Task or Habit create, update, or delete only when the owning user has an active `GoogleCalendarLink` AND, for Tasks, the Task's `syncToCalendar` flag is `true` AND, for Habits, the Habit's `syncToCalendar` flag is `true`. The system SHALL NOT publish a sync job for habit check-ins.

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

#### Scenario: Calendar sync failure does not fail the mutation
- **WHEN** the calendar sync job publish fails (network error, QStash unavailable, etc.)
- **THEN** the Task or Habit mutation still succeeds and the error is logged

### Requirement: RRULE reflects selected week days for weekly habits
When publishing a calendar sync job for a weekly Habit, the system SHALL include an RRULE in the sync payload. If the Habit's `weekDays` array is non-empty, the RRULE SHALL use `BYDAY` to enumerate the selected days; otherwise the RRULE SHALL be `RRULE:FREQ=WEEKLY`.

#### Scenario: Weekly habit with specific days produces BYDAY RRULE
- **WHEN** a calendar sync job is published for a weekly Habit with `weekDays: [1, 3, 5]`
- **THEN** the sync payload includes `rrule: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"`

#### Scenario: Weekly habit without day selection produces plain weekly RRULE
- **WHEN** a calendar sync job is published for a weekly Habit with `weekDays: []`
- **THEN** the sync payload includes `rrule: "RRULE:FREQ=WEEKLY"`

#### Scenario: Daily habit RRULE is unchanged
- **WHEN** a calendar sync job is published for a daily Habit
- **THEN** the sync payload includes `rrule: "RRULE:FREQ=DAILY"`
