## ADDED Requirements

### Requirement: Generate API key
An authenticated user (via Supabase JWT) SHALL be able to generate a new API key for their own account with an optional `label`. The plaintext key SHALL be returned exactly once, in the response to the create request, and SHALL NOT be retrievable again afterward.

#### Scenario: Successful key generation
- **WHEN** a user authenticated via JWT sends `POST /auth/api-keys` with an optional `label`
- **THEN** the system creates a new API key associated with that user's `userId`, stores only its hash, and returns the plaintext key in the response

#### Scenario: API keys cannot generate other API keys
- **WHEN** a request to `POST /auth/api-keys` is authenticated using an API key instead of a JWT
- **THEN** the system rejects the request with `401 Unauthorized`

### Requirement: List API keys
An authenticated user SHALL be able to list their own API keys without ever exposing the plaintext key or its hash.

#### Scenario: List own keys
- **WHEN** a user authenticated via JWT sends `GET /auth/api-keys`
- **THEN** the system returns that user's keys, each including `id`, `label`, `createdAt`, `lastUsedAt`, and `expiresAt`, and excluding the plaintext key and hash

#### Scenario: Users only see their own keys
- **WHEN** a user authenticated via JWT sends `GET /auth/api-keys`
- **THEN** the system does not include any API key belonging to a different `userId`

### Requirement: Revoke API key
An authenticated user SHALL be able to revoke one of their own API keys, immediately invalidating it for future authentication.

#### Scenario: Successful revocation
- **WHEN** a user authenticated via JWT sends `DELETE /auth/api-keys/:id` for a key they own
- **THEN** the system deletes the key and any subsequent request using that key's plaintext value is rejected with `401 Unauthorized`

#### Scenario: Cannot revoke another user's key
- **WHEN** a user authenticated via JWT sends `DELETE /auth/api-keys/:id` for a key owned by a different `userId`
- **THEN** the system responds with `404 Not Found` and does not delete the key

### Requirement: Sliding expiry on use
Each API key SHALL have an `expiresAt` timestamp. Every successful authenticated request using that key SHALL extend `expiresAt` to a fixed window (30 days) from the current time, and SHALL update `lastUsedAt` to the current time. A key whose `expiresAt` has passed SHALL be treated as invalid.

#### Scenario: Active use extends expiry
- **WHEN** an API key is used to successfully authenticate a request to `/tasks` or `/habits`
- **THEN** the system updates that key's `expiresAt` to 30 days from the current time and updates `lastUsedAt` to the current time

#### Scenario: Unused key lapses
- **WHEN** an API key's `expiresAt` has passed without the key being used again before that time
- **THEN** the system rejects any request authenticated with that key with `401 Unauthorized`

#### Scenario: Newly created key starts with a full expiry window
- **WHEN** a new API key is generated
- **THEN** its initial `expiresAt` is set to 30 days from the creation time
