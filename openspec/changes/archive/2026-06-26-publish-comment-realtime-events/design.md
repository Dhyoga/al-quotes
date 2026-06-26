## Context

`routes/tasks.ts` already exposes full CRUD for `Comment` (`POST`/`GET`/`PATCH`/`DELETE /tasks/:id/comments`), but the handlers call `prisma.comment.*` directly rather than going through a repository. Task and Habit mutations, by contrast, always go through `tasks-repository.ts` / `habits-repository.ts`, which call `publishTaskEvent`/`publishHabitEvent` (`lib/pusher.ts`) after every successful write, broadcasting on the user's `private-user-{userId}` channel. Comments never publish anything today.

remindeen's Kanban board already subscribes to this same private channel for `task.*` and `habit.*` events via a refcounted shared Pusher connection (`acquirePrivateChannel`/`releasePrivateChannel`). A new task-comment thread UI in remindeen needs `comment.*` events on that same channel to stay in sync without polling.

## Goals / Non-Goals

**Goals:**
- Route all Comment writes through a new `comments-repository.ts`, matching the established single-write-path pattern.
- Publish `comment.created`, `comment.updated`, `comment.deleted` on the existing `private-user-{userId}` channel after every successful mutation.
- Keep publish failures non-fatal, consistent with the existing rule that a Pusher outage never fails the underlying request.

**Non-Goals:**
- No new Pusher channel or per-task channel — comments reuse the existing per-user channel.
- No change to the Comment data model or the REST API's request/response shapes.
- No MCP tool for comments (out of scope; comments are REST-only today, unlike Task/Habit which also have MCP tools).

## Decisions

**Reuse the per-user channel, not a per-task channel.**
Alternative considered: a `private-task-{taskId}` channel scoped to one task. Rejected because it would require a second channel-auth check (verifying the task belongs to the requesting user) and a second subscription lifecycle in the client, for no real benefit — the existing per-user channel already carries multiple event families (`task.*`, `habit.*`) and the client already knows how to filter by id. Comments just add a third event family on the same channel, filtered client-side by `taskId`.

**`comment.deleted` carries `{ id, taskId }`, not just `{ id }`.**
`task.deleted` only needs `{ id }` because the client's task list is keyed by task id directly. A comment list, however, is scoped *within* an open task's thread — the client only knows "remove comment X if I currently have its parent task's thread open." Without `taskId` in the payload, the client would have to keep a full id→taskId map just to decide whether to act on the event. Including `taskId` makes the event self-sufficient, matching `comment.created`/`comment.updated`, which already carry it as part of the full comment record.

**New `comments-repository.ts` mirrors `tasks-repository.ts`'s shape**: one function per mutation (`createComment`, `updateComment`, `deleteComment`, plus a `listCommentsForTask` read), each calling Prisma then `publishCommentEvent`. `routes/tasks.ts`'s comment handlers become thin: validate input, call the repository function, return its result. This keeps ownership checks (task belongs to `req.userId`) in the route layer, same as the existing Task handlers do via `findTaskForUser` before any mutation.

**`publishCommentEvent` reuses `lib/pusher.ts`'s existing `publish()` helper** rather than introducing a new file or pattern — same as `publishTaskEvent`/`publishHabitEvent`, it's a thin wrapper that calls `publish(`private-user-${userId}`, event, payload)`.

## Risks / Trade-offs

- **[Risk]** Forgetting to pass `taskId` through on the delete path (the route currently only has `commentId` in scope after the Prisma delete) → **Mitigation**: `deleteComment(userId, taskId, commentId)` takes `taskId` as an explicit parameter (the route already has it from the URL param) and includes it in the published payload regardless of what Prisma's delete result returns.
- **[Risk]** Client-side filtering by `taskId` on a per-user channel means every open modal receives (and discards) comment events for the user's *other* tasks too → **Mitigation**: acceptable; existing `task.*`/`habit.*` events already do this and event volume per user is low (single-user system, no high-frequency comment activity expected).

## Migration Plan

No data migration needed — no schema change. Deploy is a single backend release: ship `comments-repository.ts`, update `routes/tasks.ts` to use it, and the new events start flowing immediately. No rollback concerns beyond a normal revert; existing comment CRUD behavior (status codes, response bodies) is unchanged, so old API clients without realtime support are unaffected.
