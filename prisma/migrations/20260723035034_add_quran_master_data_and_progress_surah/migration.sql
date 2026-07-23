-- AlterTable
ALTER TABLE "QuranProgress" ADD COLUMN     "currentAyahNumber" INTEGER,
ADD COLUMN     "currentSurahId" INTEGER,
ADD COLUMN     "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "quran_surah" (
    "id" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "englishName" TEXT NOT NULL,
    "numberOfAyahs" INTEGER NOT NULL,
    "revelationType" TEXT NOT NULL,

    CONSTRAINT "quran_surah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quran_ayah" (
    "id" SERIAL NOT NULL,
    "surahId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "quran_ayah_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quran_surah_number_key" ON "quran_surah"("number");

-- CreateIndex
CREATE INDEX "quran_ayah_surahId_idx" ON "quran_ayah"("surahId");

-- CreateIndex
CREATE UNIQUE INDEX "quran_ayah_surahId_number_key" ON "quran_ayah"("surahId", "number");

-- AddForeignKey
ALTER TABLE "quran_ayah" ADD CONSTRAINT "quran_ayah_surahId_fkey" FOREIGN KEY ("surahId") REFERENCES "quran_surah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuranProgress" ADD CONSTRAINT "QuranProgress_currentSurahId_fkey" FOREIGN KEY ("currentSurahId") REFERENCES "quran_surah"("id") ON DELETE SET NULL ON UPDATE CASCADE;
