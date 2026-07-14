import express from 'express';
import { requireJwt } from '../lib/auth.js';
import { upsertDailyStats, getWeeklyStats } from '../lib/browser-tracking-repository.js';

const isValidDateString = (date: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

const isValidSites = (sites: unknown): sites is { domain: string; duration: number }[] =>
  Array.isArray(sites) &&
  sites.every(
    (site) =>
      typeof site === 'object' &&
      site !== null &&
      typeof (site as Record<string, unknown>).domain === 'string' &&
      (site as Record<string, unknown>).domain !== '' &&
      Number.isInteger((site as Record<string, unknown>).duration) &&
      ((site as Record<string, unknown>).duration as number) >= 0
  );

const router = express.Router();
router.use(requireJwt);

router.post('/sync', async (req, res, next) => {
  try {
    const { date, sites } = req.body;

    if (typeof date !== 'string' || !isValidDateString(date)) {
      return res.status(400).json({ message: 'date must be a valid YYYY-MM-DD calendar date' });
    }
    if (!isValidSites(sites)) {
      return res.status(400).json({
        message: 'sites must be an array of { domain: non-empty string, duration: non-negative integer }',
      });
    }

    await upsertDailyStats(req.userId!, date, sites);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get('/weekly', async (req, res, next) => {
  try {
    const { today } = req.query;

    if (typeof today !== 'string' || !isValidDateString(today)) {
      return res.status(400).json({ message: 'today must be a valid YYYY-MM-DD calendar date' });
    }

    const stats = await getWeeklyStats(req.userId!, today);
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
