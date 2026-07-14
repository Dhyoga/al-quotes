import express from 'express';
import { requireJwt } from '../lib/auth.js';
import { listItemsForUser, findItemForUser, createItem, toggleItem, deleteItem } from '../lib/todolist-repository.js';

const router = express.Router();
router.use(requireJwt);

router
  .post('/', async (req, res, next) => {
    try {
      const { text } = req.body;
      if (typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ message: 'text is required' });
      }

      const item = await createItem(req.userId!, text);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  })
  .get('/', async (req, res, next) => {
    try {
      const items = await listItemsForUser(req.userId!);
      res.json(items);
    } catch (error) {
      next(error);
    }
  })
  .patch('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await findItemForUser(req.userId!, id);
      if (!existing) return res.status(404).json({ message: 'Todo item not found' });

      const { done } = req.body;
      if (typeof done !== 'boolean') {
        return res.status(400).json({ message: 'done must be a boolean' });
      }

      const item = await toggleItem(req.userId!, id, done);
      res.json(item);
    } catch (error) {
      next(error);
    }
  })
  .delete('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await findItemForUser(req.userId!, id);
      if (!existing) return res.status(404).json({ message: 'Todo item not found' });
      await deleteItem(req.userId!, id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

export default router;
