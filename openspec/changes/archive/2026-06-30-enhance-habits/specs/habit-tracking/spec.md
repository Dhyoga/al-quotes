## ADDED Requirements

### Requirement: Week-day selection for weekly habits
Weekly habits SHALL support an optional list of expected days (`weekDays`), represented as integers (0 = Sunday, 1 = Monday … 6 = Saturday). When `weekDays` is empty (the default), the habit behaves as before: the user may check in on any day of the current ISO week. When `weekDays` is non-empty, the specified days are recorded as the days on which the user intends to complete the habit, but the system SHALL still accept check-ins on any day — `weekDays` is advisory, not a gate.

#### Scenario: Create a weekly habit with specific days
- **WHEN** an authenticated user creates a habit with `frequency: "weekly"` and `weekDays: [1, 3, 5]`
- **THEN** the system creates the habit storing `weekDays = [1, 3, 5]` (Monday, Wednesday, Friday)

#### Scenario: Create a weekly habit without specifying days
- **WHEN** an authenticated user creates a habit with `frequency: "weekly"` and omits `weekDays`
- **THEN** the system creates the habit with `weekDays = []`, preserving the existing any-day-this-week behaviour

#### Scenario: weekDays is ignored for daily habits
- **WHEN** an authenticated user creates or updates a habit with `frequency: "daily"` and passes any `weekDays` value
- **THEN** the system stores the habit with `weekDays` ignored (or empty), since day selection is not meaningful for daily habits

#### Scenario: Reject out-of-range weekDay values
- **WHEN** an authenticated user submits a `weekDays` array containing any integer outside 0–6
- **THEN** the system rejects the request with a validation error

### Requirement: Reminder time for habits
Habits SHALL support an optional `reminderTime` field stored as a `"HH:MM"` 24-hour string that records when the user intends to complete the habit. The system SHALL treat this value as informational metadata and SHALL NOT restrict check-ins based on it.

#### Scenario: Create a daily habit with a reminder time
- **WHEN** an authenticated user creates a habit with `reminderTime: "05:30"`
- **THEN** the system creates the habit storing `reminderTime = "05:30"`

#### Scenario: reminderTime is optional
- **WHEN** an authenticated user creates a habit without passing `reminderTime`
- **THEN** the system creates the habit with `reminderTime = null`

#### Scenario: Reject invalid reminderTime format
- **WHEN** an authenticated user submits a `reminderTime` value that does not match `HH:MM` (e.g. `"5:3"`, `"25:00"`, `"abc"`)
- **THEN** the system rejects the request with a validation error

### Requirement: Per-habit calendar sync opt-in
Habits SHALL support a `syncToCalendar` boolean flag, defaulting to `false`. The system SHALL only publish a Google Calendar sync job for a habit create, update, or delete when `syncToCalendar` is `true` and the user has an active `GoogleCalendarLink`.

#### Scenario: Create a habit with sync enabled
- **WHEN** an authenticated user creates a habit with `syncToCalendar: true` and has an active `GoogleCalendarLink`
- **THEN** the system creates the habit and publishes a calendar sync (upsert) job

#### Scenario: Create a habit with sync disabled (default)
- **WHEN** an authenticated user creates a habit without specifying `syncToCalendar` (or with `syncToCalendar: false`)
- **THEN** the system creates the habit and does NOT publish a calendar sync job

#### Scenario: Enabling sync on an existing habit
- **WHEN** an authenticated user updates a habit from `syncToCalendar: false` to `syncToCalendar: true` and has an active `GoogleCalendarLink`
- **THEN** the system updates the habit and publishes a calendar upsert sync job

#### Scenario: Disabling sync on a previously synced habit removes the calendar event
- **WHEN** an authenticated user updates a habit from `syncToCalendar: true` to `syncToCalendar: false`, and that habit has an existing `CalendarSync` row
- **THEN** the system updates the habit and publishes a calendar delete sync job for the existing event

## MODIFIED Requirements

### Requirement: Create habit
Authenticated users SHALL be able to create a habit with a required `title` and a required `frequency` of either `daily` or `weekly`, plus optional `description`, `priority`, `weekDays` (integer array, weekly habits only), `reminderTime` (`"HH:MM"` string), and `syncToCalendar` (boolean, defaults to `false`).

#### Scenario: Create a daily or weekly habit
- **WHEN** an authenticated user creates a habit with a `title` and a `frequency` of `daily` or `weekly`
- **THEN** the system creates the habit and associates it with the user

#### Scenario: Reject unsupported frequency value
- **WHEN** a user attempts to create or update a habit with a `frequency` other than `daily` or `weekly`
- **THEN** the system rejects the request with a validation error
