# google-calendar-sync Specification

## Purpose
TBD - created by archiving change add-google-calendar-sync. Update Purpose after archive.

## Requirements

### Requirement: Connecting a Google Calendar
The system SHALL allow an authenticated user to link their Google Calendar by submitting a Google refresh token obtained through a `calendar.events`-scoped OAuth consent, and SHALL store at most one active link per user.

#### Scenario: Connecting for the first time
- **WHEN** an authenticated user calls `POST /auth/google-calendar` with a valid Google refresh token
- **THEN** the system creates a `GoogleCalendarLink` for that user with `calendarId` defaulted to `"primary"`

#### Scenario: Reconnecting replaces the existing link
- **WHEN** an authenticated user who already has a `GoogleCalendarLink` calls `POST /auth/google-calendar` with a new refresh token
- **THEN** the system replaces the stored refresh token for that user rather than creating a second link

#### Scenario: Disconnecting
- **WHEN** an authenticated user calls `DELETE /auth/google-calendar`
- **THEN** the system removes (or marks revoked) that user's `GoogleCalendarLink`, and subsequent Task/Habit mutations for that user no longer trigger calendar sync

### Requirement: Querying calendar connection status
The system SHALL let an authenticated user check whether they currently have an active calendar link, without requiring the caller to remember that state locally.

#### Scenario: Status for a connected user
- **WHEN** an authenticated user with an active `GoogleCalendarLink` calls `GET /auth/google-calendar`
- **THEN** the system responds indicating the user is connected

#### Scenario: Status for a user with no link
- **WHEN** an authenticated user with no `GoogleCalendarLink` calls `GET /auth/google-calendar`
- **THEN** the system responds indicating the user is not connected

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

#### Scenario: Calendar sync failure does not affect the underlying mutation
- **WHEN** publishing a sync job fails (e.g. the queue is unreachable)
- **THEN** the Task or Habit mutation still succeeds and the error is only logged, not surfaced to the caller

### Requirement: Habits sync as a single recurring event
The system SHALL represent a Habit as one recurring Calendar event using an RRULE derived from its frequency, rather than one event per check-in period.

#### Scenario: Daily habit produces a daily RRULE
- **WHEN** the system publishes a sync job for a Habit with `frequency: "daily"`
- **THEN** the payload's `habit.rrule` field is `"RRULE:FREQ=DAILY"`

#### Scenario: Weekly habit produces a weekly RRULE
- **WHEN** the system publishes a sync job for a Habit with `frequency: "weekly"`
- **THEN** the payload's `habit.rrule` field is `"RRULE:FREQ=WEEKLY"`

### Requirement: Sync jobs are delivered through a durable queue
The system SHALL publish outbound sync jobs through Upstash QStash rather than calling the n8n webhook directly, so delivery is retried if the webhook is temporarily unreachable.

#### Scenario: Publish call enqueues rather than calls n8n directly
- **WHEN** the system publishes a sync job
- **THEN** it calls QStash's publish API targeting the configured n8n webhook URL, and does not make an HTTP request to that URL itself

### Requirement: n8n callback authentication
The system SHALL authenticate inbound requests to `POST /webhooks/n8n/calendar-sync` using a shared secret header, compared in constant time, and SHALL reject requests that do not present a valid secret. This authentication strategy SHALL be independent of the JWT and API-key strategies used for user-acting requests.

#### Scenario: Valid shared secret is accepted
- **WHEN** a request to `POST /webhooks/n8n/calendar-sync` includes the correct `X-Webhook-Secret` header value
- **THEN** the system processes the request

#### Scenario: Missing or incorrect shared secret is rejected
- **WHEN** a request to `POST /webhooks/n8n/calendar-sync` is missing the `X-Webhook-Secret` header or includes an incorrect value
- **THEN** the system responds with `401 Unauthorized` and does not process the request

#### Scenario: A valid Supabase JWT or API key alone does not grant access to the callback route
- **WHEN** a request to `POST /webhooks/n8n/calendar-sync` includes a valid Supabase JWT or API key but no valid `X-Webhook-Secret` header
- **THEN** the system responds with `401 Unauthorized`

### Requirement: Calendar sync linkage is recorded from the n8n callback
The system SHALL update the `CalendarSync` mapping for an entity only in response to an authenticated callback from n8n, never directly from the original Task/Habit mutation.

#### Scenario: Linking after a successful create or update
- **WHEN** an authenticated callback reports `{ action: "linked", entityType, entityId, googleEventId }`
- **THEN** the system upserts a `CalendarSync` row for that `(entityType, entityId)` with the given `googleEventId`

#### Scenario: Unlinking after a successful delete
- **WHEN** an authenticated callback reports `{ action: "unlinked", entityType, entityId }`
- **THEN** the system removes any `CalendarSync` row for that `(entityType, entityId)`

#### Scenario: Redundant unlink callback is not an error
- **WHEN** an authenticated callback reports `{ action: "unlinked", ... }` for an entity with no existing `CalendarSync` row
- **THEN** the system responds successfully without error

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
