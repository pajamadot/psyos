# Bootstrap Roadmap

PsyOS should expose its own execution state publicly. The platform is part product and part control surface.

## Current Direction

Bootstrap infra is no longer the only concern. The next phase is an infrastructure-hardening program that makes hosted deployment, self-host deployment, and future agent automation reliable from day one.

## Kanban

### Done

- bootstrap public monorepo
- publish `pajamadot/psyos`
- bootstrap Vercel project
- bootstrap Cloudflare Worker and D1
- connect Vercel project to GitHub
- harden edge, deploy, migration, and rollback foundations

### In Progress

- establish observability, deploy history, and audit baseline

### Ready

- bootstrap self-host and operator workflows
- separate human and agent identities with workspace API keys
- public platform roadmap plus workspace/project DAG

### Blocked

- participant matching policy
- safety and moderation policy

### Backlog

- code-first study package layer
- original experiment builder rewrite
- asset OS for research artifacts
- results, replay, and artifact pipeline

## DAG Intent

The bootstrap dependency model is:

1. repo bootstrap
2. repo publication and deploy binding
3. edge, deploy, migration, and secret hardening
4. preview, observability, and self-host workflows
5. roadmap and identity control plane
6. code-first study packages
7. experiment builder, asset OS, and results pipeline

The platform should eventually make this queryable through API and UI, not just markdown.

## Extended Infra Plan

### Phase 1

- verify `psyos.org`, `www.psyos.org`, and `api.psyos.org` as the canonical public entrypoints
- reset the fresh D1 database once so migration history matches the repo exactly
- add deployment smoke checks and a rollback-safe release checklist
- remove any remaining hidden operator knowledge from deploy steps

### Phase 2

- define the environment contract for local, preview, production, and self-host modes
- standardize secret scopes for web, API, and future worker/queue surfaces
- define preview deployment strategy for pull requests and disposable databases

### Phase 3

- add request IDs, structured logs, build/version metadata, uptime checks, and audit events
- make deploy state visible to both humans and agents through API and UI surfaces
- establish operator-facing health and maintenance workflows

### Phase 4

- script self-host bring-up for third parties
- keep the hosted path simple, but ensure it has an explicit abstraction boundary for storage, auth, and background work
- document how self-hosters can replace cloud defaults without forking the codebase structure

### Phase 5

- persist the public platform roadmap plus selected workspace/project DAG and Kanban boards
- add workspace-scoped API key issuance, rotation, and audit surfaces
- prepare the control plane that the study package and runtime layers will sit on top of
