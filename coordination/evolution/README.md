# Capability Evolution

This directory holds the reusable assets and audit trail for PsyOS self-improvement.

The goal is to turn ad hoc "keep iterating" requests into a repeatable protocol:

1. inspect the current signal
2. choose a strategy preset
3. select a reusable gene or capsule
4. apply a narrow mutation
5. validate it
6. log an evolution event

## Files

- `genes.json`: reusable mutation patterns keyed to recurring signals
- `capsules.json`: higher-level iteration bundles for common workflows
- `event-schema.json`: the JSON shape for audit events
- `events.ndjson`: append-only event ledger for completed evolution cycles

## Strategy Presets

- `balanced`: default mix of hardening and forward progress
- `harden`: reduce risk, drift, and hidden operator knowledge
- `innovate`: allow new surface creation when foundations are sufficient
- `repair-only`: fix regressions or broken control surfaces without widening scope

## Current Rule

Do not log an event until the mutation is real, validated, and reflected in the repo.

