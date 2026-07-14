import express from 'express';
import { requireJwt } from '../lib/auth.js';
import { getOrCreateForUser, incrementPage } from '../lib/quran-progress-repository.js';

const router = express.Router();
router.use(requireJwt);

router
  .get('/', async (req, res, next) => {
    try {
      const progress = await getOrCreateForUser(req.userId!);
      res.json(progress);
    } catch (error) {
      next(error);
    }
  })
  .post('/increment-page', async (req, res, next) => {
    try {
      const progress = await incrementPage(req.userId!);
      res.json(progress);
    } catch (error) {
      next(error);
    }
  });

export default router;
