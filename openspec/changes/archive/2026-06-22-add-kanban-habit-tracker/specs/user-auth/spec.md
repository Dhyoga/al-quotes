## ADDED Requirements

### Requirement: Google OAuth via Supabase Auth
The system SHALL authenticate users exclusively via Google OAuth through Supabase Auth. No email/password sign-in method SHALL be offered.

#### Scenario: Successful Google sign-in issues a session
- **WHEN** a user completes the Google OAuth flow successfully
- **THEN** Supabase Auth issues a JWT session token that the client uses to call protected endpoints

### Requirement: JWT verification on protected routes
The system SHALL verify the Supabase-issued JWT on every request to `/tasks` and `/habits` endpoints before processing the request.

#### Scenario: Valid token allows the request
- **WHEN** a request to a protected endpoint includes a valid, unexpired Supabase JWT in the `Authorization` header
- **THEN** the system extracts the `userId` from the JWT and processes the request

#### Scenario: Missing or invalid token is rejected
- **WHEN** a request to a protected endpoint is missing the `Authorization` header, or includes an invalid or expired JWT
- **THEN** the system responds with `401 Unauthorized` and does not process the request

### Requirement: Per-user data isolation
All Task and Habit data SHALL be scoped to the authenticated user's `userId` on every read and write operation.

#### Scenario: User cannot access another user's task
- **WHEN** an authenticated user requests a task that belongs to a different `userId`
- **THEN** the system responds with `404 Not Found` rather than returning the other user's data

#### Scenario: User cannot access another user's habit
- **WHEN** an authenticated user requests a habit that belongs to a different `userId`
- **THEN** the system responds with `404 Not Found` rather than returning the other user's data

### Requirement: Public endpoints remain unauthenticated
The `/quotes` and `/pictures` endpoints SHALL remain accessible without authentication.

#### Scenario: Unauthenticated request to a public endpoint succeeds
- **WHEN** a request is made to `/quotes` or `/pictures` without an `Authorization` header
- **THEN** the system responds normally without requiring authentication
