## Context

`al-quotes` (the Remindeen API) currently authenticates every request to `/tasks` and `/habits` by verifying a Supabase-issued JWT against Supabase's JWKS (`al-quotes/lib/auth.ts`). That JWT only exists after a user completes Google OAuth inside the browser extension, and it expires on a timescale meant for interactive sessions, not unattended automation.

There is no local `User` table — every model (`Task`, `Habit`, ...) stores a bare `userId` string copied from the JWT's `sub` claim. Any new credential type must fit this same pattern: it should resolve to a `userId` string and nothing more.

The motivating use case is a personal automation agent ("Hermes Agent") that runs as a long-lived process and calls `/tasks`/`/habits` whenever its owner messages it via Telegram. It needs a credential that survives indefinitely under regular use, without an interactive browser step, and without the agent needing any rotation logic of its own.

## Goals / Non-Goals

**Goals:**
- Let a user mint a long-lived, per-user credential from an already-authenticated session (JWT), usable by external tools that can't do an OAuth dance.
- Make the credential self-renewing under normal use, so headless automation never has to handle expiry/rotation logic itself.
- Make the credential independently revocable, with no effect on the user's Google/Supabase session.
- Keep `/tasks` and `/habits` request handling and the extension's existing JWT flow completely unchanged.

**Non-Goals:**
- Multi-key scoping/permissions (e.g. read-only keys, per-endpoint scopes). All keys grant the same access the user's JWT would.
- Rate limiting or abuse detection on API key usage.
- A UI for generating/revoking keys (covered by a future change to the extension or a small standalone page); this change only adds the backend endpoints.
- Replacing or modifying how the extension itself authenticates (Google OAuth + JWT is untouched).

## Decisions

**Token shape: opaque random token with a static prefix, e.g. `rmd_live_<43 random base64url chars>`.**
A recognizable prefix lets `requireAuth` cheaply decide "is this an API key or a JWT" before doing any DB lookup or JWKS verification (JWTs always contain two `.` separators and never start with `rmd_live_`). It also makes leaked-key detection in logs/scanners easier, matching the convention used by Stripe/GitHub-style tokens.

**Storage: SHA-256 hash of the token, not the plaintext, not bcrypt.**
The token already has high entropy (32 random bytes), so a slow KDF like bcrypt buys nothing and adds latency to every authenticated request. A fast, deterministic hash also lets lookup be a simple unique-indexed query (`WHERE hash = ?`) rather than scanning and comparing, which bcrypt would require. Plaintext is shown to the user exactly once at creation time and never stored.

**Sliding expiry over fixed expiry or no expiry.**
- *No expiry* (revocable-only) was the original Option B design, but leaves a leaked-and-forgotten key live forever until someone notices.
- *Fixed expiry* forces periodic manual renewal via the extension regardless of whether the key is actively used — for an unattended agent, this silently breaks automation on a timer.
- *Sliding expiry* (chosen): every successful authenticated request using the key pushes `expiresAt` forward by 30 days. A key that's in active use never expires; a key that goes quiet for 30 days (lost device, decommissioned agent, leaked-but-unused) lapses on its own. No separate "renew" endpoint or client-side rotation logic is needed — usage *is* renewal.
- 30 days was chosen as a balance for an agent expected to be invoked at least weekly; this is a config-level constant (`API_KEY_SLIDING_WINDOW_DAYS`), not hardcoded in multiple places, so it can be tuned later.

**Key management endpoints require a JWT, not an API key.**
`POST /auth/api-keys`, `GET /auth/api-keys`, and `DELETE /auth/api-keys/:id` only accept a Supabase JWT. This prevents a compromised key from minting unlimited replacement keys for itself, and keeps "create/revoke credentials" tied to an actual interactive login. `requireAuth` as used elsewhere accepts either credential type; these three routes use a stricter `requireJwt` variant.

**`lastUsedAt`/`expiresAt` update happens inline in the auth middleware, on every request, unconditionally.**
Simplest correct option. A debounced write (e.g. only update if >1 hour stale) would reduce DB writes but isn't needed at this app's scale (single-digit users, low request volume) — noted as a future optimization rather than built now.

## Risks / Trade-offs

- **[Risk]** A key that authenticates `/tasks`/`/habits` writes to `lastUsedAt`/`expiresAt` on every call, adding a write query to the hot path → **Mitigation**: acceptable at current scale; if it becomes a bottleneck, debounce the write or move it to a fire-and-forget update.
- **[Risk]** A leaked, actively-used key is just as dangerous as a leaked JWT — sliding expiry doesn't help if the attacker also uses it regularly → **Mitigation**: this is inherent to any long-lived bearer credential; mitigated only by the manual revoke endpoint and treating the key like a password.
- **[Risk]** Prefix-based routing in `requireAuth` (`rmd_live_` vs JWT) means a malformed/truncated token could be misclassified → **Mitigation**: fall through to "not found/invalid" in either branch; never silently treat an invalid token as a different type.
- **[Trade-off]** No scoping means any automation holding a key has full read/write on that user's tasks and habits, same as if they were logged in. Acceptable for a personal-use app; would need revisiting if this app ever supported untrusted third-party integrations.

## Migration Plan

1. Add `ApiKey` model to `prisma/schema.prisma`, run `prisma migrate dev` to generate the migration, commit the migration file.
2. Add the hashing/generation helper and the `requireAuth` branch (additive — existing JWT path is unchanged, so this ships with zero risk to current extension users).
3. Add `routes/api-keys.ts` and mount it in `server.ts`.
4. Deploy; no backfill needed since this is a net-new table with no existing rows.
5. Rollback: the new route and DB table can be dropped independently; nothing else depends on them.

## Open Questions

- Where does a user actually trigger `POST /auth/api-keys` from today — a button added to the extension's settings page, or a small standalone authenticated web page? Out of scope for this change, but the extension change should follow this one.
- Should revoked/expired keys be hard-deleted or soft-deleted (kept for audit, with a `revokedAt` column)? This change assumes hard delete on `DELETE /auth/api-keys/:id`, and rows simply become unusable (but still present) once `expiresAt` lapses.
