import type { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const supabaseUrl = process.env.SUPABASE_URL;
const jwks = supabaseUrl
  ? createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
  : null;

const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

export default requireAuth;
