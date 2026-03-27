---
name: running-meta-iterations
description: Use this skill when asked to keep PsyOS evolving, improve its own workflows, turn a vague "iterate" or "self-improve" request into a concrete mutation, or tighten the platform's infra, docs, control surfaces, and feedback loops.
---

# Running Meta Iterations

Use this skill when the task is not just to build a feature, but to improve how PsyOS improves itself. This skill is for meta work: roadmap tightening, infra hardening, agent workflow design, control-surface cleanup, feedback-loop refinement, and converting vague "keep iterating" directions into concrete, validated repo changes. ultrathink

## Outcome

Produce a small, reviewable iteration that improves PsyOS as a system:

- tighten the current control surface
- reduce hidden operator knowledge
- improve the repo's ability to expose state to humans and agents
- leave behind updated docs, contracts, or code rather than only a chat summary

## Default Scope Order

If the user does not specify a scope, prefer this order:

1. deployment and infrastructure reliability
2. environment, secrets, preview, and observability contracts
3. roadmap, control-plane, and operator workflow clarity
4. agent workflow, memory, and publish surfaces
5. product runtime or study-package work

## Required Inputs

Start from the repo, not from memory. Read the smallest relevant set first:

- `AGENTS.md`
- `README.md`
- `docs/roadmap.md`
- `docs/infrastructure-plan.md`
- `docs/product-decisions.md`
- `docs/architecture.md`
- `packages/contracts/src/bootstrap.ts`

Load additional files only when the current mutation needs them.

## Loop

1. Inspect current state.
   Find the current bottleneck, contradiction, missing contract, or invisible workflow. Prefer evidence from repo files, deploy config, or runnable checks over assumptions.

2. Frame the iteration capsule.
   Summarize the current state, the mutation you will apply, why it matters, how you will validate it, and what should be considered next. Use `./iteration-capsule-template.md` if you need a compact structure.

3. Choose the smallest high-leverage mutation.
   Prefer changes that improve repeatability, visibility, and system legibility. Avoid broad speculative rewrites when a narrower control-surface improvement will unblock more work.

4. Update the control surface, not just implementation.
   If you change infra, update deployment docs. If you change roadmap state, update the roadmap contract. If you add an agent workflow, document how it is supposed to operate. Use `./mutation-selection-rules.md` to keep the change disciplined.

5. Validate.
   Run the narrowest meaningful verification for the mutation. For docs-only changes, verify references and consistency. For contract or code changes, run the relevant local checks.

6. Record the next loop.
   End with the next constraint or leverage point, not generic follow-up ideas. The goal is to keep the system improving through explicit chained iterations.

## Mutation Rules

- prefer repo state over chat state
- prefer explicit contracts over tacit assumptions
- prefer additive, inspectable changes over invisible behavior
- prefer one validated mutation over a large unverified batch
- if infra and product are competing, choose the one that most reduces future thrash
- if the system cannot be understood or deployed by another operator, that is a product bug

## When To Escalate

Ask for clarification only when the change would commit PsyOS to a risky irreversible choice. Otherwise make a reasonable assumption, document it, and keep moving.

## Deliverables

Each run should leave behind some combination of:

- updated roadmap or infrastructure docs
- updated contracts or schemas
- improved deploy or operator scripts
- a new skill, workflow, or control-plane surface
- a validated next-step recommendation grounded in repo state

## Anti-Patterns

- writing a plan in chat without patching the repo
- making hidden deployment assumptions
- widening scope without reducing uncertainty first
- treating "iterate" as permission for random change
- leaving roadmap, docs, and code out of sync

## Related Files

- `./mutation-selection-rules.md`
- `./iteration-capsule-template.md`

