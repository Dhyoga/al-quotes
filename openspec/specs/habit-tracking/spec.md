# habit-tracking Specification

## Purpose
TBD - created by archiving change add-kanban-habit-tracker. Update Purpose after archive.
## Requirements
### Requirement: Create habit
Authenticated users SHALL be able to create a habit with a required `title` and a required `frequency` of either `daily` or `weekly`, plus optional `description`, `priority`, `weekDays` (integer array, weekly habits only), `reminderTime` (`"HH:MM"` string), and `syncToCalendar` (boolean, defaults to `false`).

#### Scenario: Create a daily or weekly habit
- **WHEN** an authenticated user creates a habit with a `title` and a `frequency` of `daily` or `weekly`
- **THEN** the system creates the habit and associates it with the user

#### Scenario: Reject unsupported frequency value
- **WHEN** a user attempts to create or update a habit with a `frequency` other than `daily` or `weekly`
- **THEN** the system rejects the request with a validation error

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

### Requirement: Sparse check-in log
Habit completions SHALL be recorded as a check-in row keyed by `periodStart`. The `periodStart` for a daily habit SHALL be derived from the client-supplied `date` field (a `YYYY-MM-DD` string representing the user's local calendar date) when provided; it SHALL fall back to the server's current UTC date when no `date` is supplied. No row is created for periods that were not completed.

#### Scenario: Check in a daily habit with a client date
- **WHEN** a user checks in a daily habit with `{ date: "2026-06-30" }` in the request body
- **THEN** the system creates a check-in row with `periodStart` equal to `2026-06-30T00:00:00.000Z`

#### Scenario: Check in a daily habit without a client date (fallback)
- **WHEN** a user checks in a daily habit without supplying a `date` field
- **THEN** the system creates a check-in row with `periodStart` equal to the current UTC calendar date at midnight, preserving existing behaviour for API and MCP callers

#### Scenario: Check in a weekly habit
- **WHEN** a user checks in a weekly habit during the current week
- **THEN** the system creates a check-in row with `periodStart` equal to the start of the current ISO week and `completed` true

#### Scenario: Duplicate check-in for the same period does not create a second row
- **WHEN** a user attempts to check in a habit for a period that already has a check-in row
- **THEN** the system does not create a duplicate row for that habit and period

#### Scenario: Reject an invalid date string
- **WHEN** a user supplies a `date` field that is not a valid `YYYY-MM-DD` calendar date (e.g. `"2026-13-01"`, `"not-a-date"`, `"2026-6-30"`)
- **THEN** the system rejects the request with a 400 validation error and does not create a check-in row

### Requirement: No automatic backfill of missed periods
The system SHALL NOT create check-in rows for periods that elapse without the user checking in.

#### Scenario: Missed period leaves no row
- **WHEN** a period elapses without the user checking in the habit
- **THEN** the system does not create any check-in row for that period

