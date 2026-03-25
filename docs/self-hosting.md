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

## Future Abstractions

- pluggable auth providers
- pluggable object storage for the asset OS
- optional local or alternative SQL backends for self-hosters
