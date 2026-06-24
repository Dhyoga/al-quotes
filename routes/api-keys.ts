import express from 'express';
import prisma from '../lib/prisma.js';
import { requireJwt } from '../lib/auth.js';
import { generateApiKey, hashApiKey, apiKeyExpiry } from '../lib/api-keys.js';

const router = express.Router();
router.use(requireJwt);

const PUBLIC_FIELDS = { id: true, label: true, createdAt: true, lastUsedAt: true, expiresAt: true };

router
  .post('/', async (req, res, next) => {
    try {
      const { label } = req.body;
      const token = generateApiKey();

      const apiKey = await prisma.apiKey.create({
        data: {
          userId: req.userId!,
          hash: hashApiKey(token),
          label,
          expiresAt: apiKeyExpiry(),
        },
        select: PUBLIC_FIELDS,
      });

      res.status(201).json({ ...apiKey, token });
    } catch (error) {
      next(error);
    }
  })
  .get('/', async (req, res, next) => {
    try {
      const apiKeys = await prisma.apiKey.findMany({
        where: { userId: req.userId! },
        select: PUBLIC_FIELDS,
        orderBy: { createdAt: 'desc' },
      });
      res.json(apiKeys);
    } catch (error) {
      next(error);
    }
  })
  .delete('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await prisma.apiKey.findFirst({ where: { id, userId: req.userId! } });
      if (!existing) return res.status(404).json({ message: 'API key not found' });

      await prisma.apiKey.delete({ where: { id } });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

export default router;
