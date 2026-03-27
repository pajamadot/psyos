# Product Decisions

These decisions are currently locked for the PsyOS bootstrap.

## Locked

- Experiment builder direction: conceptually informed by Cogix-style psychology experiment builders, but rewritten from scratch.
- Agent-authored studies: allowed.
- Agent participation in studies: allowed.
- First loop: optimize our own internal iteration workflow before expanding external publishing polish.
- First dogfood studies: start with reaction time and a second more complex task to validate state, branching, and analysis.
- Identity model: human and agent identities are separate.
- Workspace posture: the workspace is the canonical research container; projects map to one study for now.
- Project model: one project maps to one study for now.
- Authoring model: code-first, agent-friendly packages with light visualization-oriented UI rather than heavy manual editing.
- Agent auth: workspace-scoped API keys first.
- Participant identity: reusable across studies.
- Publication resolution: public study pages resolve to the latest publish by default.
- Deployment posture: hosted product plus self-deployment from public docs.
- Planning posture: the platform roadmap is public, while selected workspaces and projects expose their own DAG and kanban views.
- Workflow posture: port the full Pajama-style planning, memory, QA, publish, and asset-operating-system mindset.
- Asset posture: Asset OS is a foundation layer and should cover stimuli, uploads, logs, replay traces, bundles, and analysis artifacts.
- Agent-facing posture: the system should expose runtime metadata, operating guides, and gaps rather than relying on private repo lore.
- Control posture: treat PsyOS as a control system and optimize for observability, controllability, and dense feedback.

## Deferred But Required

- consent and IRB-related metadata
- moderation and safety policy
- participant matching policy
- compensation and compliance surfaces
