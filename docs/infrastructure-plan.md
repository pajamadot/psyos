# Infrastructure Plan

This is the current critical path for PsyOS. Infrastructure is not "done" after the first deploy. It is part of the product because humans and agents must be able to understand, operate, deploy, and extend the platform without private operator context.

## Phase 1: Harden The Bootstrap

- verify the canonical public endpoints: `psyos.org`, `www.psyos.org`, and `api.psyos.org`
- reset and recreate the fresh D1 database so remote migration history exactly matches the repo
- add deployment smoke checks for web, API health, system metadata, and OpenAPI availability
- define a rollback-safe bootstrap checklist

## Phase 2: Environment And Secret Contract

- formalize environment variables for local, preview, production, and self-host modes
- document secret ownership and scope for Vercel, Cloudflare, GitHub Actions, and future worker surfaces
- make deploy commands deterministic and non-tribal

## Phase 3: Preview And Staging Topology

- decide how preview web deployments map to preview APIs
- decide whether preview databases are per-branch, per-pull-request, or shared
- define data isolation rules so previews never mutate production state
- make the topology reproducible for self-hosters, not just the hosted stack

## Phase 4: Observability And Operations

- add request IDs and structured logs to every API request
- expose build and version metadata in public system endpoints
- add uptime checks and audit events
- make operational state queryable for both humans and agents

Current progress:

- request IDs and runtime headers are exposed on API responses
- `maintenance/system` now exposes runtime, deploy, and observability metadata
- `maintenance/gaps` now returns structured actionable gaps
- `maintenance/events` exposes the current operational timeline as queryable records
- `maintenance/deploys` exposes the bootstrap deploy history as queryable release metadata
- `maintenance/checklists` exposes deploy and rollback operator guidance as queryable records
- live smoke checks verify the main API observability surfaces

Current focus:

- keep observability moving past bootstrap metadata into richer audit events, uptime signals, and persisted control-plane state
- keep the self-host/operator path aligned with the same public maintenance surfaces instead of a private runbook

## Phase 5: Self-Hosting And Open Source Operator UX

- provide an explicit self-host path without relying on Vercel or Cloudflare-only assumptions
- document replaceable storage, SQL, and auth seams
- make first-time bring-up possible from repo docs alone

## Phase 6: Control Plane Foundations

- persist the public platform roadmap
- persist selected workspace and project DAG/Kanban boards
- add workspace-scoped API key issuance, rotation, revocation, and audit surfaces
- define the package publish model and latest-resolution rules

## Phase 7: Asset And Runtime Infrastructure

- establish Asset OS as a content-addressed storage and manifest layer
- store stimuli, uploads, run logs, replay traces, bundles, and analysis artifacts
- define the interface that study packages and results pipelines will use

## Why This Comes Before More Product Surface

The study-kit, runtime, and results layers will move faster if:

- deployment is deterministic
- environments are explicit
- logs and failures are visible
- storage seams are planned up front
- agents can inspect system state without asking operators what exists
