import express from 'express';
import { BrainDumpTheme } from '@prisma/client';
import { requireJwt } from '../lib/auth.js';
import { listNotesForUser, findNoteForUser, createNote, deleteNote } from '../lib/brain-dump-repository.js';

const VALID_THEME = Object.values(BrainDumpTheme);

const router = express.Router();
router.use(requireJwt);

router
  .post('/', async (req, res, next) => {
    try {
      const { theme, body } = req.body;

      if (!VALID_THEME.includes(theme)) {
        return res.status(400).json({ message: 'Invalid theme' });
      }
      if (typeof body !== 'string' || body.trim() === '') {
        return res.status(400).json({ message: 'body is required' });
      }

      const note = await createNote(req.userId!, { theme, body });
      res.status(201).json(note);
    } catch (error) {
      next(error);
    }
  })
  .get('/', async (req, res, next) => {
    try {
      const notes = await listNotesForUser(req.userId!);
      res.json(notes);
    } catch (error) {
      next(error);
    }
  })
  .delete('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await findNoteForUser(req.userId!, id);
      if (!existing) return res.status(404).json({ message: 'Note not found' });
      await deleteNote(req.userId!, id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

export default router;
