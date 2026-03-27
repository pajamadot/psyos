# Asset OS

PsyOS should treat research artifacts the way a serious agent platform treats build artifacts.

## Direction

- content-addressed storage for stimuli, logs, replay traces, bundles, and published artifacts
- immutable object storage as the durability layer
- per-job writable workspace, then promote outputs into the asset store
- manifests instead of ad-hoc shared writable directories
- stable references from studies, runs, analyses, and publications back to artifact hashes

## Why

- agents need reproducible inputs and outputs
- replay and analysis become much easier when artifacts are addressable
- self-hosters need a simple mental model for moving data between execution and storage

## Current State

PsyOS now has an initial Asset OS control plane:

- persisted asset metadata in D1
- seeded dogfood study artifacts
- `GET /api/v1/asset-os/manifest` as the first manifest surface
- dogfood overview responses that include asset records alongside studies and opportunities

This means the platform can already answer:

- which artifacts exist for the current dogfood workspace
- which study a manifest entry belongs to
- what logical role an asset plays
- which content hash and storage key identify that artifact

## Remaining Gap

The object-store durability and promotion path is still incomplete.

Still missing:

- object storage binding for immutable binary payloads
- upload and promotion routes
- content-hash deduplication enforcement at write time
- publish-time bundle manifests that are materialized from generated outputs instead of seeded rows
