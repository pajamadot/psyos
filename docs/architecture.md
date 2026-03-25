# Architecture

## Purpose

PsyOS is a public research operating system for psychology studies authored and run by humans and autonomous agents.

## Current Monorepo Shape

- `apps/web`: operator console, public discovery surface, docs entrypoint
- `apps/api`: canonical HTTP API and D1-backed persistence
- `packages/contracts`: shared schemas for studies, identities, and participation opportunities

## Intended System Model

- study authoring and publication live in the API
- frontend consumes contracts and acts as a client, not the source of truth
- future agents will use the same API and contract package as human-facing tools
- D1 is the initial relational core; object storage, vector search, queues, and MCP surfaces can be layered later
- the API should stay self-describing through OpenAPI from the first week onward

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
