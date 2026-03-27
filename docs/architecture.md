# Architecture

## Purpose

PsyOS is a public research operating system for psychology studies authored and run by humans and autonomous agents.

## Core Design Translation

PsyOS should absorb the durable operating patterns from `pajama-game-studio` without importing game-specific assumptions.

- workspace-first: the workspace becomes the canonical research container
- project-first execution: one project maps to one study for now
- agent-facing architecture: system state should be visible through API, docs, and skills
- control-system framing: optimize for controllability, observability, and feedback density
- real dogfooding: evolve the platform by running real studies through it

## Current Monorepo Shape

- `apps/web`: operator console, public discovery surface, docs entrypoint
- `apps/api`: canonical HTTP API and D1-backed persistence
- `packages/contracts`: shared schemas for studies, identities, and participation opportunities

## Intended System Model

- the workspace is the long-lived lab and research context container
- each project maps to one study for now, while the broader model stays extensible
- study packages and published versions are realizations of the same workspace context, not disconnected silos
- study authoring and publication live in the API
- frontend consumes contracts and acts as a client, not the source of truth
- future agents will use the same API and contract package as human-facing tools
- D1 is the initial relational core; object storage, vector search, queues, and MCP surfaces can be layered later
- the API should stay self-describing through OpenAPI from the first week onward

## Three-Plane Architecture

### Control Plane

- Cloudflare Workers + D1
- workspaces, projects, identities, API keys, study packages, publishes, opportunities, DAG state, and results metadata
- explicit discovery, maintenance, and gap-reporting surfaces

### Data Plane

- Asset OS for stimuli, uploads, run logs, replay traces, bundles, and analysis artifacts
- content-addressed manifests and artifact references
- no hidden local filesystem assumptions in the product model

### Presentation Plane

- Next.js operator and public visibility surface
- GitHub for open-source collaboration and review
- docs and project-local skills as first-class operating surfaces

## Auth Boundary

PsyOS should keep auth as three separate layers:

- authn kernel: users, email tokens, OAuth accounts, browser sessions
- access control: workspace memberships, roles, and API keys
- actor projection: the normalized actor context that studies, assets, roadmap, and publishing consume

The rest of the platform should depend on actor context and capability checks, not on raw cookies, OAuth payloads, or email token tables.

Domain routes should expose an explicit access envelope as part of their public contract:

- workspace visibility: `public` or `private`
- route access mode: `public_read` or `workspace_member`
- viewer projection: authenticated state, auth method, workspace role, identity handle, and derived capabilities

That keeps auth decoupled without making domain routes blind. The route can stay self-describing while still hiding auth internals.

## Agent-Friendly Operating Surface

Agents should not need private repo lore to operate PsyOS correctly. The system should expose:

- runtime metadata and deployment posture
- the canonical meta-process
- the operating guide
- current gaps and next actions
- project-local reflective and absorption skills

## Day 0 Data Concepts

- workspaces and projects as the planning container
- identities: humans and agents with provenance
- identity API keys for agent automation
- studies: authored research units with protocol metadata
- publications: immutable snapshots of study versions
- opportunities: open calls for participants
- enrollments: participation requests and outcomes
- roadmap columns, items, and dependency edges
- content-addressed assets for future artifact storage

## Non-Goals For The Bootstrap

- full experiment runtime parity with existing Cogix tooling
- production moderation stack
- payment rails
- advanced orchestration before the domain model is stable

## Architecture Cautions

- do not translate game-specific projections, engine assumptions, or large role taxonomies into PsyOS
- do not let repo files become the only execution record once platform control surfaces exist
- keep the control plane explicit and legible instead of magically smart
