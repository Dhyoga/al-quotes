import express from 'express';
import { HabitFrequency, Priority, type Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { requireJwt } from '../lib/auth.js';
import { listHabitsForUser, findHabitForUser } from '../lib/habits-repository.js';
import { computePeriodStart } from '../lib/period.js';

const VALID_FREQUENCY = Object.values(HabitFrequency);
const VALID_PRIORITY = Object.values(Priority);

const router = express.Router();
router.use(requireJwt);

router
  .post('/', async (req, res, next) => {
    try {
      const { title, description, priority, frequency } = req.body;

      if (!title) {
        return res.status(400).json({ message: 'title is required' });
      }
      if (!VALID_FREQUENCY.includes(frequency)) {
        return res.status(400).json({ message: 'frequency must be "daily" or "weekly"' });
      }
      if (priority !== undefined && priority !== null && !VALID_PRIORITY.includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority' });
      }

      const habit = await prisma.habit.create({
        data: { userId: req.userId!, title, description, priority, frequency },
      });
      res.status(201).json(habit);
    } catch (error) {
      next(error);
    }
  })
  .get('/', async (req, res, next) => {
    try {
      const habits = await listHabitsForUser(req.userId!);
      res.json(habits);
    } catch (error) {
      next(error);
    }
  })
  .get('/:id', async (req, res, next) => {
    try {
      const habit = await findHabitForUser(req.userId!, Number(req.params.id));
      if (!habit) return res.status(404).json({ message: 'Habit not found' });
      res.json(habit);
    } catch (error) {
      next(error);
    }
  })
  .patch('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await findHabitForUser(req.userId!, id);
      if (!existing) return res.status(404).json({ message: 'Habit not found' });

      const { title, description, priority, frequency } = req.body;

      if (frequency !== undefined && !VALID_FREQUENCY.includes(frequency)) {
        return res.status(400).json({ message: 'frequency must be "daily" or "weekly"' });
      }
      if (priority !== undefined && priority !== null && !VALID_PRIORITY.includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority' });
      }

      const data: Prisma.HabitUpdateInput = {};
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (priority !== undefined) data.priority = priority;
      if (frequency !== undefined) data.frequency = frequency;

      const habit = await prisma.habit.update({ where: { id }, data });
      res.json(habit);
    } catch (error) {
      next(error);
    }
  })
  .delete('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await findHabitForUser(req.userId!, id);
      if (!existing) return res.status(404).json({ message: 'Habit not found' });
      await prisma.habit.delete({ where: { id } });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  })
  .post('/:id/checkins', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const habit = await findHabitForUser(req.userId!, id);
      if (!habit) return res.status(404).json({ message: 'Habit not found' });

      const periodStart = computePeriodStart(habit.frequency);

      const checkIn = await prisma.habitCheckIn.upsert({
        where: { habitId_periodStart: { habitId: id, periodStart } },
        update: {},
        create: { habitId: id, periodStart, completed: true },
      });
      res.status(201).json(checkIn);
    } catch (error) {
      next(error);
    }
  })
  .get('/:id/checkins', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const habit = await findHabitForUser(req.userId!, id);
      if (!habit) return res.status(404).json({ message: 'Habit not found' });

      const checkIns = await prisma.habitCheckIn.findMany({
        where: { habitId: id },
        orderBy: { periodStart: 'desc' },
      });
      res.json(checkIns);
    } catch (error) {
      next(error);
    }
  });

export default router;
