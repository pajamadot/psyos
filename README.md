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
- `.claude/skills`: project-local Codex skills, including the self-improvement meta-iteration loop

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
- Next.js server components read `PSYOS_API_URL`
- browser-side auth and client fetches read `NEXT_PUBLIC_API_URL`

## Engineering Principles

- OSS-first: every critical setup step must be documented in-repo
- agent-first: architecture, contracts, and workflows must be legible to agents
- API-first: the web app is not the source of truth for research state
- deployment-ready: the repo should always explain how to run on Vercel and Cloudflare
- no hidden context: if a change matters, document it
- issue-first development: feature work starts from a GitHub issue with color-coded labels, not directly from code
- workspace-first: the workspace should become the canonical research container, while one project maps to one study for now
- control-system mindset: optimize for controllability, observability, and feedback density, not just raw model capability
- real dogfooding: improve PsyOS by running real studies through it and capturing the friction explicitly

## Agent-Friendly Surfaces

- `GET /api/v1/maintenance/system`: runtime version, deployment model, and platform map
- `GET /api/v1/discover/meta-process`: canonical PsyOS workflow
- `GET /api/v1/discover/operating-guide`: stage-by-stage operating playbook
- `GET /api/v1/maintenance/gaps`: missing capabilities and next infra or product constraints
- `GET /api/v1/maintenance/events`: operational timeline of major infrastructure and control-plane mutations
- `GET /api/v1/maintenance/deploys`: queryable deploy history for the hosted stack
- `GET /api/v1/maintenance/checklists`: deploy and rollback operator checklists exposed as data
- `GET /api/v1/asset-os/manifest`: current Asset OS manifest for persisted research artifacts
- `GET /api/v1/dogfood/overview`: live dogfood workspace, studies, opportunities, roadmap, and assets
- `GET /api/v1/workspaces/{workspaceSlug}/snapshot`: workspace-scoped control-plane snapshot
- `GET /api/v1/workspaces/{workspaceSlug}/roadmap`: workspace-scoped kanban + DAG roadmap
- web workspace shell: `/workspaces/psyos-lab`
- API runtime headers: `x-psyos-request-id`, `x-psyos-runtime-version`, `x-psyos-deploy-environment`, `x-psyos-commit`

The translation rationale from `pajama-game-studio` is documented in `docs/pajama-principles-absorption.md`.

## Initial Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Browser E2E

Frontend auth and user UX flows now have Playwright coverage against a local Next.js app and a local Hono API test server backed by an in-memory D1 shim.

Run once on a new machine:

```bash
pnpm test:e2e:install
```

Run the browser suite:

```bash
pnpm test:e2e:web
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

## Collaboration

- contributor workflow: `docs/collaboration-workflow.md`
- issue label palette: `docs/issue-label-palette.md`
- self-iteration protocol: `coordination/self-iteration-workflow.md`
- project-local meta skill: `.claude/skills/running-meta-iterations/`
- project-local absorption skill: `.claude/skills/absorbing-platform-patterns/`
- project-local capability evolution skill: `.claude/skills/running-capability-evolution/`
- auditable evolution assets and ledger: `coordination/evolution/`

## Operator Contract

- environment and secret model: `docs/environment-contract.md`
- Cloudflare operator and token auth modes: `docs/cloudflare-auth.md`
- auth and user system: `docs/auth-system.md`
- deployment path: `docs/deployment.md`
- self-host path: `docs/self-hosting.md`
- preview and staging topology: `docs/preview-topology.md`
