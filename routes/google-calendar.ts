import express from 'express';
import prisma from '../lib/prisma.js';
import { requireJwt } from '../lib/auth.js';

const router = express.Router();
router.use(requireJwt);

router
  .post('/', async (req, res, next) => {
    try {
      const { refreshToken, calendarId } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ message: 'refreshToken is required' });
      }

      await prisma.googleCalendarLink.upsert({
        where: { userId: req.userId! },
        update: { refreshToken, calendarId: calendarId || 'primary', revokedAt: null },
        create: { userId: req.userId!, refreshToken, calendarId: calendarId || 'primary' },
      });

      res.status(201).json({ connected: true });
    } catch (error) {
      next(error);
    }
  })
  .get('/', async (req, res, next) => {
    try {
      const link = await prisma.googleCalendarLink.findUnique({ where: { userId: req.userId! } });
      res.json({ connected: Boolean(link), calendarId: link?.calendarId });
    } catch (error) {
      next(error);
    }
  })
  .delete('/', async (req, res, next) => {
    try {
      await prisma.googleCalendarLink.deleteMany({ where: { userId: req.userId! } });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

export default router;
