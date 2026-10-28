## ADDED Requirements

### Requirement: Runtime Node version is pinned to a supported release line
The repository SHALL declare the Node.js runtime in `package.json` as `engines.node` pinned to a release line that still receives upstream security patches (currently `24.x`). The server SHALL NOT be deployed on an end-of-life Node.js release.

#### Scenario: Engines field declares a supported Node line
- **WHEN** `package.json` is inspected
- **THEN** `engines.node` is set to `24.x`

#### Scenario: Vercel build uses the pinned Node line
- **WHEN** the Vercel build log for a deployment is read
- **THEN** it reports a Node.js 24 runtime

### Requirement: Production dependencies pass the dependency audit
The repository SHALL commit `package-lock.json`, and production dependencies SHALL have no known vulnerabilities at severity `high` or above when `npm audit --omit=dev` is run against that committed lockfile. The version ranges in `package.json` SHALL NOT admit versions affected by those vulnerabilities.

#### Scenario: Lockfile is tracked
- **WHEN** `git ls-files package-lock.json` is run
- **THEN** it lists `package-lock.json`, and `.gitignore` does not exclude it

#### Scenario: Audit is clean at the high threshold
- **WHEN** `npm audit --omit=dev --audit-level=high` is run
- **THEN** it exits with status 0

#### Scenario: Version floors exclude vulnerable releases
- **WHEN** `package.json` is inspected
- **THEN** the ranges for `express`, `zod`, `@modelcontextprotocol/sdk`, `prisma`, `@prisma/client`, and `@prisma/adapter-pg` have lower bounds at or above the patched versions

### Requirement: Request body parsing uses Express built-ins
The server SHALL parse JSON and URL-encoded request bodies with `express.json()` and `express.urlencoded()` and SHALL NOT import `body-parser` as a package that is not declared in `package.json`.

#### Scenario: No undeclared body-parser import
- **WHEN** the server source is searched for imports of `body-parser`
- **THEN** no import of `body-parser` is found

#### Scenario: JSON body is parsed as before
- **WHEN** an authenticated client sends a JSON request body to an existing endpoint such as `POST /mcp` or `POST /tasks`
- **THEN** the handler receives the parsed object on `req.body` exactly as before the change

#### Scenario: Form-encoded body on Pusher auth is parsed as before
- **WHEN** `pusher-js` posts `socket_id` and `channel_name` as `application/x-www-form-urlencoded` to `/pusher/auth`
- **THEN** the handler receives both fields on `req.body`
