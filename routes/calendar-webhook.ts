import express from 'express';
import { CalendarEntityType } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { requireWebhookSecret } from '../lib/auth.js';

const VALID_ENTITY_TYPES = Object.values(CalendarEntityType);

const router = express.Router();
router.use(requireWebhookSecret);

router.post('/', async (req, res, next) => {
  try {
    const { action, entityType, entityId, googleEventId } = req.body;

    if (!VALID_ENTITY_TYPES.includes(entityType) || typeof entityId !== 'number') {
      res.status(400).json({ message: 'Invalid entityType or entityId' });
      return;
    }

    if (action === 'linked') {
      if (!googleEventId) {
        res.status(400).json({ message: 'googleEventId is required for action "linked"' });
        return;
      }

      await prisma.calendarSync.upsert({
        where: { entityType_entityId: { entityType, entityId } },
        update: { googleEventId },
        create: { entityType, entityId, googleEventId },
      });
      res.status(204).end();
      return;
    }

    if (action === 'unlinked') {
      // deleteMany, not delete: a redundant/duplicate callback should not be an error.
      await prisma.calendarSync.deleteMany({ where: { entityType, entityId } });
      res.status(204).end();
      return;
    }

    res.status(400).json({ message: 'Invalid action' });
  } catch (error) {
    next(error);
  }
});

export default router;
