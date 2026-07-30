// Standard 30-juz division boundaries of the Uthmani mushaf (Madinah Mushaf layout).
// Each entry is the first surah/ayah of that juz. Source: the well-known, widely
// published juz boundary table used by quran.com and standard printed mushaf indices.
type JuzBoundary = { juz: number; surahNumber: number; ayahNumber: number };

const JUZ_BOUNDARIES: JuzBoundary[] = [
  { juz: 1, surahNumber: 1, ayahNumber: 1 },
  { juz: 2, surahNumber: 2, ayahNumber: 142 },
  { juz: 3, surahNumber: 2, ayahNumber: 253 },
  { juz: 4, surahNumber: 3, ayahNumber: 92 },
  { juz: 5, surahNumber: 4, ayahNumber: 24 },
  { juz: 6, surahNumber: 4, ayahNumber: 148 },
  { juz: 7, surahNumber: 5, ayahNumber: 82 },
  { juz: 8, surahNumber: 6, ayahNumber: 111 },
  { juz: 9, surahNumber: 7, ayahNumber: 88 },
  { juz: 10, surahNumber: 8, ayahNumber: 41 },
  { juz: 11, surahNumber: 9, ayahNumber: 93 },
  { juz: 12, surahNumber: 11, ayahNumber: 6 },
  { juz: 13, surahNumber: 12, ayahNumber: 53 },
  { juz: 14, surahNumber: 15, ayahNumber: 1 },
  { juz: 15, surahNumber: 17, ayahNumber: 1 },
  { juz: 16, surahNumber: 18, ayahNumber: 75 },
  { juz: 17, surahNumber: 21, ayahNumber: 1 },
  { juz: 18, surahNumber: 23, ayahNumber: 1 },
  { juz: 19, surahNumber: 25, ayahNumber: 21 },
  { juz: 20, surahNumber: 27, ayahNumber: 56 },
  { juz: 21, surahNumber: 29, ayahNumber: 46 },
  { juz: 22, surahNumber: 33, ayahNumber: 31 },
  { juz: 23, surahNumber: 36, ayahNumber: 28 },
  { juz: 24, surahNumber: 39, ayahNumber: 32 },
  { juz: 25, surahNumber: 40, ayahNumber: 41 },
  { juz: 26, surahNumber: 46, ayahNumber: 1 },
  { juz: 27, surahNumber: 51, ayahNumber: 31 },
  { juz: 28, surahNumber: 58, ayahNumber: 1 },
  { juz: 29, surahNumber: 67, ayahNumber: 1 },
  { juz: 30, surahNumber: 78, ayahNumber: 1 },
];

// Finds the juz (1-30) containing the given surah/ayah position, by locating the
// largest juz boundary whose (surahNumber, ayahNumber) is <= the given position.
const getJuzForPosition = (surahNumber: number, ayahNumber: number): number => {
  let result = JUZ_BOUNDARIES[0].juz;

  for (const boundary of JUZ_BOUNDARIES) {
    const boundaryIsBeforeOrAtPosition =
      boundary.surahNumber < surahNumber ||
      (boundary.surahNumber === surahNumber && boundary.ayahNumber <= ayahNumber);

    if (boundaryIsBeforeOrAtPosition) {
      result = boundary.juz;
    } else {
      break;
    }
  }

  return result;
};

export { JUZ_BOUNDARIES, getJuzForPosition };
