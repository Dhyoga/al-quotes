## 1. Pusher publish helper

- [x] 1.1 Add `publishCommentEvent(userId, event, payload)` to `lib/pusher.ts`, reusing the existing `publish()` helper against `private-user-{userId}` (mirrors `publishTaskEvent`/`publishHabitEvent`)

## 2. Comments repository

- [x] 2.1 Create `lib/comments-repository.ts` with `listCommentsForTask`, `createComment`, `updateComment`, `deleteComment`
- [x] 2.2 `createComment(taskId, body)` creates the comment via Prisma, then publishes `comment.created` with the full comment record
- [x] 2.3 `updateComment(taskId, commentId, body)` updates via Prisma, then publishes `comment.updated` with the full updated comment record
- [x] 2.4 `deleteComment(userId, taskId, commentId)` deletes via Prisma, then publishes `comment.deleted` with `{ id: commentId, taskId }`
- [x] 2.5 Each repository function takes `userId` where needed to resolve the publish target without re-querying the task in the repository layer

## 3. Route handlers

- [x] 3.1 Update `POST /tasks/:id/comments` in `routes/tasks.ts` to call `createComment` instead of `prisma.comment.create`
- [x] 3.2 Update `GET /tasks/:id/comments` to call `listCommentsForTask` instead of `prisma.comment.findMany`
- [x] 3.3 Update `PATCH /tasks/:id/comments/:commentId` to call `updateComment` instead of `prisma.comment.update`
- [x] 3.4 Update `DELETE /tasks/:id/comments/:commentId` to call `deleteComment` instead of `prisma.comment.delete`
- [x] 3.5 Keep existing ownership checks (`findTaskForUser`, `prisma.comment.findFirst` existence checks) in the route layer, unchanged

## 4. Verification

- [ ] 4.1 Manually verify (e.g. via Pusher debug console or a temporary subscriber script) that creating, editing, and deleting a comment emits `comment.created`/`comment.updated`/`comment.deleted` on `private-user-{userId}`
- [x] 4.2 Confirm `comment.deleted` payload includes `taskId` (verified by code review — `comments-repository.ts`'s `deleteComment` publishes `{ id: commentId, taskId }`)
- [x] 4.3 Confirm existing comment CRUD behavior (status codes, response bodies, 404s) is unchanged (verified by code review — route handlers keep the same status codes, ownership/existence checks, and response bodies)
