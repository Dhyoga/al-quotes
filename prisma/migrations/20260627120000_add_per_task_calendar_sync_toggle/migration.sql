-- AlterTable
ALTER TABLE "Task" ADD COLUMN "syncToCalendar" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: tasks that already have a calendar event keep syncing so they
-- don't silently go stale; everything else starts opted out.
UPDATE "Task"
SET "syncToCalendar" = true
WHERE EXISTS (
    SELECT 1 FROM "CalendarSync"
    WHERE "CalendarSync"."entityType" = 'task'
    AND "CalendarSync"."entityId" = "Task"."id"
);
