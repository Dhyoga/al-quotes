import type { QuranProgress } from '@prisma/client';
import prisma from './prisma.js';
import { publishQuranProgressEvent } from './pusher.js';

const PAGES_PER_JUZ = 20;
const TOTAL_JUZ = 30;

const getOrCreateForUser = (userId: string) =>
  prisma.quranProgress.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

// Locks the row for the duration of the transaction so concurrent taps can't
// read the same stale pagesInCurrentJuz and both compute the same rollover.
const incrementPage = async (userId: string) => {
  await getOrCreateForUser(userId);

  const updated = await prisma.$transaction(async (tx) => {
    const [current] = await tx.$queryRaw<QuranProgress[]>`
      SELECT * FROM "QuranProgress" WHERE "userId" = ${userId} FOR UPDATE
    `;

    let { juzCompleted, pagesInCurrentJuz } = current;
    if (juzCompleted < TOTAL_JUZ) {
      pagesInCurrentJuz += 1;
      if (pagesInCurrentJuz >= PAGES_PER_JUZ) {
        pagesInCurrentJuz = 0;
        juzCompleted += 1;
      }
    }

    return tx.quranProgress.update({
      where: { userId },
      data: { juzCompleted, pagesInCurrentJuz },
    });
  });

  publishQuranProgressEvent(userId, 'quranProgress.updated', updated);
  return updated;
};

export { getOrCreateForUser, incrementPage };
