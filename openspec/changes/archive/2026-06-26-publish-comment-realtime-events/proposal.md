## Why

Task comments (CRUD via `/tasks/:id/comments`) already work, but the route handlers write directly through Prisma instead of a repository, so comment mutations never publish a realtime event the way Task and Habit mutations do. The remindeen extension is adding a Kanban comment thread UI and needs `comment.created`/`comment.updated`/`comment.deleted` events on the existing private channel to keep an open task's comment thread in sync across devices/tabs without polling.

## What Changes

- Add `comments-repository.ts` (mirroring `tasks-repository.ts`) and route all comment create/update/delete through it instead of calling `prisma.comment.*` directly in `routes/tasks.ts`.
- Publish `comment.created`, `comment.updated`, and `comment.deleted` events to the owner's `private-user-{userId}` channel on every successful comment mutation, reusing the existing Pusher publish mechanism in `lib/pusher.ts`.
- `comment.deleted` payload SHALL include `taskId` alongside `id` (unlike `task.deleted`, which only needs `id`) — the channel is per-user, not per-task, so a subscriber needs `taskId` to know whether a deleted comment belongs to the task thread it currently has open.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `realtime-sync`: add a requirement that Comment mutations publish realtime events (`comment.created`, `comment.updated`, `comment.deleted`) to the owner's private channel; extend the existing "single write path" requirement to cover `comments-repository.ts` alongside `tasks-repository.ts`/`habits-repository.ts`.
- `kanban-tasks`: extend the existing "Comments on tasks" requirement with scenarios confirming each comment mutation publishes its corresponding realtime event.

## Impact

- `al-quotes/routes/tasks.ts`: comment handlers (`POST`/`GET`/`PATCH`/`DELETE` on `/tasks/:id/comments`) call the new repository instead of Prisma directly.
- `al-quotes/lib/comments-repository.ts`: new file, owns Comment writes and publishes events.
- `al-quotes/lib/pusher.ts`: add a `publishCommentEvent` export (or reuse the existing `publish` helper) for the new event names.
- No schema change — the `Comment` model already exists.
- Downstream dependency: a sibling change in the `remindeen` repo's own OpenSpec instance will subscribe to these new `comment.*` events from its Kanban task-comment UI. That change should land after (or alongside) this one, since it depends on these event names and payload shapes.
