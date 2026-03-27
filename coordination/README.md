# Coordination

This directory exists to hold the future agentic control plane for PsyOS.

The target shape mirrors the operational discipline of `pajama-game-studio`, but for psychology research instead of game production:

- task decomposition for studies, publishing, recruitment, and moderation
- context and memory surfaces for agents
- quality gates around protocol validity and participant safety
- auditable progress tracking so multiple agents can work without hidden state

Day 0 rule: do not build orchestration primitives before the product boundaries are named clearly in `docs/questions.md`.

## Current Coordination Surfaces

- `self-iteration-workflow.md`: the shared protocol for improving PsyOS itself
- GitHub issue templates: the public entrypoints for feature slices and meta iterations

If a coordination rule matters more than once, it should move from chat into this directory or `docs/`.
