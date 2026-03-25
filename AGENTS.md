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

- do not bake critical research logic into the frontend only
- do not introduce undocumented infra dependencies
- prefer small, reviewable changes with matching docs
- keep contracts stable and version them deliberately
- when adding agent workflows, write down the control surface before automating it

## Definition of Healthy Change

- code builds
- contracts remain explicit
- docs remain current
- deployment assumptions are visible in-repo
