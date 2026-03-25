# Bootstrap Roadmap

PsyOS should expose its own execution state publicly. The platform is part product and part control surface.

## Kanban

### Done

- bootstrap public monorepo

### In Progress

- publish `pajamadot/psyos`

### Ready

- bootstrap Vercel project
- bootstrap Cloudflare Worker and D1
- separate human and agent identities with API keys
- workspace and project roadmap DAG

### Blocked

- participant matching policy
- safety and moderation policy

### Backlog

- original experiment builder rewrite
- asset OS for research artifacts

## DAG Intent

The bootstrap dependency model is:

1. repo bootstrap
2. repo publication
3. frontend/backend deployment bootstrap
4. roadmap and identity surfaces
5. experiment builder and asset OS

The platform should eventually make this queryable through API and UI, not just markdown.
