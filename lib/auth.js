const { createRemoteJWKSet, jwtVerify } = require('jose');

const supabaseUrl = process.env.SUPABASE_URL;
const jwks = supabaseUrl
  ? createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
  : null;

const requireAuth = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }

  if (!jwks) {
    return res.status(500).json({ message: 'Auth is not configured (missing SUPABASE_URL)' });
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

module.exports = requireAuth;
