## MODIFIED Requirements

### Requirement: JWT verification on protected routes
The system SHALL verify the Supabase-issued JWT on every request to `/tasks` and `/habits` endpoints before processing the request. API keys SHALL NOT be accepted as a credential on these routes; API-key authentication is exclusive to `/mcp`.

#### Scenario: Valid token allows the request
- **WHEN** a request to a protected endpoint includes a valid, unexpired Supabase JWT in the `Authorization` header
- **THEN** the system extracts the `userId` from the JWT and processes the request

#### Scenario: Missing or invalid token is rejected
- **WHEN** a request to a protected endpoint is missing the `Authorization` header, or includes an invalid or expired JWT
- **THEN** the system responds with `401 Unauthorized` and does not process the request

#### Scenario: API key is rejected on REST routes
- **WHEN** a request to `/tasks` or `/habits` includes a valid API key instead of a JWT
- **THEN** the system responds with `401 Unauthorized`
