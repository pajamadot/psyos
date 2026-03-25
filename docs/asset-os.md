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

## Bootstrap State

The database now reserves an `assets` table for this direction, but the actual asset gateway and CAS workflow are not implemented yet.
