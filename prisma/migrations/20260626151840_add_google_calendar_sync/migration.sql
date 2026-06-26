-- CreateEnum
CREATE TYPE "CalendarEntityType" AS ENUM ('task', 'habit');

-- CreateTable
CREATE TABLE "GoogleCalendarLink" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "GoogleCalendarLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSync" (
    "id" SERIAL NOT NULL,
    "entityType" "CalendarEntityType" NOT NULL,
    "entityId" INTEGER NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarLink_userId_key" ON "GoogleCalendarLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSync_entityType_entityId_key" ON "CalendarSync"("entityType", "entityId");
