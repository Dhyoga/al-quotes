import 'dotenv/config';
import prisma from '../lib/prisma.js';

interface SurahSeed {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

const SURAHS: SurahSeed[] = [
  { number: 1, name: 'Al-Faatiha', englishName: 'The Opening', numberOfAyahs: 7, revelationType: 'Meccan' },
  { number: 2, name: 'Al-Baqara', englishName: 'The Cow', numberOfAyahs: 286, revelationType: 'Medinan' },
  { number: 3, name: 'Aal-i-Imraan', englishName: 'The Family of Imraan', numberOfAyahs: 200, revelationType: 'Medinan' },
  { number: 4, name: 'An-Nisaa', englishName: 'The Women', numberOfAyahs: 176, revelationType: 'Medinan' },
  { number: 5, name: 'Al-Maaida', englishName: 'The Table', numberOfAyahs: 120, revelationType: 'Medinan' },
  { number: 6, name: "Al-An'aam", englishName: 'The Cattle', numberOfAyahs: 165, revelationType: 'Meccan' },
  { number: 7, name: "Al-A'raaf", englishName: 'The Heights', numberOfAyahs: 206, revelationType: 'Meccan' },
  { number: 8, name: 'Al-Anfaal', englishName: 'The Spoils of War', numberOfAyahs: 75, revelationType: 'Medinan' },
  { number: 9, name: 'At-Tawba', englishName: 'The Repentance', numberOfAyahs: 129, revelationType: 'Medinan' },
  { number: 10, name: 'Yunus', englishName: 'Jonas', numberOfAyahs: 109, revelationType: 'Meccan' },
  { number: 11, name: 'Hud', englishName: 'Hud', numberOfAyahs: 123, revelationType: 'Meccan' },
  { number: 12, name: 'Yusuf', englishName: 'Joseph', numberOfAyahs: 111, revelationType: 'Meccan' },
  { number: 13, name: "Ar-Ra'd", englishName: 'The Thunder', numberOfAyahs: 43, revelationType: 'Medinan' },
  { number: 14, name: 'Ibrahim', englishName: 'Abraham', numberOfAyahs: 52, revelationType: 'Meccan' },
  { number: 15, name: 'Al-Hijr', englishName: 'The Rocky Tract', numberOfAyahs: 99, revelationType: 'Meccan' },
  { number: 16, name: 'An-Nahl', englishName: 'The Bee', numberOfAyahs: 128, revelationType: 'Meccan' },
  { number: 17, name: 'Al-Israa', englishName: 'The Night Journey', numberOfAyahs: 111, revelationType: 'Meccan' },
  { number: 18, name: 'Al-Kahf', englishName: 'The Cave', numberOfAyahs: 110, revelationType: 'Meccan' },
  { number: 19, name: 'Maryam', englishName: 'Mary', numberOfAyahs: 98, revelationType: 'Meccan' },
  { number: 20, name: 'Taa-Haa', englishName: 'Taa-Haa', numberOfAyahs: 135, revelationType: 'Meccan' },
  { number: 21, name: 'Al-Anbiyaa', englishName: 'The Prophets', numberOfAyahs: 112, revelationType: 'Meccan' },
  { number: 22, name: 'Al-Hajj', englishName: 'The Pilgrimage', numberOfAyahs: 78, revelationType: 'Medinan' },
  { number: 23, name: 'Al-Muminoon', englishName: 'The Believers', numberOfAyahs: 118, revelationType: 'Meccan' },
  { number: 24, name: 'An-Noor', englishName: 'The Light', numberOfAyahs: 64, revelationType: 'Medinan' },
  { number: 25, name: 'Al-Furqaan', englishName: 'The Criterion', numberOfAyahs: 77, revelationType: 'Meccan' },
  { number: 26, name: "Ash-Shu'araa", englishName: 'The Poets', numberOfAyahs: 227, revelationType: 'Meccan' },
  { number: 27, name: 'An-Naml', englishName: 'The Ant', numberOfAyahs: 93, revelationType: 'Meccan' },
  { number: 28, name: 'Al-Qasas', englishName: 'The Stories', numberOfAyahs: 88, revelationType: 'Meccan' },
  { number: 29, name: 'Al-Ankaboot', englishName: 'The Spider', numberOfAyahs: 69, revelationType: 'Meccan' },
  { number: 30, name: 'Ar-Room', englishName: 'The Romans', numberOfAyahs: 60, revelationType: 'Meccan' },
  { number: 31, name: 'Luqman', englishName: 'Luqman', numberOfAyahs: 34, revelationType: 'Meccan' },
  { number: 32, name: 'As-Sajda', englishName: 'The Prostration', numberOfAyahs: 30, revelationType: 'Meccan' },
  { number: 33, name: 'Al-Ahzaab', englishName: 'The Combined Forces', numberOfAyahs: 73, revelationType: 'Medinan' },
  { number: 34, name: 'Saba', englishName: 'Sheba', numberOfAyahs: 54, revelationType: 'Meccan' },
  { number: 35, name: 'Faatir', englishName: 'The Originator', numberOfAyahs: 45, revelationType: 'Meccan' },
  { number: 36, name: 'Yaseen', englishName: 'Yaseen', numberOfAyahs: 83, revelationType: 'Meccan' },
  { number: 37, name: 'As-Saaffaat', englishName: 'Those drawn up in Ranks', numberOfAyahs: 182, revelationType: 'Meccan' },
  { number: 38, name: 'Saad', englishName: 'The letter Saad', numberOfAyahs: 88, revelationType: 'Meccan' },
  { number: 39, name: 'Az-Zumar', englishName: 'The Groups', numberOfAyahs: 75, revelationType: 'Meccan' },
  { number: 40, name: 'Al-Ghaafir', englishName: 'The Forgiver', numberOfAyahs: 85, revelationType: 'Meccan' },
  { number: 41, name: 'Fussilat', englishName: 'Explained in Detail', numberOfAyahs: 54, revelationType: 'Meccan' },
  { number: 42, name: 'Ash-Shura', englishName: 'Consultation', numberOfAyahs: 53, revelationType: 'Meccan' },
  { number: 43, name: 'Az-Zukhruf', englishName: 'The Gold Adornments', numberOfAyahs: 89, revelationType: 'Meccan' },
  { number: 44, name: 'Ad-Dukhaan', englishName: 'The Smoke', numberOfAyahs: 59, revelationType: 'Meccan' },
  { number: 45, name: 'Al-Jaathiya', englishName: 'Crouching', numberOfAyahs: 37, revelationType: 'Meccan' },
  { number: 46, name: 'Al-Ahqaf', englishName: 'The Wind-Curved Sandhills', numberOfAyahs: 35, revelationType: 'Meccan' },
  { number: 47, name: 'Muhammad', englishName: 'Muhammad', numberOfAyahs: 38, revelationType: 'Medinan' },
  { number: 48, name: 'Al-Fath', englishName: 'The Victory', numberOfAyahs: 29, revelationType: 'Medinan' },
  { number: 49, name: 'Al-Hujuraat', englishName: 'The Rooms', numberOfAyahs: 18, revelationType: 'Medinan' },
  { number: 50, name: 'Qaaf', englishName: 'The letter Qaaf', numberOfAyahs: 45, revelationType: 'Meccan' },
  { number: 51, name: 'Adh-Dhaariyat', englishName: 'The Winnowing Winds', numberOfAyahs: 60, revelationType: 'Meccan' },
  { number: 52, name: 'At-Tur', englishName: 'The Mount', numberOfAyahs: 49, revelationType: 'Meccan' },
  { number: 53, name: 'An-Najm', englishName: 'The Star', numberOfAyahs: 62, revelationType: 'Meccan' },
  { number: 54, name: 'Al-Qamar', englishName: 'The Moon', numberOfAyahs: 55, revelationType: 'Meccan' },
  { number: 55, name: "Ar-Rahmaan", englishName: 'The Beneficent', numberOfAyahs: 78, revelationType: 'Medinan' },
  { number: 56, name: "Al-Waaqia", englishName: 'The Inevitable', numberOfAyahs: 96, revelationType: 'Meccan' },
  { number: 57, name: 'Al-Hadid', englishName: 'The Iron', numberOfAyahs: 29, revelationType: 'Medinan' },
  { number: 58, name: 'Al-Mujaadila', englishName: 'The Pleading Woman', numberOfAyahs: 22, revelationType: 'Medinan' },
  { number: 59, name: 'Al-Hashr', englishName: 'The Exile', numberOfAyahs: 24, revelationType: 'Medinan' },
  { number: 60, name: 'Al-Mumtahana', englishName: 'She that is to be examined', numberOfAyahs: 13, revelationType: 'Medinan' },
  { number: 61, name: 'As-Saff', englishName: 'The Ranks', numberOfAyahs: 14, revelationType: 'Medinan' },
  { number: 62, name: "Al-Jumu'a", englishName: 'Friday', numberOfAyahs: 11, revelationType: 'Medinan' },
  { number: 63, name: 'Al-Munaafiqoon', englishName: 'The Hypocrites', numberOfAyahs: 11, revelationType: 'Medinan' },
  { number: 64, name: 'At-Taghaabun', englishName: 'Mutual Disillusion', numberOfAyahs: 18, revelationType: 'Medinan' },
  { number: 65, name: 'At-Talaaq', englishName: 'Divorce', numberOfAyahs: 12, revelationType: 'Medinan' },
  { number: 66, name: 'At-Tahrim', englishName: 'The Prohibition', numberOfAyahs: 12, revelationType: 'Medinan' },
  { number: 67, name: 'Al-Mulk', englishName: 'The Sovereignty', numberOfAyahs: 30, revelationType: 'Meccan' },
  { number: 68, name: 'Al-Qalam', englishName: 'The Pen', numberOfAyahs: 52, revelationType: 'Meccan' },
  { number: 69, name: 'Al-Haaqqa', englishName: 'The Reality', numberOfAyahs: 52, revelationType: 'Meccan' },
  { number: 70, name: "Al-Ma'aarij", englishName: 'The Ascending Stairways', numberOfAyahs: 44, revelationType: 'Meccan' },
  { number: 71, name: 'Nooh', englishName: 'Noah', numberOfAyahs: 28, revelationType: 'Meccan' },
  { number: 72, name: 'Al-Jinn', englishName: 'The Jinn', numberOfAyahs: 28, revelationType: 'Meccan' },
  { number: 73, name: 'Al-Muzzammil', englishName: 'The Enshrouded One', numberOfAyahs: 20, revelationType: 'Meccan' },
  { number: 74, name: 'Al-Muddaththir', englishName: 'The Cloaked One', numberOfAyahs: 56, revelationType: 'Meccan' },
  { number: 75, name: 'Al-Qiyaama', englishName: 'The Resurrection', numberOfAyahs: 40, revelationType: 'Meccan' },
  { number: 76, name: 'Al-Insaan', englishName: 'Man', numberOfAyahs: 31, revelationType: 'Medinan' },
  { number: 77, name: 'Al-Mursalaat', englishName: 'The Emissaries', numberOfAyahs: 50, revelationType: 'Meccan' },
  { number: 78, name: 'An-Naba', englishName: 'The Tidings', numberOfAyahs: 40, revelationType: 'Meccan' },
  { number: 79, name: "An-Naazi'aat", englishName: 'Those who drag forth', numberOfAyahs: 46, revelationType: 'Meccan' },
  { number: 80, name: 'Abasa', englishName: 'He Frowned', numberOfAyahs: 42, revelationType: 'Meccan' },
  { number: 81, name: 'At-Takwir', englishName: 'The Overthrowing', numberOfAyahs: 29, revelationType: 'Meccan' },
  { number: 82, name: 'Al-Infitaar', englishName: 'The Cleaving', numberOfAyahs: 19, revelationType: 'Meccan' },
  { number: 83, name: 'Al-Mutaffifin', englishName: 'Defrauding', numberOfAyahs: 36, revelationType: 'Meccan' },
  { number: 84, name: 'Al-Inshiqaaq', englishName: 'The Splitting Open', numberOfAyahs: 25, revelationType: 'Meccan' },
  { number: 85, name: 'Al-Burooj', englishName: 'The Mansions of the Stars', numberOfAyahs: 22, revelationType: 'Meccan' },
  { number: 86, name: 'At-Taariq', englishName: 'The Morning Star', numberOfAyahs: 17, revelationType: 'Meccan' },
  { number: 87, name: "Al-A'laa", englishName: 'The Most High', numberOfAyahs: 19, revelationType: 'Meccan' },
  { number: 88, name: 'Al-Ghaashiya', englishName: 'The Overwhelming', numberOfAyahs: 26, revelationType: 'Meccan' },
  { number: 89, name: 'Al-Fajr', englishName: 'The Dawn', numberOfAyahs: 30, revelationType: 'Meccan' },
  { number: 90, name: 'Al-Balad', englishName: 'The City', numberOfAyahs: 20, revelationType: 'Meccan' },
  { number: 91, name: 'Ash-Shams', englishName: 'The Sun', numberOfAyahs: 15, revelationType: 'Meccan' },
  { number: 92, name: 'Al-Lail', englishName: 'The Night', numberOfAyahs: 21, revelationType: 'Meccan' },
  { number: 93, name: 'Ad-Dhuhaa', englishName: 'The Morning Hours', numberOfAyahs: 11, revelationType: 'Meccan' },
  { number: 94, name: 'Ash-Sharh', englishName: 'The Relief', numberOfAyahs: 8, revelationType: 'Meccan' },
  { number: 95, name: 'At-Tin', englishName: 'The Fig', numberOfAyahs: 8, revelationType: 'Meccan' },
  { number: 96, name: 'Al-Alaq', englishName: 'The Clot', numberOfAyahs: 19, revelationType: 'Meccan' },
  { number: 97, name: 'Al-Qadr', englishName: 'The Power', numberOfAyahs: 5, revelationType: 'Meccan' },
  { number: 98, name: 'Al-Bayyina', englishName: 'The Clear Proof', numberOfAyahs: 8, revelationType: 'Medinan' },
  { number: 99, name: 'Az-Zalzala', englishName: 'The Earthquake', numberOfAyahs: 8, revelationType: 'Medinan' },
  { number: 100, name: 'Al-Aadiyaat', englishName: 'The Chargers', numberOfAyahs: 11, revelationType: 'Meccan' },
  { number: 101, name: "Al-Qaari'a", englishName: 'The Calamity', numberOfAyahs: 11, revelationType: 'Meccan' },
  { number: 102, name: 'At-Takaathur', englishName: 'Rivalry in world increase', numberOfAyahs: 8, revelationType: 'Meccan' },
  { number: 103, name: 'Al-Asr', englishName: 'The Declining Day', numberOfAyahs: 3, revelationType: 'Meccan' },
  { number: 104, name: 'Al-Humaza', englishName: 'The Traducer', numberOfAyahs: 9, revelationType: 'Meccan' },
  { number: 105, name: 'Al-Fil', englishName: 'The Elephant', numberOfAyahs: 5, revelationType: 'Meccan' },
  { number: 106, name: 'Quraish', englishName: 'Quraish', numberOfAyahs: 4, revelationType: 'Meccan' },
  { number: 107, name: "Al-Maa'un", englishName: 'Small kindnesses', numberOfAyahs: 7, revelationType: 'Meccan' },
  { number: 108, name: 'Al-Kawthar', englishName: 'Abundance', numberOfAyahs: 3, revelationType: 'Meccan' },
  { number: 109, name: 'Al-Kaafiroon', englishName: 'The Disbelievers', numberOfAyahs: 6, revelationType: 'Meccan' },
  { number: 110, name: 'An-Nasr', englishName: 'Divine Support', numberOfAyahs: 3, revelationType: 'Medinan' },
  { number: 111, name: 'Al-Masad', englishName: 'The Palm Fiber', numberOfAyahs: 5, revelationType: 'Meccan' },
  { number: 112, name: 'Al-Ikhlaas', englishName: 'Sincerity', numberOfAyahs: 4, revelationType: 'Meccan' },
  { number: 113, name: 'Al-Falaq', englishName: 'The Dawn', numberOfAyahs: 5, revelationType: 'Meccan' },
  { number: 114, name: 'An-Naas', englishName: 'Mankind', numberOfAyahs: 6, revelationType: 'Meccan' },
];

// Small verification sample only — not the full Quran text.
const SAMPLE_AYAHS: Record<number, string[]> = {
  1: [
    'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    'الرَّحْمَٰنِ الرَّحِيمِ',
    'مَالِكِ يَوْمِ الدِّينِ',
    'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
    'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
  ],
  112: ['قُلْ هُوَ اللَّهُ أَحَدٌ', 'اللَّهُ الصَّمَدُ', 'لَمْ يَلِدْ وَلَمْ يُولَدْ', 'وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ'],
};

async function main() {
  for (const surah of SURAHS) {
    await prisma.quranSurah.upsert({
      where: { id: surah.number },
      update: surah,
      create: { id: surah.number, ...surah },
    });
  }

  for (const [surahNumber, texts] of Object.entries(SAMPLE_AYAHS)) {
    const surahId = Number(surahNumber);
    for (let i = 0; i < texts.length; i++) {
      await prisma.quranAyah.upsert({
        where: { surahId_number: { surahId, number: i + 1 } },
        update: { text: texts[i] },
        create: { surahId, number: i + 1, text: texts[i] },
      });
    }
  }

  console.log(`Seeded ${SURAHS.length} surahs and ${Object.values(SAMPLE_AYAHS).flat().length} sample ayahs.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
