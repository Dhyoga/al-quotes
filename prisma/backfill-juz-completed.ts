// One-off backfill: recompute juzCompleted/pagesInCurrentJuz for existing QuranProgress
// rows from their stored currentSurahId/currentAyahNumber, using the standard mushaf
// juz boundaries. Run with: npx tsx prisma/backfill-juz-completed.ts
import 'dotenv/config';
import prisma from '../lib/prisma.js';
import { getJuzForPosition } from '../lib/juz-boundaries.js';

const run = async () => {
  const rows = await prisma.quranProgress.findMany({
    where: { currentSurahId: { not: null } },
    include: { currentSurah: true },
  });

  let updatedCount = 0;

  for (const row of rows) {
    if (!row.currentSurah || row.currentAyahNumber == null) continue;

    const juz = getJuzForPosition(row.currentSurah.number, row.currentAyahNumber);
    const newJuzCompleted = juz - 1;
    const newPagesInCurrentJuz = 0;

    if (row.juzCompleted === newJuzCompleted && row.pagesInCurrentJuz === newPagesInCurrentJuz) {
      continue;
    }

    console.log(
      `row id=${row.id} userId=${row.userId} surah=${row.currentSurah.number} ayah=${row.currentAyahNumber}: ` +
        `juzCompleted ${row.juzCompleted} -> ${newJuzCompleted}, pagesInCurrentJuz ${row.pagesInCurrentJuz} -> ${newPagesInCurrentJuz}`
    );

    await prisma.quranProgress.update({
      where: { id: row.id },
      data: { juzCompleted: newJuzCompleted, pagesInCurrentJuz: newPagesInCurrentJuz },
    });
    updatedCount += 1;
  }

  console.log(`Backfill complete. ${updatedCount}/${rows.length} row(s) updated.`);
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
