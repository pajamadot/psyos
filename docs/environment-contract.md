# Environment And Secret Contract

PsyOS should not depend on tribal knowledge for configuration. This document defines the current environment and secret contract for local development, hosted deployment, and self-hosting.

## Current Rule

- document every required variable in-repo
- separate public runtime configuration from operator secrets
- keep the hosted path simple
- make self-host overrides explicit instead of magical

## Web Environment

### Required

| Variable | Scope | Example | Purpose |
|----------|-------|---------|---------|
| `NEXT_PUBLIC_API_URL` | local, preview, production, self-host | `https://api.psyos.org` | Public base URL the web app uses to call the API |

### Optional

| Variable | Scope | Example | Purpose |
|----------|-------|---------|---------|
| `PSYOS_WEB_URL` | local operator shell | `https://psyos.org` | Override target for `pnpm smoke:live` |
| `PSYOS_API_URL` | local operator shell | `https://api.psyos.org` | Override API target for `pnpm smoke:live` |

## Auth And Email Environment

These variables are reserved for the human user system and should be wired before enabling registration.

| Variable | Scope | Example | Purpose |
|----------|-------|---------|---------|
| `AUTH_SESSION_SECRET` | reserved | generated secret | Reserved for future signed session or token flows |
| `AUTH_COOKIE_DOMAIN` | local, preview, production | `psyos.org` | Domain used for browser session cookies across web and API subdomains |
| `AUTH_SESSION_TTL_DAYS` | local, preview, production | `30` | Browser session lifetime in days |
| `AUTH_GOOGLE_CLIENT_ID` | hosted, self-host | OAuth client id | Human OAuth via Google |
| `AUTH_GOOGLE_CLIENT_SECRET` | hosted, self-host secret | OAuth client secret | Human OAuth via Google |
| `AUTH_GITHUB_CLIENT_ID` | hosted, self-host | OAuth client id | Human OAuth via GitHub |
| `AUTH_GITHUB_CLIENT_SECRET` | hosted, self-host secret | OAuth client secret | Human OAuth via GitHub |
| `AUTH_EMAIL_PROVIDER` | local, preview, production | `preview`, `mailpit`, or `resend` | Selects transactional email backend |
| `AUTH_EMAIL_FROM` | local, preview, production | `auth@psyos.org` | Sender address for auth mail |
| `AUTH_RESEND_API_KEY` | hosted, self-host secret | `re_xxx` | Hosted transactional mail through Resend |
| `AUTH_E2E_TEST_EMAIL` | local operator validation | `you@example.com` | Optional recipient for the real Resend auth verification flow |
| `MAILPIT_SMTP_URL` | local, CI | `smtp://127.0.0.1:1025` | Local SMTP target for auth email integration tests |
| `MAILPIT_HTTP_URL` | local, CI | `http://127.0.0.1:8025` | Mailpit inbox API for integration assertions |

Current implementation note:

- browser sessions are opaque database-backed cookies issued by the API
- `AUTH_SESSION_SECRET` is still reserved, but not required for the current opaque-session implementation
- `preview` email mode is intended for local browser dogfooding only, not production

## API Environment

Current API runtime configuration is intentionally minimal.

### Worker Variables

| Variable | Scope | Current Source | Purpose |
|----------|-------|----------------|---------|
| `APP_NAME` | worker runtime | `apps/api/wrangler.toml` | Service label exposed by the bootstrap API |
| `APP_VERSION` | worker runtime | `apps/api/wrangler.toml` | Runtime version exposed by maintenance metadata and headers |
| `DEPLOY_ENVIRONMENT` | worker runtime | `apps/api/wrangler.toml` | Runtime environment label exposed by maintenance metadata and headers |
| `DEPLOYED_VIA` | worker runtime | `apps/api/wrangler.toml` | Deploy channel label such as `wrangler` |
| `GIT_COMMIT` | worker runtime | `apps/api/wrangler.toml` or deploy-time override | Commit identifier exposed by maintenance metadata and headers |
| `PUBLIC_API_URL` | worker runtime | `apps/api/wrangler.toml` | Canonical public API URL exposed by maintenance metadata |
| `PUBLIC_WEB_URL` | worker runtime | `apps/api/wrangler.toml` | Canonical public web URL exposed by maintenance metadata |

### Non-Env Runtime Bindings

| Binding | Scope | Source | Purpose |
|---------|-------|--------|---------|
| `DB` | worker runtime | `apps/api/wrangler.toml` `[[d1_databases]]` | D1 database binding for PsyOS state |

## Hosted Deployment Contract

### Vercel

- set `NEXT_PUBLIC_API_URL` for production, preview, and development
- keep the root directory at `.` and use the repo-level `vercel.json`
- ensure preview deployments use a preview-safe API base URL once preview API isolation exists

### Cloudflare Workers

- keep the canonical D1 binding in `apps/api/wrangler.toml`
- apply remote migrations before production deploys when schema changes
- redeploy the worker after binding or migration changes
- keep preview bindings separate from production bindings
- use `wrangler login` for local interactive operator work unless a scoped token is intentionally being tested
- use `CLOUDFLARE_API_TOKEN` plus `CLOUDFLARE_ACCOUNT_ID` for CI and self-host automation
- avoid using `CLOUDFLARE_API_KEY` except as an emergency operator fallback

See `docs/cloudflare-auth.md` for precedence and recovery rules.

## Self-Hosting Contract

At minimum, a self-hoster must provide:

- a public web origin
- a public API origin
- a SQL backend compatible with the PsyOS persistence layer, starting with D1 in the reference path
- any platform-specific deployment credentials outside the repo

The required translation layer for self-hosters is:

- map their chosen public API URL into `NEXT_PUBLIC_API_URL`
- provide a database binding equivalent to `DB`
- preserve the documented smoke-check targets or override them explicitly

## Secrets Boundary

These values are operator secrets and should not be committed:

- Cloudflare API credentials used by `wrangler`
- Cloudflare global API keys
- Vercel authentication and project access
- future workspace or service API keys
- OAuth client secrets
- transactional email provider API keys
- session signing secrets

PsyOS should prefer provider-native secret stores over ad hoc local secret files.

## Validation

When deploy configuration changes:

1. update `.env.example` if the public contract changed
2. update this document if scope or ownership changed
3. run `pnpm smoke:live` against the intended live or preview targets

For local real-email auth verification, also use:

- `pnpm auth:e2e:resend`

For Cloudflare auth verification, also use:

- `pnpm exec wrangler whoami`

## Observability Headers

Current API responses expose these runtime headers:

- `x-psyos-request-id`
- `x-psyos-runtime-version`
- `x-psyos-deploy-environment`
- `x-psyos-commit`

These headers are part of the operator contract for API surfaces. The web surface is not expected to emit them.
