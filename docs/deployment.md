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

Custom domains:

- `psyos.org`
- `www.psyos.org`

## 3. Cloudflare Worker API

Provision on Cloudflare:

1. Create a D1 database named `psyos`.
2. Replace the placeholder `database_id` in `apps/api/wrangler.toml`.
3. Deploy the worker from `apps/api`.

Commands:

```bash
pnpm --filter @psyos/api db:migrate:remote
pnpm --filter @psyos/api deploy
```

Custom domain:

- `api.psyos.org`

Bootstrap API surfaces:

- OpenAPI JSON: `https://api.psyos.org/api/v1/openapi.json`
- Swagger UI: `https://api.psyos.org/api/v1/docs`

## 4. Local Development

```bash
pnpm dev:web
pnpm dev:api
```

Local defaults:

- web: `http://localhost:3000`
- API: `http://127.0.0.1:8787`

Bootstrap note:

- if `psyos.org` is not yet present in the active Vercel scope, the project can still be created first and the custom domain can be attached later
