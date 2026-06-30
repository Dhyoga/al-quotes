-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "reminderTime" TEXT,
ADD COLUMN     "syncToCalendar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weekDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Backfill: habits that already have a calendar event keep syncing so they
-- don't silently go stale; everything else starts opted out.
UPDATE "Habit"
SET "syncToCalendar" = true
WHERE id IN (SELECT "entityId" FROM "CalendarSync" WHERE "entityType" = 'habit');
