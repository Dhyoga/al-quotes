-- CreateTable
CREATE TABLE "QuranProgress" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "juzCompleted" INTEGER NOT NULL DEFAULT 0,
    "pagesInCurrentJuz" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuranProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuranProgress_userId_key" ON "QuranProgress"("userId");
