# events Specification

## Purpose
Calendar events owned by a user, with optional location, recurrence, and Google Calendar sync.

## Requirements

### Requirement: Create an event
Authenticated users SHALL be able to create an event with a required `title`, a required `startAt` (ISO 8601 string with timezone offset), and optional `description`, `location`, `endAt` (same format), `isRecurring` (boolean, default `false`), `rrule` (iCal RRULE string, required when `isRecurring` is `true`), and `syncToCalendar` (boolean, default `true`).

#### Scenario: Create a one-time event
- **WHEN** an authenticated user creates an event with a `title` and `startAt` of `"2026-07-04T09:00:00+07:00"`
- **THEN** the system creates the event associated with that user and returns the created event

#### Scenario: Create a recurring event
- **WHEN** an authenticated user creates an event with `isRecurring: true` and `rrule: "RRULE:FREQ=WEEKLY;BYDAY=FR"`
- **THEN** the system creates the event storing both `isRecurring` and `rrule`

#### Scenario: Title is required
- **WHEN** an authenticated user attempts to create an event without a `title`
- **THEN** the system rejects the request with a 400 validation error

#### Scenario: startAt is required
- **WHEN** an authenticated user attempts to create an event without a `startAt`
- **THEN** the system rejects the request with a 400 validation error

#### Scenario: rrule is required when isRecurring is true
- **WHEN** an authenticated user creates an event with `isRecurring: true` but no `rrule`
- **THEN** the system rejects the request with a 400 validation error

### Requirement: List events for the authenticated user
Authenticated users SHALL be able to retrieve all their events via `GET /events`. The response SHALL include all events owned by the user, ordered by `startAt` ascending.

#### Scenario: Listing returns only the user's own events
- **WHEN** an authenticated user calls `GET /events`
- **THEN** the system returns all events associated with that user's id and none belonging to other users

#### Scenario: Empty list when no events exist
- **WHEN** an authenticated user with no events calls `GET /events`
- **THEN** the system returns an empty array

### Requirement: Get a single event
Authenticated users SHALL be able to retrieve one of their events by id via `GET /events/:id`.

#### Scenario: Get an event by id
- **WHEN** an authenticated user calls `GET /events/:id` for an event they own
- **THEN** the system returns that event

#### Scenario: Returns 404 for events owned by another user
- **WHEN** an authenticated user calls `GET /events/:id` for an event that belongs to a different user
- **THEN** the system responds with 404

### Requirement: Update an event
Authenticated users SHALL be able to update any subset of an event's mutable fields (`title`, `description`, `location`, `startAt`, `endAt`, `isRecurring`, `rrule`, `syncToCalendar`) via `PATCH /events/:id`. For recurring events, the update applies to the full series.

#### Scenario: Updating a field
- **WHEN** an authenticated user sends `PATCH /events/:id` with `{ "title": "New Title" }`
- **THEN** the system updates that field and returns the updated event

#### Scenario: Returns 404 for events owned by another user
- **WHEN** an authenticated user attempts to update an event that belongs to a different user
- **THEN** the system responds with 404 and does not modify the event

#### Scenario: Recurring event update applies to the full series
- **WHEN** an authenticated user updates a recurring event's title
- **THEN** the system updates the series master record; there is no mechanism to update a single occurrence

### Requirement: Delete an event
Authenticated users SHALL be able to permanently delete one of their events via `DELETE /events/:id`. For recurring events, the deletion removes the full series.

#### Scenario: Deleting an event removes it
- **WHEN** an authenticated user calls `DELETE /events/:id` for an event they own
- **THEN** the system deletes the event and responds with 204

#### Scenario: Returns 404 for events owned by another user
- **WHEN** an authenticated user attempts to delete an event that belongs to a different user
- **THEN** the system responds with 404 and does not delete the event

### Requirement: Real-time event notifications
The system SHALL publish a real-time event on the owning user's private Pusher channel for every event create, update, and delete, following the same fire-and-forget pattern used by habits and tasks.

#### Scenario: Creating an event publishes a real-time notification
- **WHEN** an authenticated user creates an event
- **THEN** the system publishes an `event.created` message on that user's private channel

#### Scenario: Updating an event publishes a real-time notification
- **WHEN** an authenticated user updates an event
- **THEN** the system publishes an `event.updated` message on that user's private channel

#### Scenario: Deleting an event publishes a real-time notification
- **WHEN** an authenticated user deletes an event
- **THEN** the system publishes an `event.deleted` message on that user's private channel

### Requirement: Google Calendar sync for events
When `syncToCalendar` is `true` and the user has an active `GoogleCalendarLink`, the system SHALL publish a calendar sync job on event create and update. On event delete, if a `CalendarSync` row exists for the event, the system SHALL publish a delete sync job. Sync operations are fire-and-forget and SHALL NOT cause the CRUD mutation to fail.

#### Scenario: Creating a synced event publishes a calendar upsert job
- **WHEN** an authenticated user with an active `GoogleCalendarLink` creates an event with `syncToCalendar: true`
- **THEN** the system publishes an `event.upserted` calendar sync job

#### Scenario: Creating an event with sync disabled does not publish a job
- **WHEN** an authenticated user creates an event with `syncToCalendar: false`
- **THEN** the system does NOT publish a calendar sync job

#### Scenario: Deleting a synced event publishes a calendar delete job
- **WHEN** an authenticated user deletes an event that has an existing `CalendarSync` row
- **THEN** the system publishes an `event.deleted` calendar sync job for that event's `googleEventId`
