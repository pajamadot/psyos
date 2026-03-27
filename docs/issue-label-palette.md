# Issue Label Palette

PsyOS uses an issue-first workflow for feature development.

## Hard Rule

Before starting any new feature or platform slice:

1. open or claim a GitHub issue
2. apply at least one `type:*` label and one `status:*` label
3. only then start implementation

If a change does not have an issue with a color-coded label set, the first step is not coding. The first step is creating and labeling the issue.

## Required Labels

### Type labels

| Label | Color | Meaning |
|------|-------|---------|
| `type:feature-slice` | `1D76DB` | New product, platform, or user-facing capability |
| `type:meta-iteration` | `5319E7` | Self-improvement, workflow, control-plane, or operator UX work |
| `type:bug` | `D73A4A` | Regression, incorrect behavior, or contract break |

### Status labels

| Label | Color | Meaning |
|------|-------|---------|
| `status:triage` | `FBCA04` | Newly opened, not yet ready for implementation |
| `status:ready` | `0E8A16` | Ready to build |
| `status:blocked` | `B60205` | Waiting on decision, dependency, or infra |
| `status:in-progress` | `1F6FEB` | Actively being implemented |
| `status:done` | `8250DF` | Landed and verified |

### Optional area labels

| Label | Color | Meaning |
|------|-------|---------|
| `area:infra` | `0052CC` | Infrastructure and deployment |
| `area:auth` | `C2E0C6` | User system, OAuth, sessions, API keys |
| `area:workspace` | `BFD4F2` | Workspace shell, planning, DAG, Kanban |
| `area:asset-os` | `F9D0C4` | Assets, artifacts, bundles, traces |
| `area:study-runtime` | `D4C5F9` | Study packages, execution runtime, protocol logic |
| `area:docs` | `EDEDED` | Docs, OSS operator UX, self-host guidance |

## Default Mapping

- `Feature Slice` issues should default to `type:feature-slice` + `status:triage`
- `Meta Iteration` issues should default to `type:meta-iteration` + `status:triage`

## Sync

Use the label sync script to create or update the palette on GitHub:

```bash
pnpm labels:sync
```

By default it targets `pajamadot/psyos`. Override with:

```bash
pnpm labels:sync -- --repo owner/name
```
