## 1. Data model

- [x] 1.1 Add `syncToCalendar Boolean @default(false)` to the `Task` model in `prisma/schema.prisma`
- [x] 1.2 Generate the migration, then hand-edit the generated SQL to add the backfill statement (`syncToCalendar = true` for tasks with an existing `CalendarSync` row, `false` otherwise)
- [x] 1.3 Run the migration locally and verify backfilled values against existing `CalendarSync` rows (applied via `prisma migrate deploy`, run by the user; `prisma migrate status` confirms the schema is up to date)

## 2. Repository layer

- [x] 2.1 Extend `CreateTaskInput` and `UpdateTaskInput` in `lib/tasks-repository.ts` with `syncToCalendar?: boolean`
- [x] 2.2 Update `syncTaskToCalendar` to skip publishing when `task.syncToCalendar` is `false`
- [x] 2.3 In `updateTask`, detect a `syncToCalendar: true → false` transition (same pattern as the existing `statusTransition` diff) and call `syncDelete` with the existing `CalendarSync.googleEventId` instead of `syncUpsert`
- [x] 2.4 Verify `createTask` only syncs when both `GoogleCalendarLink` exists and the new task's `syncToCalendar` is `true`

## 3. REST API

- [x] 3.1 Accept optional `syncToCalendar` boolean in `POST /tasks` (`routes/tasks.ts`), validate it's a boolean if present
- [x] 3.2 Accept optional `syncToCalendar` boolean in `PATCH /tasks/:id`, threading it into the `Prisma.TaskUpdateInput` and the transition check from 2.3

## 4. MCP tools

- [x] 4.1 Add `syncToCalendar: z.boolean().optional()` to the `create_task` tool schema in `lib/mcp-tools.ts` and pass it through to `createTask`
- [x] 4.2 Add `syncToCalendar: z.boolean().optional()` to the `update_task` tool schema and pass it through to `updateTask`

## 5. Verification

- [ ] 5.1 Manually test: create a task with the flag off while connected to calendar → confirm no event is created
- [ ] 5.2 Manually test: turn the flag on for an existing task → confirm an event appears
- [ ] 5.3 Manually test: turn the flag off for a synced task → confirm the event is removed from Google Calendar
- [ ] 5.4 Manually test: `create_task`/`update_task` via MCP with `syncToCalendar` set, confirm same behavior as the REST path
