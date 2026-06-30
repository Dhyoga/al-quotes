-- Backfill: approximate completedAt for tasks already DONE before the
-- completedAt column existed, using updatedAt (the closest available
-- signal — see openspec/changes/add-task-completed-at/design.md for the
-- accepted limitation of this approximation).
UPDATE "Task" SET "completedAt" = "updatedAt" WHERE "status" = 'DONE';
