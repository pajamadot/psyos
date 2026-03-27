# Self-Iteration Workflow

This is the shared protocol for improving PsyOS itself.

The project should not depend on a single operator remembering what to fix next. Each iteration should leave behind an explicit mutation and a clear next constraint.

## Iteration Capsule

Every self-improvement cycle should answer:

1. What is the current signal?
2. What mutation are we making?
3. Why is it the highest-leverage next move?
4. How will we validate it?
5. What becomes the next constraint after it lands?

## Strategy Presets

Use one of these presets explicitly when the iteration is non-trivial:

- `balanced`: default
- `harden`: reduce fragility, hidden context, or operational risk
- `innovate`: create a new control surface when foundations are good enough
- `repair-only`: fix regressions without widening scope

These presets and reusable evolution assets live in `coordination/evolution/`.

## Preferred Iteration Order

When multiple directions compete, prefer this order:

1. deployment and infra reliability
2. environment and secret contracts
3. observability, auditability, and state visibility
4. roadmap and control-plane persistence
5. study package and runtime interfaces
6. higher-level product ergonomics

## Required Repo Surfaces

Self-iteration work should update the relevant control surface, not only code:

- `docs/roadmap.md`
- `docs/infrastructure-plan.md`
- `docs/product-decisions.md`
- `packages/contracts/src/bootstrap.ts`
- `AGENTS.md`
- `.claude/skills/`

## Logging The Loop

When a mutation is large enough to change direction, capture a short iteration capsule in the issue, PR, or coordination docs. Use the same fields every time so humans and agents can trace the reasoning.

When the mutation lands, append an event to `coordination/evolution/events.ndjson`. The event should record the signal, selected strategy, mutation, validation, and next constraint.

## Anti-Patterns

- "we should iterate" with no concrete mutation
- invisible operator decisions
- roadmap drift between chat and repo
- large speculative rewrites without a validation path
- letting infra work stay tribal because it feels temporary
