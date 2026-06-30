import express from 'express';
import { type Prisma } from '@prisma/client';
import { requireJwt } from '../lib/auth.js';
import { listEventsForUser, findEventForUser, createEvent, updateEvent, deleteEvent } from '../lib/events-repository.js';

const router = express.Router();
router.use(requireJwt);

router
  .post('/', async (req, res, next) => {
    try {
      const { title, description, location, startAt, endAt, isRecurring, rrule, syncToCalendar } = req.body;

      if (!title) {
        return res.status(400).json({ message: 'title is required' });
      }
      if (!startAt) {
        return res.status(400).json({ message: 'startAt is required' });
      }
      if (isRecurring && !rrule) {
        return res.status(400).json({ message: 'rrule is required when isRecurring is true' });
      }
      if (syncToCalendar !== undefined && typeof syncToCalendar !== 'boolean') {
        return res.status(400).json({ message: 'Invalid syncToCalendar' });
      }

      const event = await createEvent(req.userId!, {
        title,
        description,
        location,
        startAt,
        endAt,
        isRecurring,
        rrule: isRecurring ? rrule : undefined,
        syncToCalendar,
      });
      res.status(201).json(event);
    } catch (error) {
      next(error);
    }
  })
  .get('/', async (req, res, next) => {
    try {
      const events = await listEventsForUser(req.userId!);
      res.json(events);
    } catch (error) {
      next(error);
    }
  })
  .get('/:id', async (req, res, next) => {
    try {
      const event = await findEventForUser(req.userId!, Number(req.params.id));
      if (!event) return res.status(404).json({ message: 'Event not found' });
      res.json(event);
    } catch (error) {
      next(error);
    }
  })
  .patch('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await findEventForUser(req.userId!, id);
      if (!existing) return res.status(404).json({ message: 'Event not found' });

      const { title, description, location, startAt, endAt, isRecurring, rrule, syncToCalendar } = req.body;

      const nextIsRecurring = isRecurring !== undefined ? isRecurring : existing.isRecurring;
      const nextRrule = rrule !== undefined ? rrule : existing.rrule;
      if (nextIsRecurring && !nextRrule) {
        return res.status(400).json({ message: 'rrule is required when isRecurring is true' });
      }
      if (syncToCalendar !== undefined && typeof syncToCalendar !== 'boolean') {
        return res.status(400).json({ message: 'Invalid syncToCalendar' });
      }

      const data: Prisma.EventUpdateInput = {};
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (location !== undefined) data.location = location;
      if (startAt !== undefined) data.startAt = startAt;
      if (endAt !== undefined) data.endAt = endAt;
      if (isRecurring !== undefined) data.isRecurring = isRecurring;
      if (rrule !== undefined) data.rrule = rrule;
      if (syncToCalendar !== undefined) data.syncToCalendar = syncToCalendar;

      const event = await updateEvent(req.userId!, id, data);
      res.json(event);
    } catch (error) {
      next(error);
    }
  })
  .delete('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await findEventForUser(req.userId!, id);
      if (!existing) return res.status(404).json({ message: 'Event not found' });
      await deleteEvent(req.userId!, id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

export default router;
