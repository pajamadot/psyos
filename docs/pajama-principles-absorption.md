# Absorbing Pajama Game Studio Principles

This note records which durable operating principles PsyOS should absorb from `G:\PajamaDot\pajama-game-studio`, and which ones it should not translate directly.

The goal is not code reuse. The goal is to keep the patterns that make the next human or agent more effective.

## Kept

- Workspace-first thinking
  - For PsyOS, a workspace should become the canonical research container.
  - A project maps to one study for now, but the workspace should hold the longer-lived lab, protocol, asset, roadmap, and identity context.

- Agent-friendly operating surfaces
  - The platform should tell agents what the system is, what state it is in, and what is missing.
  - PsyOS should keep strengthening `maintenance/system`, `discover/meta-process`, `discover/operating-guide`, and `maintenance/gaps`.

- Gap detection as a product feature
  - Missing plans, missing publish evidence, missing package metadata, missing assets, and missing results pipelines should be reported explicitly instead of inferred from repo lore.

- Reflective skills
  - PsyOS should keep first-class reflective skills for self-improvement and external pattern absorption.
  - This is now expressed through `.claude/skills/running-meta-iterations/` and `.claude/skills/absorbing-platform-patterns/`.

- Control-system framing
  - PsyOS should optimize for controllability, observability, and feedback density, not only raw model capability.
  - Plans, artifacts, validations, docs, and machine-readable state are all part of the control loop.

- Real dogfooding
  - The platform should improve through real study work, not isolated demos.
  - We should keep building real studies through PsyOS and evolve the framework from the friction found in that loop.

- Provider-native deployment over hidden CI folklore
  - Hosted deployment should remain direct and legible through Vercel and Cloudflare, while self-hosting remains a documented product capability.

## Rejected Or Narrowed

- Game-specific product structure
  - Game projections, engine templates, and game-lifecycle assumptions do not transfer directly.
  - PsyOS is about studies, packages, opportunities, runs, and results.

- Large role taxonomies
  - PsyOS does not need to inherit a large fixed cast of agent roles as its product model.
  - Roles can emerge later from actual research workflow pressure.

- "Thin CRUD only" as an absolute rule
  - The principle is useful as a warning against clever infrastructure, but PsyOS still needs a real control plane for planning, package publishing, results, artifacts, QA, and participant workflows.
  - The right translation is: keep the control plane explicit and legible, not magically smart.

- Repo-only execution truth
  - Git remains important, but PsyOS should not depend on repo files alone for operational state.
  - The platform should expose current state through API, docs, and eventually persistent workspace/project surfaces.

## Translation Rule

When absorbing a principle from another system into PsyOS:

1. Keep it if it makes the next agent or contributor more effective without increasing hidden context.
2. Reject it if it hardcodes games, engines, or a local tool ritual into PsyOS's product model.
3. Translate kept patterns into PsyOS-native surfaces: workspace, project, study package, roadmap, gaps, assets, publish, and results.

