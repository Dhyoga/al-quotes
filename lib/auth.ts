import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import prisma from './prisma.js';
import { isApiKeyShaped, hashApiKey, apiKeyExpiry } from './api-keys.js';

const supabaseUrl = process.env.SUPABASE_URL;
const jwks = supabaseUrl
  ? createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
  : null;

const authenticateApiKey = async (token: string): Promise<string | null> => {
  const apiKey = await prisma.apiKey.findUnique({ where: { hash: hashApiKey(token) } });

  if (!apiKey || apiKey.expiresAt < new Date()) {
    return null;
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date(), expiresAt: apiKeyExpiry() },
  });

  return apiKey.userId;
};

const requireJwt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ message: 'Missing or invalid Authorization header' });
    return;
  }

  if (!jwks) {
    res.status(500).json({ message: 'Auth is not configured (missing SUPABASE_URL)' });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${supabaseUrl}/auth/v1`,
    });
    req.userId = payload.sub;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token || !isApiKeyShaped(token)) {
    res.status(401).json({ message: 'Missing or invalid Authorization header' });
    return;
  }

  const userId = await authenticateApiKey(token);
  if (!userId) {
    res.status(401).json({ message: 'Invalid or expired token' });
    return;
  }

  req.userId = userId;
  next();
};

// Authenticates a trusted service (n8n) calling al-quotes on its own behalf —
// not a user, so this is intentionally separate from requireJwt/requireApiKey.
const requireWebhookSecret = (req: Request, res: Response, next: NextFunction): void => {
  const provided = req.headers['x-webhook-secret'];
  const expected = process.env.WEBHOOK_SECRET;

  // Length check first: timingSafeEqual throws on mismatched buffer lengths
  // rather than returning false.
  if (
    typeof provided !== 'string' ||
    !expected ||
    provided.length !== expected.length ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  ) {
    res.status(401).json({ message: 'Invalid webhook secret' });
    return;
  }

  next();
};

export { requireJwt, requireApiKey, requireWebhookSecret };
