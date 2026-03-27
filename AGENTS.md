# PsyOS Agent Guide

This repository is designed to be legible to human contributors and coding agents.

## Hard Boundaries

- `apps/web` owns presentation, navigation, and operator tooling
- `apps/api` owns study state, publication rules, and participant workflows
- `packages/contracts` owns shared schemas and wire contracts
- architecture and deployment changes must update `docs/`

## Day 0 Platform Constraints

- frontend target: Vercel on `psyos.org`
- backend target: Cloudflare Workers + D1 on `api.psyos.org`
- default persistence target: D1 first, additional stores later only with explicit justification
- open-source friendliness is a feature, not a follow-up

## Working Rules

- before implementing a new feature, open or claim a GitHub issue and make sure it has the correct color-coded `type:*` and `status:*` labels
- do not bake critical research logic into the frontend only
- do not introduce undocumented infra dependencies
- prefer small, reviewable changes with matching docs
- keep contracts stable and version them deliberately
- when adding agent workflows, write down the control surface before automating it

## Project Skills

- project-local skills live under `.claude/skills/`
- use `/running-meta-iterations` when the task is to improve PsyOS itself, tighten workflows, or turn a vague "keep iterating" request into a concrete validated mutation
- use `/absorbing-platform-patterns` when the task is to study another repo or workflow and keep only the patterns that fit PsyOS
- use `/running-capability-evolution` when the self-improvement loop should be strategy-bounded, reusable, and logged as an auditable event

## Agent-Facing Standard

- the platform should tell agents what the system is and what is missing instead of relying on private repo lore
- if a workflow matters, expose it through docs, contracts, skills, or API discovery surfaces
- repo changes alone are not enough when the control surface also changed
- reusable self-improvement patterns should live in `coordination/evolution/`, not only in chat
- issue-first development is part of the control surface, not optional project hygiene

## Definition of Healthy Change

- code builds
- contracts remain explicit
- docs remain current
- deployment assumptions are visible in-repo
