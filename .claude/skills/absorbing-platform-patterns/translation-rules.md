# Translation Rules

Use these rules when adapting patterns from another system into PsyOS.

## Keep

- patterns that improve legibility for the next human or agent
- patterns that expose state instead of hiding it
- patterns that strengthen repeatable deployment, planning, QA, publishing, or artifact handling
- patterns that make the platform more inspectable through docs, API, or explicit workflow

## Reject

- code structure copied because it looks mature
- domain objects that belong to the source system but not PsyOS
- control rituals that only make sense with the source repo's local tools
- unnecessary hierarchy or theater that hides the real workflow

## Translate

Turn a kept pattern into one or more PsyOS-native surfaces:

- `docs/`
- `.claude/skills/`
- `packages/contracts`
- `apps/api` discovery or maintenance surfaces
- coordination workflows

