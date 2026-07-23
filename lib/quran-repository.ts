import prisma from './prisma.js';

const listSurahs = () => prisma.quranSurah.findMany({ orderBy: { number: 'asc' } });

const findSurahById = (id: number) => prisma.quranSurah.findUnique({ where: { id } });

const listAyahsForSurah = (surahId: number) =>
  prisma.quranAyah.findMany({ where: { surahId }, orderBy: { number: 'asc' } });

export { listSurahs, findSurahById, listAyahsForSurah };
