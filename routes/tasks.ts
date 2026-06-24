import express from 'express';
import { Priority, TaskStatus, type Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { requireJwt } from '../lib/auth.js';
import { listTasksForUser, findTaskForUser } from '../lib/tasks-repository.js';

const VALID_STATUS = Object.values(TaskStatus);
const VALID_PRIORITY = Object.values(Priority);

const router = express.Router();
router.use(requireJwt);

const nextPosition = async (userId: string, status: TaskStatus): Promise<number> => {
  const last = await prisma.task.findFirst({
    where: { userId, status },
    orderBy: { position: 'desc' },
  });
  return (last?.position ?? 0) + 1;
};

router
  .post('/', async (req, res, next) => {
    try {
      const { title, description, startDate, dueDate, priority } = req.body;

      if (!title) {
        return res.status(400).json({ message: 'title is required' });
      }
      if (priority !== undefined && priority !== null && !VALID_PRIORITY.includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority' });
      }

      const position = await nextPosition(req.userId!, TaskStatus.TODO);
      const task = await prisma.task.create({
        data: {
          userId: req.userId!,
          title,
          description,
          startDate: startDate ? new Date(startDate) : undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          priority,
          status: 'TODO',
          position,
        },
      });
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  })
  .get('/', async (req, res, next) => {
    try {
      const tasks = await listTasksForUser(req.userId!);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  })
  .get('/:id', async (req, res, next) => {
    try {
      const task = await findTaskForUser(req.userId!, Number(req.params.id));
      if (!task) return res.status(404).json({ message: 'Task not found' });
      res.json(task);
    } catch (error) {
      next(error);
    }
  })
  .patch('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await findTaskForUser(req.userId!, id);
      if (!existing) return res.status(404).json({ message: 'Task not found' });

      const { title, description, startDate, dueDate, priority, status } = req.body;

      if (priority !== undefined && priority !== null && !VALID_PRIORITY.includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority' });
      }
      if (status !== undefined && !VALID_STATUS.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const data: Prisma.TaskUpdateInput = {};
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
      if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
      if (priority !== undefined) data.priority = priority;

      if (status !== undefined && status !== existing.status) {
        const task = await prisma.$transaction(async (tx) => {
          const updated = await tx.task.update({ where: { id }, data: { ...data, status } });
          await tx.taskStatusHistory.create({
            data: { taskId: id, fromStatus: existing.status, toStatus: status },
          });
          return updated;
        });
        return res.json(task);
      }

      const task = await prisma.task.update({ where: { id }, data });
      res.json(task);
    } catch (error) {
      next(error);
    }
  })
  .patch('/:id/position', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await findTaskForUser(req.userId!, id);
      if (!existing) return res.status(404).json({ message: 'Task not found' });

      const { position, beforeId, afterId } = req.body;
      let newPosition: number;

      if (typeof position === 'number') {
        newPosition = position;
      } else {
        const [before, after] = await Promise.all([
          beforeId ? findTaskForUser(req.userId!, Number(beforeId)) : null,
          afterId ? findTaskForUser(req.userId!, Number(afterId)) : null,
        ]);

        if (before && after) {
          newPosition = (before.position + after.position) / 2;
        } else if (before) {
          newPosition = before.position + 1;
        } else if (after) {
          newPosition = after.position - 1;
        } else {
          newPosition = 0;
        }
      }

      const task = await prisma.task.update({ where: { id }, data: { position: newPosition } });
      res.json(task);
    } catch (error) {
      next(error);
    }
  })
  .delete('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await findTaskForUser(req.userId!, id);
      if (!existing) return res.status(404).json({ message: 'Task not found' });
      await prisma.task.delete({ where: { id } });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  })
  .post('/:id/comments', async (req, res, next) => {
    try {
      const taskId = Number(req.params.id);
      const task = await findTaskForUser(req.userId!, taskId);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const { body } = req.body;
      if (!body) return res.status(400).json({ message: 'body is required' });

      const comment = await prisma.comment.create({ data: { taskId, body } });
      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  })
  .get('/:id/comments', async (req, res, next) => {
    try {
      const taskId = Number(req.params.id);
      const task = await findTaskForUser(req.userId!, taskId);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const comments = await prisma.comment.findMany({
        where: { taskId },
        orderBy: { createdAt: 'asc' },
      });
      res.json(comments);
    } catch (error) {
      next(error);
    }
  })
  .patch('/:id/comments/:commentId', async (req, res, next) => {
    try {
      const taskId = Number(req.params.id);
      const task = await findTaskForUser(req.userId!, taskId);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const commentId = Number(req.params.commentId);
      const comment = await prisma.comment.findFirst({ where: { id: commentId, taskId } });
      if (!comment) return res.status(404).json({ message: 'Comment not found' });

      const { body } = req.body;
      if (!body) return res.status(400).json({ message: 'body is required' });

      const updated = await prisma.comment.update({ where: { id: commentId }, data: { body } });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  })
  .delete('/:id/comments/:commentId', async (req, res, next) => {
    try {
      const taskId = Number(req.params.id);
      const task = await findTaskForUser(req.userId!, taskId);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const commentId = Number(req.params.commentId);
      const comment = await prisma.comment.findFirst({ where: { id: commentId, taskId } });
      if (!comment) return res.status(404).json({ message: 'Comment not found' });

      await prisma.comment.delete({ where: { id: commentId } });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

export default router;
