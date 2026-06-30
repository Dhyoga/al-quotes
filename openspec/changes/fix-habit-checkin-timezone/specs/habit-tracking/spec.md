## MODIFIED Requirements

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
