## 1. Prisma Schema & Migration

- [ ] 1.1 Add `event` to the `CalendarEntityType` enum in `prisma/schema.prisma`
- [ ] 1.2 Add the `Event` model to `prisma/schema.prisma`:
  ```
  model Event {
    id             Int      @id @default(autoincrement())
    userId         String
    title          String
    description    String?
    location       String?
    startAt        String
    endAt          String?
    isRecurring    Boolean  @default(false)
    rrule          String?
    syncToCalendar Boolean  @default(true)
    createdAt      DateTime @default(now())
    updatedAt      DateTime @updatedAt
    @@index([userId])
    @@index([userId, startAt])
  }
  ```
- [ ] 1.3 Run `prisma migrate dev --name event-feature` to generate and apply the migration
- [ ] 1.4 Run `prisma generate` to regenerate the Prisma client

## 2. Pusher: publishEventEvent

- [ ] 2.1 Add `publishEventEvent(userId: string, event: string, payload: unknown): void` to `lib/pusher.ts`, following the same fire-and-forget pattern as `publishHabitEvent`
- [ ] 2.2 Export `publishEventEvent` from `lib/pusher.ts`

## 3. Events Repository

- [ ] 3.1 Create `lib/events-repository.ts`
- [ ] 3.2 Implement `listEventsForUser(userId: string)`: returns all events for the user ordered by `startAt` ascending
- [ ] 3.3 Implement `findEventForUser(userId: string, id: number)`: returns the event if it belongs to the user, else `null`
- [ ] 3.4 Implement `createEvent(userId, data)`: creates the event, calls `publishEventEvent(..., 'event.created', event)`, and calls `syncEventToCalendar` if `syncToCalendar` is `true`
- [ ] 3.5 Implement `updateEvent(userId, id, data)`: updates the event, calls `publishEventEvent(..., 'event.updated', event)`, and calls `syncEventToCalendar` if `syncToCalendar` is `true`
- [ ] 3.6 Implement `deleteEvent(userId, id)`: snapshots `CalendarSync` row, deletes the event, calls `publishEventEvent(..., 'event.deleted', { id })`, and calls `syncDelete` if a sync row existed
- [ ] 3.7 Implement `toCalendarPayload(event)` and `syncEventToCalendar(userId, event)` helpers (fire-and-forget `syncUpsert` call)

## 4. Events Routes

- [ ] 4.1 Create `routes/events.ts` with an Express router, `requireJwt` middleware applied to all routes
- [ ] 4.2 `POST /`: validate `title` (required), `startAt` (required), `isRecurring`/`rrule` consistency (rrule required when isRecurring is true); call `createEvent`; respond 201
- [ ] 4.3 `GET /`: call `listEventsForUser`; respond 200 with array
- [ ] 4.4 `GET /:id`: call `findEventForUser`; respond 200 or 404
- [ ] 4.5 `PATCH /:id`: verify ownership via `findEventForUser` (404 if not found); build partial update object; call `updateEvent`; respond 200
- [ ] 4.6 `DELETE /:id`: verify ownership via `findEventForUser` (404 if not found); call `deleteEvent`; respond 204

## 5. Server Wiring

- [ ] 5.1 Import `eventsRoutes` from `./routes/events.js` in `server.ts`
- [ ] 5.2 Mount at `app.use('/events', eventsRoutes)`

## 6. Manual Testing

- [ ] 6.1 Create a one-time event via `POST /events` → confirm 201 and correct fields returned
- [ ] 6.2 Create a recurring event with `isRecurring: true` and a valid RRULE → confirm stored correctly
- [ ] 6.3 Create an event without `title` or without `startAt` → confirm 400
- [ ] 6.4 Create a recurring event without `rrule` → confirm 400
- [ ] 6.5 `GET /events` returns only the authenticated user's events
- [ ] 6.6 `PATCH /events/:id` updates a field; `GET /events/:id` reflects the change
- [ ] 6.7 `DELETE /events/:id` responds 204; subsequent `GET /events/:id` returns 404
- [ ] 6.8 With Google Calendar connected and `syncToCalendar: true`, create an event → confirm a calendar upsert job is published (check QStash logs or n8n)
- [ ] 6.9 Delete a synced event → confirm a calendar delete job is published
- [ ] 6.10 Accessing another user's event returns 404
