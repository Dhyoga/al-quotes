-- CreateEnum
CREATE TYPE "Prayer" AS ENUM ('Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha');

-- CreateTable
CREATE TABLE "PrayerCheckIn" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "prayer" "Prayer" NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "actualTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrayerCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrayerCheckIn_userId_date_idx" ON "PrayerCheckIn"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PrayerCheckIn_userId_date_prayer_key" ON "PrayerCheckIn"("userId", "date", "prayer");
