# Cloudflare Auth Modes

PsyOS needs a Cloudflare operator path that works locally and a token-based path that works in CI or self-hosted automation.

This document defines both.

## Rule

- prefer `wrangler login` for local interactive operator work
- prefer scoped API tokens for CI and reproducible self-host automation
- treat the Cloudflare global API key as emergency-only fallback
- never commit credential files or shell exports into the repo

## Precedence

Wrangler will prefer explicit environment credentials over stored interactive login state.

That means:

- if `CLOUDFLARE_API_TOKEN` is set in the shell, Wrangler will use it
- if `CLOUDFLARE_API_TOKEN` is unset, Wrangler can fall back to `wrangler login`
- if `CLOUDFLARE_API_KEY` and `CLOUDFLARE_EMAIL` are set, they can also override interactive login

When local commands behave strangely, check which auth mode is actually active with:

```bash
pnpm exec wrangler whoami
```

## Mode 1: Local Operator Login

Use this on a trusted local machine when you are doing interactive work such as:

- deploying the Worker manually
- applying D1 migrations
- inspecting account or binding state

Flow:

```bash
pnpm exec wrangler login
pnpm exec wrangler whoami
pnpm db:migrate:remote
pnpm deploy:api
```

Guidelines:

- do not leave a conflicting `CLOUDFLARE_API_TOKEN` exported in the same shell
- use this mode for human-operated maintenance, not for CI
- keep the login state on the operator machine only

## Mode 2: Scoped API Token

Use this for:

- CI
- self-host deployment automation
- deterministic non-interactive scripts

Required variables:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Recommended permission model:

- Workers scripts edit/deploy
- D1 edit/read for the target database
- zone or route permissions only if the automation also manages domains

Example:

```bash
$env:CLOUDFLARE_API_TOKEN="..."
$env:CLOUDFLARE_ACCOUNT_ID="..."
pnpm db:migrate:remote
pnpm deploy:api
```

If the token can identify the account but cannot operate on D1, commands may fail with errors such as:

- Cloudflare `7403`
- Cloudflare `10000`

That means the token exists but is under-scoped for the requested action.

## Emergency Fallback: Global API Key

The Cloudflare global API key can work for recovery operations, but it should not be the standard PsyOS path.

Use it only when:

- the scoped token is broken or under-scoped
- you need to recover a production migration quickly
- you are on a trusted operator machine

Do not use it for:

- CI
- normal self-host instructions
- long-lived shell profiles

If you must use it temporarily, set:

- `CLOUDFLARE_API_KEY`
- `CLOUDFLARE_EMAIL`

Then remove those variables once the recovery step is complete.

## Known PsyOS Failure Mode

We already hit this in the real repo:

- a `CLOUDFLARE_API_TOKEN` existed and worked for account identification
- the same token was not authorized for D1 operations
- remote migration failed until the operator switched auth mode

The fix is not “try harder with Wrangler.” The fix is:

1. inspect active auth mode with `pnpm exec wrangler whoami`
2. decide whether this is local interactive work or automation
3. use either `wrangler login` or a correctly scoped API token
4. reserve the global API key for emergency-only recovery

## Open-Source Operator Expectation

The PsyOS reference path should be reproducible without private lore.

That means:

- docs must explain both login and token paths
- self-hosters should be able to choose the token path without reverse engineering hosted operator habits
- local operators should be able to recover with `wrangler login` even when a broken token is present in another shell
