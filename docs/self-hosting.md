# Self-Hosting

PsyOS is intended to run both as a hosted product and as a self-deployable open-source stack.

## Day 0 Defaults

- web: Vercel
- API: Cloudflare Workers
- database: D1

## Expectations

- deployment steps must live in this repo
- no private runbook should be required for basic deployment
- any future auth or storage abstraction should preserve the simple hosted path first
- environment and secret ownership must stay explicit for operators

## Current Operator Contract

See `docs/environment-contract.md` for the current environment and secret model.
See `docs/cloudflare-auth.md` for the Cloudflare auth split between local operator login and token-based automation.

Self-hosters should preserve these semantics even if they replace the default providers:

- the web app still needs a public API base URL
- the API still needs a database binding equivalent to `DB`
- deploy verification should still be possible through `pnpm smoke:live` with overridden targets

## Cloudflare Reference Path

For the reference stack, self-hosters should prefer:

- local bring-up and manual maintenance: `pnpm exec wrangler login`
- automation and CI: scoped `CLOUDFLARE_API_TOKEN` plus `CLOUDFLARE_ACCOUNT_ID`

Do not make the global API key your default self-host instructions. It is recovery-only.

## Future Abstractions

- pluggable auth providers
- pluggable object storage for the asset OS
- optional local or alternative SQL backends for self-hosters
