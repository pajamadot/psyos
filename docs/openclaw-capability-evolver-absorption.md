# Absorbing OpenClaw Capability Evolver

This note records what PsyOS should absorb from `openclaw/skills` `autogame-17/capability-evolver`, and how that pattern should be translated into this repository.

Source referenced:

- `https://github.com/openclaw/skills/tree/main/skills/autogame-17/capability-evolver`

## Kept

- Signal-driven self-improvement
  - Evolution should start from visible signals such as failures, drift, recurring friction, missing contracts, or stagnation.
  - PsyOS should avoid vague "iterate more" loops with no explicit trigger.

- Strategy presets
  - Different iterations need different intent balances.
  - PsyOS should use a small fixed set of strategy presets such as `balanced`, `harden`, `innovate`, and `repair-only`.

- Reusable evolution assets
  - Recurring improvement patterns should be captured as reusable assets instead of rediscovered each time.
  - PsyOS should encode those patterns as genes and capsules in repo-visible files.

- Auditable evolution events
  - Self-improvement should leave a trace: signal, chosen mutation, validation, and next constraint.
  - PsyOS should keep a lightweight evolution ledger instead of relying on chat memory.

- Offline-first discipline
  - The self-improvement loop should work with repo state alone.
  - External networks can help, but they should not be the only place where the iteration protocol exists.

## Rejected Or Narrowed

- Prompt-generator-only framing
  - PsyOS needs more than prompt output. It needs repo changes, docs, control-surface changes, and validation.
  - The right translation is not "generate an evolution prompt", but "execute a small auditable mutation".

- Host-runtime stdout directives
  - OpenClaw uses stdout hooks for a host runtime.
  - PsyOS does not need that translation right now.

- Generic cross-project network assumptions
  - Evolver is designed to connect to an external network.
  - PsyOS should first make its local and OSS workflows reliable before adding networked evolution exchanges.

- Protected source-file behavior as a hardcoded rule
  - The useful idea is boundary awareness, not the exact protection mechanism.
  - PsyOS should express core control surfaces through docs, contracts, validations, and later policy, not opaque file locks.

## Translation Into PsyOS

The fitting translation is:

- a dedicated project skill for capability evolution
- strategy presets
- reusable genes and capsules under `coordination/evolution/`
- a simple evolution-event logging path
- PR and collaboration workflows that preserve signal, mutation, validation, and next constraint

## Resulting PsyOS Rule

Self-improvement should be:

1. signal-driven
2. strategy-bounded
3. expressed through reusable evolution assets
4. validated in the repo
5. recorded as an auditable event

