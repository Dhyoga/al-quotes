-- CreateEnum
CREATE TYPE "BrainDumpTheme" AS ENUM ('ide', 'kerja', 'pribadi', 'dakwah');

-- CreateTable
CREATE TABLE "BrainDumpNote" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" "BrainDumpTheme" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainDumpNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrainDumpNote_userId_idx" ON "BrainDumpNote"("userId");
