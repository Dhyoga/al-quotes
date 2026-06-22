# habit-tracking Specification

## Purpose
TBD - created by archiving change add-kanban-habit-tracker. Update Purpose after archive.
## Requirements
### Requirement: Create habit
Authenticated users SHALL be able to create a habit with a required `title` and a required `frequency` of either `daily` or `weekly`, plus optional `description` and `priority`.

#### Scenario: Create a daily or weekly habit
- **WHEN** an authenticated user creates a habit with a `title` and a `frequency` of `daily` or `weekly`
- **THEN** the system creates the habit and associates it with the user

#### Scenario: Reject unsupported frequency value
- **WHEN** a user attempts to create or update a habit with a `frequency` other than `daily` or `weekly`
- **THEN** the system rejects the request with a validation error

### Requirement: Sparse check-in log
Habit completions SHALL be recorded as a check-in row keyed by `periodStart`, with no row created for periods that were not completed.

#### Scenario: Check in a daily habit
- **WHEN** a user checks in a daily habit for today
- **THEN** the system creates a check-in row with `periodStart` equal to today's date and `completed` true

#### Scenario: Check in a weekly habit
- **WHEN** a user checks in a weekly habit during the current week
- **THEN** the system creates a check-in row with `periodStart` equal to the start of the current ISO week and `completed` true

#### Scenario: Duplicate check-in for the same period does not create a second row
- **WHEN** a user attempts to check in a habit for a period that already has a check-in row
- **THEN** the system does not create a duplicate row for that habit and period

### Requirement: No automatic backfill of missed periods
The system SHALL NOT create check-in rows for periods that elapse without the user checking in.

#### Scenario: Missed period leaves no row
- **WHEN** a period elapses without the user checking in the habit
- **THEN** the system does not create any check-in row for that period

