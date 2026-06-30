-- CreateTable
CREATE TABLE "BrowsingDailyStat" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "duration" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrowsingDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrowsingDailyStat_userId_date_idx" ON "BrowsingDailyStat"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BrowsingDailyStat_userId_domain_date_key" ON "BrowsingDailyStat"("userId", "domain", "date");
