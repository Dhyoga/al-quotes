import { randomBytes, createHash } from 'crypto';

const API_KEY_PREFIX = 'rmd_live_';
const API_KEY_SLIDING_WINDOW_DAYS = 30;

const generateApiKey = (): string => `${API_KEY_PREFIX}${randomBytes(32).toString('base64url')}`;

const hashApiKey = (token: string): string => createHash('sha256').update(token).digest('hex');

const isApiKeyShaped = (token: string): boolean => token.startsWith(API_KEY_PREFIX);

const apiKeyExpiry = (): Date => new Date(Date.now() + API_KEY_SLIDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

export { generateApiKey, hashApiKey, isApiKeyShaped, apiKeyExpiry, API_KEY_SLIDING_WINDOW_DAYS };
