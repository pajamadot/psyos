# Collaboration Workflow

PsyOS is an open-source project and an agent-native platform. Collaboration has to work for humans, coding agents, and self-hosting operators without relying on private context.

## Default Contribution Loop

1. Open or claim an issue before writing feature code.
2. Apply at least one `type:*` label and one `status:*` label before writing feature code.
3. State the current signal, scope, and expected mutation before making large changes.
4. Keep the change narrow enough that validation is believable.
5. Update docs, contracts, and operator surfaces together with implementation.
6. Open a PR with explicit validation and infra notes.
7. Record the next constraint rather than ending at "done".
8. If the change is a self-improvement mutation, log it in the evolution ledger.

See `docs/issue-label-palette.md` for the required label names and colors.

## Accepted Work Tracks

- infrastructure hardening
- control-plane and workflow improvements
- study package and runtime work
- asset and artifact foundations
- docs and self-host/operator UX

## Rules For Healthy Collaboration

- no hidden runbooks
- no silent contract changes
- no copied code from reference repos
- no frontend-only ownership of critical research state
- no merge without clear validation or an explicit note that validation is still missing

## Human And Agent Collaboration

Humans and agents should use the same repo-visible control surfaces:

- roadmap and infrastructure plan in `docs/`
- shared contracts in `packages/contracts`
- coordination notes in `coordination/`
- project-local skills in `.claude/skills/`
- evolution assets and ledger in `coordination/evolution/`

If a workflow matters, write it down in the repo before assuming another contributor or agent knows it.

## Issue Types

Use GitHub issues to separate work cleanly:

- feature slice: user-facing product or platform capability
- meta iteration: improving PsyOS itself, its workflows, or its control surfaces
- bug or regression: behavior that is wrong relative to locked contracts or docs

Each issue should carry visible color-coded labels so humans and agents can understand queue state at a glance.

## Pull Request Expectations

A PR should always make these visible:

- what changed
- why now
- what was validated
- what contracts or docs moved
- what should be iterated next

## Open Source Operator Standard

Any contributor should be able to understand:

- how to run the repo
- how to deploy the repo
- what the current plan is
- what is blocked
- what the next high-leverage mutation should be

If the repo fails that standard, treat it as an active platform bug.
