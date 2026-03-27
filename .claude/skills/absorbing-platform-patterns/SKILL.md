---
name: absorbing-platform-patterns
description: Use this skill when asked to study another repo, framework, or workflow and keep only the patterns that fit PsyOS. This is for principle absorption, architecture translation, and explicit keep-or-reject decisions rather than code copying.
---

# Absorbing Platform Patterns

Use this skill when PsyOS should learn from another system without copying its implementation. The job is to inspect an external repo or workflow, identify the durable patterns, reject the local or domain-specific assumptions, and translate the kept ideas into PsyOS-native docs, skills, contracts, or control surfaces.

## Outcome

Leave behind:

- a short explicit absorption note
- translated PsyOS changes in docs, skills, or contracts
- a clear keep, reject, or evolve decision for each important pattern

## Required Discipline

- never copy code
- separate principle from implementation
- prefer durable operating patterns over surface aesthetics
- express the result in PsyOS terms, not the source project's terms

## Loop

1. Read the smallest set of principle-heavy files from the source system.
2. Extract durable patterns, not code structure.
3. Classify each pattern as `keep`, `reject`, or `narrow`.
4. Translate the kept patterns into PsyOS surfaces.
5. Record the result in the repo so the absorption is inspectable by the next contributor or agent.

## What Usually Transfers Well

- self-describing system metadata
- explicit operating guides
- gap reporting
- workspace or project canonicality
- quality gates with evidence
- memory and iteration discipline
- control-system framing

## What Usually Should Not Transfer Directly

- domain-specific entities
- large role taxonomies
- engine or framework assumptions
- tool-specific rituals presented as product truths
- implementation details that do not strengthen PsyOS's control surfaces

## Related Files

- `./translation-rules.md`
- `../../docs/pajama-principles-absorption.md`

