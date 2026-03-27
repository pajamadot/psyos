# Auth System

PsyOS needs a complete user system, not just agent credentials.

## Current Position

- humans need first-class product accounts
- agents keep workspace-scoped API keys
- research identities stay separate from product login accounts
- auth must work on the hosted stack and remain self-hostable
- email magic-link request, consume, session, and sign-out routes are live now

## Recommended Baseline

### Human sign-in

- Google OAuth for lowest-friction onboarding
- GitHub OAuth for technical collaborators and OSS contributors
- email magic link as the fallback path

### Agent sign-in

- workspace-scoped API keys for machine access
- later: optional OAuth client credentials if we need delegated machine-to-machine auth

### Session model

- opaque, httpOnly session cookies for the web
- revocable backend session records in the API database
- explicit workspace memberships instead of implicit ownership

## Data Model

The database should treat these as separate layers:

- `users`: product accounts
- `user_emails`: verified email addresses
- `oauth_accounts`: linked external identities
- `user_sessions`: browser or operator sessions
- `email_login_tokens`: magic-link and verification tokens
- `workspace_memberships`: permissions in a workspace
- `identities`: research-facing human or agent entities used by studies

This keeps operator auth separate from participant or agent identities used inside research protocols.

## Decoupling Rule

Auth should not be one blob.

- authn kernel proves identity: `users`, `user_emails`, `oauth_accounts`, `email_login_tokens`, `user_sessions`
- access control answers workspace permission: `workspace_memberships`, later agent key policy
- actor projection maps a logged-in user or agent key to one normalized actor context for the rest of the platform

Study, asset, roadmap, and publish code should depend on actor context and capability checks, not on direct reads from auth token or session tables.

Current domain contract direction:

- workspace and Asset OS routes stay readable as domain APIs
- each workspace-scoped route projects `access.mode` plus a normalized `viewer`
- private workspaces require membership-derived `workspace.read`
- public workspaces can still expose richer viewer capabilities when the caller is signed in

## Email Provider

### Hosted default

- `Resend`

Reason:

- low operational overhead
- cheap for low to moderate transactional volume
- straightforward API
- easy domain verification
- sent-email APIs are good enough to automate a real request-link retrieval flow in local operator verification

### Local and integration test default

- `Mailpit`
- `preview` mode is also available when no provider is configured locally

Reason:

- deterministic local inbox
- no live provider dependency in integration tests
- simple SMTP + HTTP API for assertions
- preview mode makes browser dogfooding possible before SMTP or Mailpit is wired

## Integration Test Contract

Auth integration tests should eventually cover:

1. create email login token
2. deliver message to Mailpit
3. read the inbox through Mailpit HTTP API
4. redeem the token
5. create a session
6. verify workspace membership bootstrap

Current automated coverage already verifies:

1. migration-backed auth tables on a SQLite-backed D1 shim
2. Mailpit HTTP delivery payload emission
3. token redemption into a session cookie
4. workspace membership bootstrap
5. research identity projection
6. session revocation on sign-out

## Frontend E2E Coverage

The browser layer now has Playwright coverage for the first user-facing auth flows.

Current browser scenarios verify:

1. anonymous settings page state
2. preview magic-link request UX
3. preview link consumption into an authenticated browser session
4. session inventory visibility in the settings page
5. remote session revocation from a second browser context
6. sign-out UX returning the page to anonymous state

Run once on a new machine:

```bash
pnpm test:e2e:install
```

Run the browser suite:

```bash
pnpm test:e2e:web
```

The local browser suite uses:

- a local Next.js app on `http://127.0.0.1:3100`
- a local Hono API test server on `http://127.0.0.1:8788`
- `PSYOS_API_URL` and `NEXT_PUBLIC_API_URL` both pointed at that local API
- preview email mode
- an in-memory D1 test database seeded from the repo migrations and dogfood seed

## Local Resend E2E Verification

PsyOS now has an opt-in local verification path for real Resend delivery.

Required local inputs in `.env.local`:

- `AUTH_RESEND_API_KEY`
- `AUTH_EMAIL_FROM`
- optional `AUTH_E2E_TEST_EMAIL`

If `AUTH_E2E_TEST_EMAIL` is omitted, the verifier falls back to the parsed sender address from `AUTH_EMAIL_FROM`.

Run:

```bash
pnpm auth:e2e:resend
```

That command performs:

1. request magic link
2. send through Resend
3. retrieve the sent email from Resend using the returned email id
4. extract the login URL
5. consume the token
6. verify authenticated session
7. sign out

This is intentionally separate from the default test suite because it performs real network calls and costs real email volume.

OAuth integration should be tested with provider stubs or preview credentials, not against uncontrolled live production credentials.

## Frontend Contract

The web app should depend on an auth abstraction layer, not directly on a specific provider SDK.

That layer should expose:

- current user
- current session state
- sign-in entrypoints
- sign-out
- token retrieval for API calls when needed

## Backend Contract

The API should own:

- session issuance and validation
- email token issuance and redemption
- OAuth callback completion
- workspace membership resolution
- agent API key verification

Current live routes:

- `GET /api/v1/auth/config`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/email/request-link`
- `POST /api/v1/auth/email/consume-link`
- `POST /api/v1/auth/sign-out`

## Deployment Contract

- hosted mode: Vercel web + Cloudflare Worker API + Resend
- local dev: local web + local worker + Mailpit
- self-host: replaceable OAuth and email providers, same storage contract
