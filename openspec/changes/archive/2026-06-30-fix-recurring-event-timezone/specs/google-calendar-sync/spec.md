## ADDED Requirements

### Requirement: Recurring syncs expand in the entity's UTC-offset frame
The system SHALL derive the Google Calendar `timeZone` sent for a synced Task, Event, or Habit from the UTC offset embedded in its resolved start `dateTime`, rather than a hardcoded zone, so that `RRULE` expansion (in particular `BYDAY`) occurs in the same frame as the entity's actual local start time.

#### Scenario: Whole-hour positive offset maps to the matching Etc/GMT zone
- **WHEN** the system publishes a sync job whose resolved start `dateTime` carries a `+07:00` offset
- **THEN** the Google Calendar API request's `start.timeZone` (and `end.timeZone`) is `"Etc/GMT-7"`, not `"UTC"`

#### Scenario: A recurring weekly event no longer shifts day across the UTC offset boundary
- **WHEN** a user creates a weekly recurring Event with `BYDAY=FR` whose local start time-of-day is earlier than their UTC offset (e.g. 06:00 in a UTC+7 zone)
- **THEN** the generated Google Calendar occurrences fall on Friday in the user's local zone, not on the following Saturday

#### Scenario: Zero offset maps to UTC
- **WHEN** the system publishes a sync job whose resolved start `dateTime` carries a `Z` or `+00:00` offset
- **THEN** the Google Calendar API request's `start.timeZone` is `"Etc/UTC"`

#### Scenario: Non-whole-hour offsets fall back to UTC
- **WHEN** the system publishes a sync job whose resolved start `dateTime` carries an offset with a non-zero minute component (e.g. `+05:30`)
- **THEN** the Google Calendar API request's `start.timeZone` falls back to `"UTC"`, matching prior behavior for that case

#### Scenario: The fix applies uniformly across entity types
- **WHEN** the system publishes a sync job for a Task, an Event, or a Habit, each with a recurring `rrule`
- **THEN** the same offset-derived `timeZone` resolution applies to all three, without per-entity-type duplication of the offset-to-zone logic
