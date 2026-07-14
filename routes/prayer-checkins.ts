import express from 'express';
import { Prayer } from '@prisma/client';
import { requireJwt } from '../lib/auth.js';
import { getOrCreateForDate, findForUser, toggle } from '../lib/prayer-checkins-repository.js';

const VALID_PRAYER = Object.values(Prayer);

const isValidDateString = (date: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const isValidTimeString = (value: unknown): value is string => typeof value === 'string' && TIME_RE.test(value);

const router = express.Router();
router.use(requireJwt);

router
  .get('/', async (req, res, next) => {
    try {
      const { date } = req.query;
      if (typeof date !== 'string' || !isValidDateString(date)) {
        return res.status(400).json({ message: 'date must be a valid YYYY-MM-DD calendar date' });
      }

      const schedule = {} as Record<Prayer, string>;
      for (const prayer of VALID_PRAYER) {
        const value = req.query[prayer];
        if (!isValidTimeString(value)) {
          return res.status(400).json({ message: `${prayer} must be a valid "HH:MM" schedule time` });
        }
        schedule[prayer] = value;
      }

      const checkIns = await getOrCreateForDate(req.userId!, new Date(`${date}T00:00:00.000Z`), schedule);
      res.json(checkIns);
    } catch (error) {
      next(error);
    }
  })
  .patch('/:prayer', async (req, res, next) => {
    try {
      const prayer = req.params.prayer as Prayer;
      if (!VALID_PRAYER.includes(prayer)) {
        return res.status(400).json({ message: 'Invalid prayer' });
      }

      const { date, done } = req.body;
      if (typeof date !== 'string' || !isValidDateString(date)) {
        return res.status(400).json({ message: 'date must be a valid YYYY-MM-DD calendar date' });
      }
      if (typeof done !== 'boolean') {
        return res.status(400).json({ message: 'done must be a boolean' });
      }

      const dateObj = new Date(`${date}T00:00:00.000Z`);
      const existing = await findForUser(req.userId!, dateObj, prayer);
      if (!existing) return res.status(404).json({ message: 'Prayer check-in not found for date' });

      const updated = await toggle(req.userId!, dateObj, prayer, done);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

export default router;
