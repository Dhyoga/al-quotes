## ADDED Requirements

### Requirement: Auth dependency loading is portable across Node runtimes
The auth middleware and its dependencies (including the JWT verification library) SHALL load successfully using standard ES module imports, without relying on a specific Node.js version's `require(esm)` interop behavior. The module system used in source code SHALL NOT assume the production runtime supports requiring ES-module-only packages from CommonJS.

#### Scenario: Auth middleware loads in the deployed Vercel environment
- **WHEN** the server starts in the Vercel production environment (or any Node version that does not support `require(esm)`)
- **THEN** the auth middleware and its JWT verification dependency load without an `ERR_REQUIRE_ESM` error

#### Scenario: Protected routes succeed end-to-end after deployment
- **WHEN** a request to `/tasks` or `/habits` includes a valid Supabase JWT, after deployment
- **THEN** the auth middleware verifies the token and the request is processed, with no module-loading failure
