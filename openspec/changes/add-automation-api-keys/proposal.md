## Why

Automation tools (e.g. a personal agent triggered via Telegram, or n8n workflows) need to call `/tasks` and `/habits` on a user's behalf without going through Google OAuth. Today the only credential accepted is a short-lived Supabase JWT, which requires an interactive browser login and expires/rotates in a way that's awkward for headless, long-running automation. Users need a way to mint a durable, revocable credential for their own account once, from the extension, and never have to babysit it again as long as their automation keeps using it.

## What Changes

- Add a new `ApiKey` credential type: a long-lived, opaque token scoped to a single user, generated on demand by an authenticated (JWT) request.
- `POST /auth/api-keys` — generate a new API key for the calling user; returns the plaintext token once (it is never retrievable again).
- `GET /auth/api-keys` — list the calling user's keys (label, createdAt, lastUsedAt, expiresAt) without exposing plaintext or hash.
- `DELETE /auth/api-keys/:id` — revoke a key belonging to the calling user.
- `requireAuth` gains a second authentication path: if the bearer token matches the API key format, it is looked up by hash instead of verified as a JWT.
- API keys use **sliding expiry**: a valid key's `expiresAt` is pushed forward by 30 days on every successful authenticated request. A key only goes stale if unused for 30 consecutive days; otherwise it never requires manual renewal.
- API keys can only be created, listed, or revoked using an existing Supabase JWT — a key can never be used to mint another key.

## Capabilities

### New Capabilities
- `automation-api-keys`: issuing, listing, revoking, and authenticating with long-lived per-user API keys, including the sliding-expiry renewal behavior.

### Modified Capabilities
- `user-auth`: protected routes (`/tasks`, `/habits`) now accept either a Supabase JWT or a valid API key as proof of identity, instead of requiring a JWT exclusively.

## Impact

- `al-quotes/prisma/schema.prisma`: new `ApiKey` model + migration.
- `al-quotes/lib/auth.ts`: branch on token shape before choosing JWT verification vs. API key lookup; API key path updates `lastUsedAt`/`expiresAt` on every successful request.
- `al-quotes/routes/`: new `api-keys.ts` router mounted at `/auth/api-keys`, protected by the existing JWT-only `requireAuth` behavior for key management (not the new API-key path).
- `al-quotes/server.ts`: mount the new router.
- No change to the browser extension's existing Google OAuth / JWT session flow.
