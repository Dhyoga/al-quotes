## MODIFIED Requirements

### Requirement: JWT verification on protected routes
The system SHALL accept either a valid, unexpired Supabase-issued JWT or a valid, unexpired API key on every request to `/tasks` and `/habits` endpoints before processing the request.

#### Scenario: Valid token allows the request
- **WHEN** a request to a protected endpoint includes a valid, unexpired Supabase JWT in the `Authorization` header
- **THEN** the system extracts the `userId` from the JWT and processes the request

#### Scenario: Valid API key allows the request
- **WHEN** a request to a protected endpoint includes a valid, unexpired API key in the `Authorization` header
- **THEN** the system resolves the `userId` associated with that API key and processes the request

#### Scenario: Missing or invalid token is rejected
- **WHEN** a request to a protected endpoint is missing the `Authorization` header, or includes a value that is neither a valid Supabase JWT nor a valid API key
- **THEN** the system responds with `401 Unauthorized` and does not process the request

#### Scenario: Expired or revoked API key is rejected
- **WHEN** a request to a protected endpoint includes an API key that has expired or been revoked
- **THEN** the system responds with `401 Unauthorized` and does not process the request
