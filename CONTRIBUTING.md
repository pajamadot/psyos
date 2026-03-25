# Contributing

PsyOS is being built as an OSS-first framework. Contributions are expected to keep the repository understandable to humans and agents.

## Local Workflow

1. Install dependencies with `pnpm install`.
2. Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before opening a PR.
3. Update `docs/` when architecture, deployment, or operating rules change.

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
