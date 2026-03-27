---
name: running-capability-evolution
description: Use this skill when a PsyOS self-improvement request should follow a stricter capability-evolution protocol with strategy presets, reusable genes or capsules, validation, and an auditable event log.
---

# Running Capability Evolution

Use this skill when PsyOS should improve itself through a structured loop instead of open-ended iteration. This skill is the PsyOS-native translation of a capability-evolver pattern: signal-driven, strategy-bounded, reusable, and auditable. ultrathink

## Outcome

Leave behind:

- one narrow validated mutation
- updated control surfaces in the repo
- an appended evolution event in `coordination/evolution/events.ndjson`

## Inputs

Read these first:

- `coordination/evolution/README.md`
- `coordination/evolution/genes.json`
- `coordination/evolution/capsules.json`
- `coordination/evolution/event-schema.json`
- `docs/infrastructure-plan.md`
- `docs/collaboration-workflow.md`
- `coordination/self-iteration-workflow.md`

## Strategy Presets

- `balanced`: default mode
- `harden`: use when reliability, drift reduction, or operator legibility is the priority
- `innovate`: use when a new control surface is the real bottleneck
- `repair-only`: use when fixing regressions or broken flows without widening scope

## Loop

1. Identify the current signal.
2. Choose the narrowest valid strategy preset.
3. Match the signal to a gene or capsule when possible.
4. Apply one small high-leverage mutation.
5. Validate it.
6. Log an event with `pnpm evolution:log ...`.

## Logging Contract

Every event should include:

- `strategy`
- `signal`
- `mutation`
- at least one `validation`
- `nextConstraint`

Use gene and capsule ids when they fit the mutation.

## Anti-Patterns

- widening scope because the strategy is unclear
- mutating without validation
- failing to log the event
- creating new evolution assets when an existing gene or capsule already fits

