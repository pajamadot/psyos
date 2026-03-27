# Preview And Staging Topology

PsyOS should not let preview deploys inherit production assumptions by accident. This document defines the intended preview and staging posture for the open-source reference stack.

## Goals

- every pull request can have a web preview
- preview web should target a preview-safe API surface
- preview traffic should not mutate production state
- the topology should stay simple enough for self-hosters to reproduce

## Day 0 Rule

Preview is a separate topology concern, not just "whatever Vercel created for the PR".

Until a full preview API path is automated, treat production and preview as different trust zones.

## Current Reference Model

### Production

- web: `https://psyos.org`
- API: `https://api.psyos.org`
- database: production D1 `psyos`

### Preview

- web: Vercel preview deployment URL for the branch or pull request
- API: dedicated preview API URL or Workers preview target
- database: preview-only D1 database, never the production `psyos` database

## Safe Defaults

- never point preview web at the production write-path by default
- never reuse the production D1 binding for preview testing that can mutate state
- if preview API isolation is unavailable, limit previews to static and read-only verification until isolation exists

## Recommended Reference Path

1. Vercel generates a preview web deployment per pull request.
2. The preview web deployment reads a preview-specific `NEXT_PUBLIC_API_URL`.
3. The preview API points to a separate Worker environment or preview worker.
4. The preview API binds to a separate D1 database.
5. Preview smoke checks run against the preview web and preview API pair, not production.

## Naming Guidance

Suggested naming for the reference stack:

- preview web: provider-generated Vercel preview URLs
- preview API: `preview-api.psyos.org` or a preview worker URL
- preview database: `psyos-preview` or `psyos-pr-<number>` depending on automation maturity

## Database Isolation Options

### Shared Preview Database

Use one preview-only database such as `psyos-preview` when:

- schema testing matters more than branch isolation
- branch concurrency is low
- data collisions are acceptable inside preview only

### Per-PR Preview Database

Use disposable databases such as `psyos-pr-123` when:

- pull requests need isolation
- schema and data mutations are frequent
- automation is mature enough to create and clean up databases reliably

## Current PsyOS Decision

The reference path should evolve toward:

- Vercel preview web
- preview API binding
- preview-only D1

but production mutation from preview must already be treated as a bug even before full automation exists.

## Validation

For preview topology work, validation should answer:

1. what web URL is under test
2. what API URL it targets
3. what database that API is bound to
4. whether writes are isolated from production

