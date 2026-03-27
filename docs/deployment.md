# Deployment

This repository is intended to be deployable by third parties without private setup knowledge.

## 1. GitHub

Target public repository:

- owner: `pajamadot`
- repo: `psyos`

Suggested first push:

```bash
git remote add origin git@github.com:pajamadot/psyos.git
git add .
git commit -m "chore: bootstrap psyos monorepo"
git push -u origin main
```

## 2. Vercel Frontend

Create a Vercel project from the GitHub repo with these settings:

- framework: Next.js
- root directory: `.`
- install command: `pnpm install --frozen-lockfile`
- build command: `pnpm vercel-build`

Environment variables:

```bash
NEXT_PUBLIC_API_URL=https://api.psyos.org
```

See `docs/environment-contract.md` for the current scope and ownership model.

Custom domains:

- `psyos.org`
- `www.psyos.org`

## 3. Cloudflare Worker API

Provision on Cloudflare:

1. Create a D1 database named `psyos`.
2. Replace the placeholder `database_id` in `apps/api/wrangler.toml`.
3. Deploy the worker from `apps/api`.

Before running remote commands, choose an auth mode:

- local operator path: `pnpm exec wrangler login`
- CI or self-host path: `CLOUDFLARE_API_TOKEN` plus `CLOUDFLARE_ACCOUNT_ID`

See `docs/cloudflare-auth.md` for the exact precedence and failure modes.

Commands:

```bash
pnpm --filter @psyos/api db:migrate:remote
pnpm --filter @psyos/api db:seed:remote
pnpm --filter @psyos/api deploy
```

Repo shortcuts:

```bash
pnpm db:migrate:remote
pnpm db:seed:remote
pnpm deploy:api
```

Custom domain:

- `api.psyos.org`

Bootstrap API surfaces:

- OpenAPI JSON: `https://api.psyos.org/api/v1/openapi.json`
- Swagger UI: `https://api.psyos.org/api/v1/docs`

## 3.1 Live Smoke Checks

After a production deploy, verify the canonical public surfaces:

```bash
pnpm smoke:live
```

Default targets:

- web: `https://psyos.org`
- API: `https://api.psyos.org`

Override when needed:

```bash
PSYOS_WEB_URL=https://psyos-zeta.vercel.app PSYOS_API_URL=https://psyos-api.radiantclay.workers.dev pnpm smoke:live
```

The smoke check validates:

- web root returns HTML
- API health returns `{ status: "ok" }`
- OpenAPI JSON is reachable
- maintenance system metadata is reachable and exposes runtime observability
- maintenance gaps are reachable and structured
- maintenance events are reachable as queryable operational records
- maintenance deploy history is reachable as queryable release metadata
- maintenance checklists are reachable as queryable operator guidance
- Swagger UI is reachable
- API surfaces emit runtime headers such as `x-psyos-request-id`

## 3.2 Queryable Operational Surfaces

The hosted platform should expose its own operator state:

- `GET /api/v1/maintenance/system`
- `GET /api/v1/maintenance/events`
- `GET /api/v1/maintenance/deploys`
- `GET /api/v1/maintenance/checklists`

Use these routes as the canonical public control surface before relying on chat or private operator memory.

## 3.3 Rollback-Safe Release Checklist

Use this as the minimum production path:

1. review the pending mutation scope with `git status --short`
2. confirm the intended Cloudflare auth mode with `pnpm exec wrangler whoami`
3. apply remote schema changes first with `pnpm db:migrate:remote` when the release changes persistence
4. deploy the API with `pnpm deploy:api`
5. run `pnpm smoke:live`
6. confirm the deploy and checklist records at `/api/v1/maintenance/deploys` and `/api/v1/maintenance/checklists`
7. if production is unhealthy, roll back to the last healthy release through the provider-native web and API deploy paths, restore database state only if data was actually damaged, and rerun `pnpm smoke:live`

## 3.4 Preview Topology

Preview deploys should not inherit production mutation paths by accident.

See `docs/preview-topology.md` for the reference model covering:

- Vercel preview web deployments
- preview API targets
- preview-only D1 isolation
- validation rules for preview-safe testing

## 4. Local Development

```bash
pnpm dev:web
pnpm dev:api
```

Local defaults:

- web: `http://localhost:3000`
- API: `http://127.0.0.1:8787`

Copy `.env.example` when you need a local web config baseline.

Bootstrap note:

- if `psyos.org` is not yet present in the active Vercel scope, the project can still be created first and the custom domain can be attached later
