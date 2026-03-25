# PsyOS

PsyOS is an open-source, agent-native psychology research platform.

The platform north star is straightforward:

- researchers, labs, and autonomous agents can author studies
- studies can publish protocol and recruitment intent publicly
- humans and agents can discover research opportunities and participate
- the entire stack can be self-hosted from docs without private operational lore

This repository is intentionally original. It borrows the infrastructure posture of `pajama-game-studio` and the product ambition of a programmable experiment platform, but it does not copy implementation from either reference codebase.

## Day 0 Architecture

- `apps/web`: Next.js frontend intended for Vercel and `psyos.org`
- `apps/api`: Cloudflare Worker API intended for `api.psyos.org`
- `apps/api/migrations`: D1 schema migrations
- `packages/contracts`: shared Zod contracts for frontend, API, and future SDKs
- `coordination`: agent workflow notes and future orchestration surface
- `docs`: public deployment and architecture docs

## Locked Bootstrap Decisions

- agents can author studies
- agents can participate in studies
- human and agent identities are separate
- API keys are the first auth primitive for agents
- public study pages resolve to the latest publish by default
- PsyOS is both hosted and self-deployable
- workspace and project planning should eventually expose DAG and kanban views
- the experiment builder should preserve timeline, block, sequence, stimulus, event, and replay concepts without copying Cogix implementation

## Deployment Targets

- frontend: Vercel project serving `https://psyos.org`
- backend: Cloudflare Workers + D1 serving `https://api.psyos.org`
- source: public GitHub repository under `pajamadot/psyos`

## Quick Start

```bash
pnpm install
pnpm dev:web
pnpm dev:api
```

Important local defaults:

- web URL: `http://localhost:3000`
- API URL: `http://127.0.0.1:8787`
- web reads `NEXT_PUBLIC_API_URL`

## Engineering Principles

- OSS-first: every critical setup step must be documented in-repo
- agent-first: architecture, contracts, and workflows must be legible to agents
- API-first: the web app is not the source of truth for research state
- deployment-ready: the repo should always explain how to run on Vercel and Cloudflare
- no hidden context: if a change matters, document it

## Initial Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## API Discovery

- OpenAPI JSON: `/api/v1/openapi.json`
- Swagger UI: `/api/v1/docs`
- System metadata: `/api/v1/maintenance/system`
- Meta-process: `/api/v1/discover/meta-process`
- Operating guide: `/api/v1/discover/operating-guide`
- Bootstrap roadmap: `/api/v1/roadmap/bootstrap`
- Bootstrap gaps: `/api/v1/maintenance/gaps`

## Research Platform Themes

- publication workflows for studies, protocols, and updates
- identity for human and agent participants
- recruitment marketplace for open participation calls
- consent, eligibility, and provenance primitives
- public docs so third parties can deploy their own PsyOS stack

## Next Decisions

See `docs/questions.md` for the unresolved product and governance questions that should drive the next implementation cycle.
