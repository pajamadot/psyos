# Mutation Selection Rules

Use this checklist when deciding what the next meta-iteration should touch.

## Favor Changes That

- remove hidden operator knowledge
- make deploy, build, or run state queryable
- reduce disagreement between docs, contracts, and code
- harden a foundation that multiple later features depend on
- improve the ability of humans and agents to inspect the platform without tribal context
- create a reusable abstraction instead of a one-off patch

## Favor Smaller Mutations Over Larger Ones When

- the current bottleneck is not fully understood
- the repo has multiple competing unknowns
- a contract or doc change can unblock later implementation
- you can get a strong validation signal from a narrow change

## Escalate To Larger Mutations When

- the current structure is actively causing repeated thrash
- multiple pending tasks are blocked on the same missing abstraction
- a control-plane hole makes future changes unreliable or misleading

## Scope Priority

1. infra reliability and deploy topology
2. environment and secret contracts
3. observability and auditability
4. roadmap and control-plane state
5. package/runtime interfaces
6. visualization or ergonomics

## Stop Conditions

Pause and ask the user if:

- the change would force a storage or auth provider commitment that will be expensive to reverse
- the requested mutation conflicts with a locked product decision
- the repo contains conflicting in-flight changes that cannot be safely integrated

