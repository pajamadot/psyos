# Contributing

PsyOS is being built as an OSS-first framework. Contributions are expected to keep the repository understandable to humans and agents.

## Local Workflow

1. Install dependencies with `pnpm install`.
2. Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before opening a PR.
3. Update `docs/` when architecture, deployment, or operating rules change.

## Collaboration Loop

1. Open or claim a GitHub issue before coding.
2. Apply at least one `type:*` label and one `status:*` label before coding.
3. Only then start implementation.
4. State the signal, scope, and intended mutation before large changes.
5. Keep the change narrow and validate it explicitly.
6. Update docs, contracts, and operator surfaces together with code.
7. End the PR with the next constraint, not just a change summary.
8. When the work is a self-improvement mutation, log an evolution event.

See `docs/collaboration-workflow.md` for the shared OSS workflow, `docs/issue-label-palette.md` for the required color-tag policy, `coordination/self-iteration-workflow.md` for the meta-iteration protocol, and `coordination/evolution/README.md` for the capability-evolution assets and ledger.

## Pull Requests

- keep scope narrow
- include rationale, not just code
- call out infra-impacting changes explicitly
- update contracts when API or stored data changes

## Ground Rules

- no copied code from external reference repos
- document new environment variables
- prefer additive migrations over destructive schema edits
- keep the public self-hosting story intact
- if a workflow matters for future contributors or agents, make it visible in-repo
- feature work starts with an issue plus color-coded labels, not directly with code
