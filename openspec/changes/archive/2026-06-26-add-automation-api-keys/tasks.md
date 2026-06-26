## 1. Data model

- [x] 1.1 Add `ApiKey` model to `prisma/schema.prisma` (`id`, `userId`, `hash` unique, `label` optional, `createdAt`, `lastUsedAt` optional, `expiresAt`, index on `userId`)
- [x] 1.2 Run `prisma migrate dev` to generate and apply the migration; commit the generated migration files
- [x] 1.3 Run `prisma generate` to refresh the Prisma client types

## 2. Token generation and lookup helpers

- [x] 2.1 Add a helper to generate a new token: random 32 bytes, base64url-encoded, prefixed with `rmd_live_`
- [x] 2.2 Add a helper to hash a token (SHA-256) for storage and lookup
- [x] 2.3 Add a helper to detect whether a bearer token string is API-key-shaped (`rmd_live_` prefix) vs. JWT-shaped
- [x] 2.4 Define `API_KEY_SLIDING_WINDOW_DAYS = 30` as a single named constant used by both key creation and the sliding-expiry update

## 3. Auth middleware changes

- [x] 3.1 In `lib/auth.ts`, branch on the bearer token shape before existing JWT verification: if API-key-shaped, look up by hash instead
- [x] 3.2 On successful API key lookup: reject with `401` if `expiresAt` has passed; otherwise set `req.userId`, update `lastUsedAt` to now and `expiresAt` to now + sliding window, then call `next()`
- [x] 3.3 On failed API key lookup (not found): reject with `401 Unauthorized`, same response shape as the existing invalid-JWT case
- [x] 3.4 Add a `requireJwt` variant (or equivalent) that only accepts a JWT, for use by the new key-management routes, leaving the existing `requireAuth` used by `/tasks` and `/habits` accepting both credential types
- [x] 3.5 Confirm existing JWT verification path and its tests/behavior are unchanged

## 4. API key management routes

- [x] 4.1 Create `routes/api-keys.ts` mounted at `/auth/api-keys`, protected by `requireJwt`
- [x] 4.2 Implement `POST /` — generate token + hash, store row with `userId` from JWT, `expiresAt` = now + sliding window, return `{ id, token, label, createdAt, expiresAt }` (token included only in this response)
- [x] 4.3 Implement `GET /` — list keys for `req.userId`, returning `id`, `label`, `createdAt`, `lastUsedAt`, `expiresAt` only (never hash or token)
- [x] 4.4 Implement `DELETE /:id` — delete the key if it belongs to `req.userId`; respond `404` if not found or owned by another user
- [x] 4.5 Mount the new router in `server.ts`

## 5. Verification

- [x] 5.1 Manually verify: generate a key via JWT, call `/tasks` with the key, confirm it succeeds and `lastUsedAt`/`expiresAt` update in the DB
- [x] 5.2 Manually verify: revoke a key, confirm subsequent requests with it return `401`
- [x] 5.3 Manually verify: attempt `POST /auth/api-keys` using an API key instead of a JWT, confirm `401`
- [x] 5.4 Manually verify: existing extension login/JWT flow against `/tasks` and `/habits` still works unchanged
- [x] 5.5 Run `npm run typecheck`
