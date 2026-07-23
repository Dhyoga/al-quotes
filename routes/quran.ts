import express from 'express';
import { requireJwt } from '../lib/auth.js';
import { listSurahs, findSurahById, listAyahsForSurah } from '../lib/quran-repository.js';
import { updateCurrentReading } from '../lib/quran-progress-repository.js';

const router = express.Router();
router.use(requireJwt);

router
  .get('/surahs', async (req, res, next) => {
    try {
      const surahs = await listSurahs();
      res.json(surahs);
    } catch (error) {
      next(error);
    }
  })
  .get('/surahs/:id/ayahs', async (req, res, next) => {
    try {
      const surahId = Number(req.params.id);
      if (!Number.isInteger(surahId)) {
        return res.status(400).json({ message: 'Invalid surah id' });
      }

      const surah = await findSurahById(surahId);
      if (!surah) return res.status(404).json({ message: 'Surah not found' });

      const ayahs = await listAyahsForSurah(surahId);
      res.json(ayahs);
    } catch (error) {
      next(error);
    }
  })
  .post('/progress', async (req, res, next) => {
    try {
      const { surahId, ayahNumber } = req.body;
      if (!Number.isInteger(surahId) || !Number.isInteger(ayahNumber)) {
        return res.status(400).json({ message: 'surahId and ayahNumber are required integers' });
      }

      const surah = await findSurahById(surahId);
      if (!surah) return res.status(404).json({ message: 'Surah not found' });

      if (ayahNumber < 1 || ayahNumber > surah.numberOfAyahs) {
        return res.status(400).json({ message: 'ayahNumber is out of range for this surah' });
      }

      const progress = await updateCurrentReading(req.userId!, surahId, ayahNumber);
      res.json(progress);
    } catch (error) {
      next(error);
    }
  });

export default router;
