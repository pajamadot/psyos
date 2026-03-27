export const psyosNorthStar =
  "A hosted and self-deployable multi-agent psychology research platform where humans and agents can author, publish, discover, and participate in studies.";

export const psyosDecisions = {
  builderReference:
    "Conceptually informed by Cogix experiment-builder patterns, but implemented as an original rewrite.",
  agentAuthorship: true,
  agentParticipation: true,
  firstDogfoodStudies:
    "Start with a reaction-time study and a second, more complex task to pressure-test timing, state, branching, and analysis.",
  firstLoop:
    "Internal iteration workflow for PsyOS itself before optimizing external publishing flows.",
  complianceMetadata:
    "Deferred for launch; keep consent, IRB, compensation, and safety metadata on the wishlist.",
  identityModel:
    "Separate human and agent identities, kept intentionally simple in the bootstrap.",
  projectModel:
    "One project maps to one study for now, while the wider workspace/project model stays extensible.",
  authoringModel:
    "Study authoring should be code-first, agent-friendly, packageable, publishable, and only lightly edited through human UI surfaces.",
  publicPlanning:
    "The platform has a public feature roadmap, while selected workspaces and projects expose their own DAG and Kanban execution boards.",
  agentAuth: "Workspace-scoped API keys first.",
  experimentModel:
    "Preserve the full conceptual surface of modern experiment builders: procedure, timeline, block, sequence, trial, stimulus, response, event, replay, custom code, packaging, and publishing hooks.",
  requiredDataOutputs:
    "Support raw responses, events, timing logs, artifacts, and replay-oriented traces.",
  participantIdentity:
    "Participation should create reusable participant identities instead of disposable study-only credentials.",
  publicationResolution:
    "Public study pages resolve to latest by default while versions remain tracked internally.",
  deploymentModel:
    "Hosted product plus self-deployment support from public docs.",
  workflowScope:
    "Port the full Pajama-style agentic workflow posture: plans, DAG, memory, QA, publish, and asset operating system surfaces.",
  assetOsStrategy:
    "Asset OS is a first-class foundation layer for stimuli, uploads, run logs, replay traces, compiled bundles, and analysis artifacts, and it should be designed for performance from day one.",
  infrastructurePriority:
    "Continue infrastructure work beyond bootstrap: deployment hardening, preview environments, observability, self-hosting, secrets, and storage foundations are part of the critical path.",
} as const;

export const operatingGuide = [
  {
    id: "workspace-foundation",
    title: "Create Workspace",
    description:
      "Define the research workspace, mission, public roadmap, and its initial project DAG.",
  },
  {
    id: "study-design",
    title: "Design Study",
    description:
      "Model the study, protocol, runtime shape, and expected outputs before implementation.",
  },
  {
    id: "builder-runtime",
    title: "Build Runtime",
    description:
      "Author the experiment runtime using PsyOS-native builder concepts: procedures, blocks, sequences, stimuli, responses, and telemetry.",
  },
  {
    id: "internal-iteration",
    title: "Dry Run Internally",
    description:
      "Run the workflow internally first, gather evidence, and tighten the DAG, assets, and docs.",
  },
  {
    id: "publication",
    title: "Publish Latest",
    description:
      "Promote the current version as the latest public study while retaining internal version history.",
  },
  {
    id: "recruitment",
    title: "Open Participation",
    description:
      "Open opportunities for human and agent participants using explicit eligibility and API-key-compatible access models.",
  },
  {
    id: "analysis",
    title: "Collect And Analyze",
    description:
      "Collect raw responses, event streams, timing logs, assets, and replay traces for downstream analysis.",
  },
  {
    id: "iteration",
    title: "Iterate",
    description:
      "Feed findings back into the workspace plan, roadmap, and research surface instead of hiding them in git history.",
  },
] as const;

export const metaProcess = [
  "workspace -> project -> study definition -> experiment runtime -> internal iteration -> latest publish -> participation matching -> data collection -> analysis -> next DAG update",
  "the repo and platform should expose context, not rely on hidden operator memory",
  "plans, DAG state, artifacts, docs, and API contracts are all part of the control system",
] as const;

export const bootstrapGaps = [
  "Rollback-safe bootstrap and restore checklists are not codified tightly enough yet.",
  "API key issuance, rotation, and audit endpoints are not implemented yet.",
  "Workspace/project DAG persistence is not implemented yet.",
  "Experiment package runtime, compiler, and publish pipeline are not implemented yet.",
  "Asset OS and content-addressed artifact pipeline are not implemented yet.",
  "Audit-event plumbing beyond the evolution ledger is not implemented yet.",
  "Human and agent participant matching policy is still open.",
  "Safety, moderation, and compliance metadata are intentionally deferred but must stay extensible.",
] as const;

export const bootstrapGapRecords = [
  {
    id: "api-key-control-plane-missing",
    title: "API key control plane is not implemented",
    domain: "platform",
    severity: "high",
    summary:
      "Workspace-scoped API keys are a locked decision, but issuance, rotation, revocation, and audit surfaces do not exist yet.",
    nextAction:
      "Add workspace API key persistence and management endpoints with audit visibility.",
    docsPath: "docs/roadmap.md",
  },
  {
    id: "dag-persistence-missing",
    title: "Workspace and project DAG persistence is missing",
    domain: "platform",
    severity: "high",
    summary:
      "The public platform roadmap exists, but selected workspace and project DAG plus Kanban state is not persisted yet.",
    nextAction:
      "Persist workspace/project roadmap state and expose it through the API and UI.",
    docsPath: "docs/roadmap.md",
  },
  {
    id: "study-package-runtime-missing",
    title: "Study package runtime and publish pipeline are not implemented",
    domain: "product",
    severity: "high",
    summary:
      "The code-first study package layer, compiler, and publish workflow are still planned but not yet built.",
    nextAction:
      "Create the study package contract and first runtime path for dogfood studies.",
    docsPath: "docs/product-decisions.md",
  },
  {
    id: "asset-os-missing",
    title:
      "Asset OS control plane exists, but the object-store path is incomplete",
    domain: "platform",
    severity: "high",
    summary:
      "PsyOS now has persisted asset metadata and a manifest surface, but uploads, immutable object storage, and CAS promotion are not implemented yet.",
    nextAction:
      "Add object storage bindings, upload and promotion routes, and write-time content-hash guarantees on top of the manifest layer.",
    docsPath: "docs/asset-os.md",
  },
  {
    id: "audit-events-missing",
    title: "Operational audit events are not yet exposed",
    domain: "observability",
    severity: "medium",
    summary:
      "The evolution ledger exists, but API-level audit events and richer operational traces are not yet available.",
    nextAction:
      "Add structured audit events for deploy, publish, API key, and roadmap-control actions.",
    docsPath: "docs/infrastructure-plan.md",
  },
  {
    id: "matching-policy-open",
    title: "Participant matching policy remains open",
    domain: "product",
    severity: "medium",
    summary:
      "PsyOS does not yet define how humans and agents are matched to studies and opportunities.",
    nextAction:
      "Lock the first matching policy and represent it through explicit eligibility and opportunity contracts.",
    docsPath: "docs/questions.md",
  },
  {
    id: "safety-policy-open",
    title: "Safety and moderation policy remains deferred",
    domain: "governance",
    severity: "medium",
    summary:
      "Compliance metadata stays intentionally deferred, but the policy boundary still needs a concrete extension path.",
    nextAction:
      "Define the first safety and moderation extension model without blocking the early product loop.",
    docsPath: "docs/questions.md",
  },
] as const;

export const bootstrapOperationalEvents = [
  {
    id: "capability-evolution-protocol-seeded",
    timestamp: "2026-03-25T22:16:21.352Z",
    category: "workflow",
    strategy: "harden",
    summary:
      "Seeded the PsyOS-native capability evolution protocol, reusable evolution assets, and the append-only event ledger.",
    validation: ["pnpm typecheck", "repo-visible evolution assets added"],
    nextConstraint:
      "Use the capability evolution protocol on real infrastructure mutations instead of workflow-only scaffolding.",
  },
  {
    id: "d1-reset-and-smoke-checks",
    timestamp: "2026-03-25T22:21:50.009Z",
    category: "infrastructure",
    strategy: "harden",
    summary:
      "Recreated the production D1 bootstrap database, reapplied the migration, fixed the root API deploy script, and added live smoke checks.",
    validation: [
      "pnpm typecheck",
      "pnpm smoke:live",
      "remote D1 migrated cleanly on fresh database",
    ],
    nextConstraint:
      "Make environment, preview, and runtime state explicit instead of relying on operator memory.",
  },
  {
    id: "environment-contract-codified",
    timestamp: "2026-03-25T22:23:03.563Z",
    category: "operations",
    strategy: "harden",
    summary:
      "Codified the environment and secret contract across local, hosted, and self-host paths.",
    validation: [
      "environment-contract references verified in README and docs",
      "public env example updated",
    ],
    nextConstraint:
      "Define preview and staging isolation so non-production deploys do not inherit production assumptions.",
  },
  {
    id: "preview-topology-defined",
    timestamp: "2026-03-25T22:23:51.114Z",
    category: "infrastructure",
    strategy: "harden",
    summary:
      "Defined preview and staging topology for web, API, and database isolation.",
    validation: [
      "preview-topology references verified across README and deploy docs",
      "environment contract updated with preview-safe guidance",
    ],
    nextConstraint:
      "Expose richer runtime and gap state directly through the live API.",
  },
  {
    id: "observability-baseline-exposed",
    timestamp: "2026-03-25T22:31:13.567Z",
    category: "observability",
    strategy: "harden",
    summary:
      "Added API runtime headers, enriched maintenance metadata, and made the maintenance gap surface structured and actionable.",
    validation: ["pnpm typecheck", "pnpm test", "pnpm lint", "pnpm smoke:live"],
    nextConstraint:
      "Expose audit-event and deploy-history surfaces as queryable records instead of relying only on docs and local ledgers.",
  },
  {
    id: "deploy-control-surface-exposed",
    timestamp: "2026-03-25T22:41:45.615Z",
    category: "operations",
    strategy: "harden",
    summary:
      "Exposed deploy history and rollback-safe operational checklists as queryable maintenance records and aligned the deployment docs to the same control surface.",
    validation: ["pnpm typecheck", "pnpm test", "pnpm lint", "pnpm smoke:live"],
    nextConstraint:
      "Move from bootstrap-only operations metadata toward persisted workspace, project, and API-key control-plane state.",
  },
  {
    id: "dogfood-asset-manifest-live",
    timestamp: "2026-03-25T23:05:00.000Z",
    category: "product",
    strategy: "balanced",
    summary:
      "Seeded a real dogfood workspace with two published studies, exposed the first Asset OS manifest route, and wired the homepage to the live dogfood overview.",
    validation: [
      "pnpm db:seed:remote",
      "pnpm typecheck",
      "pnpm test",
      "pnpm lint",
      "pnpm deploy:api",
      "pnpm smoke:live",
    ],
    nextConstraint:
      "Replace seeded asset metadata with real object storage uploads, CAS promotion, and persisted workspace/project control-plane state.",
  },
] as const;

export const bootstrapDeployRecords = [
  {
    id: "production-bootstrap-platform-live",
    timestamp: "2026-03-25T22:31:13.567Z",
    environment: "production",
    surface: "platform",
    version: "0.1.0",
    commit: "unknown",
    summary:
      "The PsyOS web and API bootstrap stack is live on the canonical hosted domains with public maintenance and discovery surfaces.",
    delivery: ["vercel-git", "wrangler", "cloudflare-d1"],
    verification: [
      "pnpm smoke:live",
      "GET /api/v1/maintenance/system",
      "GET /api/v1/openapi.json",
    ],
    rollbackChecklistId: "production-rollback",
  },
  {
    id: "production-observability-baseline",
    timestamp: "2026-03-25T22:41:45.615Z",
    environment: "production",
    surface: "api",
    version: "0.1.0",
    commit: "unknown",
    summary:
      "The API now exposes runtime headers, structured maintenance gaps, operational events, deploy records, and operational checklists as queryable state.",
    delivery: ["wrangler"],
    verification: [
      "pnpm test",
      "pnpm lint",
      "pnpm smoke:live",
      "GET /api/v1/maintenance/deploys",
      "GET /api/v1/maintenance/checklists",
    ],
    rollbackChecklistId: "production-rollback",
  },
] as const;

export const bootstrapOperationalChecklists = [
  {
    id: "production-deploy",
    title: "Production Deploy And Verify",
    category: "deploy",
    summary:
      "Apply schema changes, deploy the live surfaces, and verify that the canonical public endpoints still expose the expected runtime metadata.",
    steps: [
      {
        id: "review-scope",
        title: "Review scope before mutation",
        command: "git status --short",
        successSignal:
          "The operator understands which files and deploy surfaces are about to change.",
      },
      {
        id: "apply-schema",
        title: "Apply remote D1 migrations before a schema-affecting deploy",
        command: "pnpm db:migrate:remote",
        successSignal:
          "Remote D1 schema matches the migration history committed in the repo.",
      },
      {
        id: "deploy-api",
        title: "Deploy the API through the canonical worker path",
        command: "pnpm deploy:api",
        successSignal:
          "The worker is updated and the canonical API origin serves the latest maintenance metadata.",
      },
      {
        id: "verify-public-surfaces",
        title:
          "Run live smoke checks against the canonical public web and API origins",
        command: "pnpm smoke:live",
        successSignal:
          "Web root, health, OpenAPI, maintenance metadata, deploy records, checklists, and docs all pass.",
      },
    ],
  },
  {
    id: "production-rollback",
    title: "Production Rollback And Restore",
    category: "rollback",
    summary:
      "Return the hosted stack to the last known-good state, then rerun public verification before declaring production healthy again.",
    steps: [
      {
        id: "freeze-new-mutations",
        title:
          "Freeze new merges and manual infra changes while triaging the incident",
        successSignal:
          "No new deploy or schema mutations are racing with the rollback decision.",
      },
      {
        id: "identify-last-healthy-release",
        title:
          "Use the deploy history, git history, and provider logs to identify the last healthy release",
        successSignal:
          "A concrete last known-good version or commit is selected for rollback.",
      },
      {
        id: "redeploy-last-healthy-build",
        title:
          "Redeploy the last known-good web and API revision through provider-native workflows",
        successSignal:
          "The public origins serve the selected known-good build rather than the broken release.",
      },
      {
        id: "restore-data-only-if-needed",
        title:
          "Restore database state only if the incident involved an incompatible or destructive data mutation",
        successSignal:
          "Data restore is performed intentionally instead of by default, and only after the application rollback target is fixed.",
      },
      {
        id: "reverify-production",
        title: "Re-run the live verification path against the recovered stack",
        command: "pnpm smoke:live",
        successSignal:
          "Canonical public endpoints pass smoke verification after the rollback or restore path.",
      },
      {
        id: "record-incident",
        title: "Capture the outcome as an auditable operational event",
        command:
          'pnpm evolution:log --strategy harden --signal rollback --mutation "document rollback outcome" --validation "pnpm smoke:live" --next-constraint "tighten the failing deploy seam"',
        successSignal:
          "The incident outcome and next constraint are appended to the evolution ledger for follow-up.",
      },
    ],
  },
] as const;

export const bootstrapRoadmap = {
  columns: [
    {
      id: "backlog",
      title: "Backlog",
      description: "Accepted direction that is not being executed yet.",
    },
    {
      id: "ready",
      title: "Ready",
      description: "Clear enough to claim and execute.",
    },
    {
      id: "in-progress",
      title: "In Progress",
      description: "Actively being implemented or validated.",
    },
    {
      id: "blocked",
      title: "Blocked",
      description:
        "Needs external permission, domain access, or unresolved design.",
    },
    {
      id: "done",
      title: "Done",
      description: "Completed and validated.",
    },
  ],
  items: [
    {
      id: "repo-bootstrap",
      title: "Bootstrap public monorepo",
      columnId: "done",
      kind: "infrastructure",
      summary:
        "Initialize pnpm/turbo repo with Vercel web, Cloudflare Worker API, D1 migration, contracts, docs, and CI.",
    },
    {
      id: "publish-github",
      title: "Publish pajamadot/psyos",
      columnId: "done",
      kind: "operations",
      summary:
        "Create the public GitHub repository and push the initial bootstrap commit.",
    },
    {
      id: "vercel-bootstrap",
      title: "Bootstrap Vercel project",
      columnId: "done",
      kind: "infrastructure",
      summary:
        "Create and link the frontend project so the repo can deploy from day one.",
    },
    {
      id: "cloudflare-bootstrap",
      title: "Bootstrap Cloudflare Worker and D1",
      columnId: "done",
      kind: "infrastructure",
      summary:
        "Create the D1 database, deploy the worker, and prepare api.psyos.org routing.",
    },
    {
      id: "git-integration",
      title: "Connect Vercel project to GitHub",
      columnId: "done",
      kind: "operations",
      summary:
        "Bind the Vercel project to pajamadot/psyos so pushes and pull requests use the normal Git deployment path.",
    },
    {
      id: "infra-hardening",
      title: "Harden edge, deploy, and migration foundations",
      columnId: "done",
      kind: "infrastructure",
      summary:
        "Finish domain verification, clean up the fresh D1 migration history, add deployment smoke checks, and codify rollback-safe bootstrap procedures.",
    },
    {
      id: "env-contract",
      title: "Codify environment and secret contracts",
      columnId: "done",
      kind: "infrastructure",
      summary:
        "Standardize required variables, secret scopes, local defaults, and self-host configuration so operators do not depend on hidden context.",
    },
    {
      id: "preview-topology",
      title: "Design preview and staging topology",
      columnId: "done",
      kind: "infrastructure",
      summary:
        "Define how preview web deployments, preview APIs, and disposable databases should work for pull requests and self-host testing.",
    },
    {
      id: "observability",
      title: "Establish observability and audit baseline",
      columnId: "in-progress",
      kind: "platform",
      summary:
        "Add request IDs, structured logs, audit events, uptime checks, and build/version visibility across web and API surfaces.",
    },
    {
      id: "operational-timeline",
      title: "Expose operational timeline and audit records",
      columnId: "done",
      kind: "platform",
      summary:
        "Make major infrastructure and platform mutations queryable as first-class records instead of only repo history and local ledgers.",
    },
    {
      id: "self-host-bootstrap",
      title: "Bootstrap self-host and operator workflows",
      columnId: "ready",
      kind: "operations",
      summary:
        "Document and script the hosted path and the self-deploy path so third parties can bring up PsyOS without a private runbook.",
    },
    {
      id: "identity-auth",
      title: "Separate human and agent identities with workspace API keys",
      columnId: "ready",
      kind: "product",
      summary:
        "Keep identity models separate and begin with workspace-scoped API-key-first agent authentication.",
    },
    {
      id: "roadmap-dag",
      title: "Public platform roadmap plus workspace/project DAG",
      columnId: "ready",
      kind: "platform",
      summary:
        "Expose the public platform feature roadmap and add selected workspace/project DAG plus Kanban views so work state is legible to humans and agents.",
    },
    {
      id: "study-kit",
      title: "Code-first study package layer",
      columnId: "backlog",
      kind: "product",
      summary:
        "Create the agent-friendly study package DSL and runtime shape with custom code, package, and publish support.",
    },
    {
      id: "experiment-builder",
      title: "Original experiment builder rewrite",
      columnId: "backlog",
      kind: "product",
      summary:
        "Design a PsyOS-native builder that visualizes and runs code-first study packages while preserving procedure, timeline, block, sequence, trial, stimulus, event, and replay concepts.",
    },
    {
      id: "asset-os",
      title: "Asset OS for research artifacts",
      columnId: "backlog",
      kind: "platform",
      summary:
        "Build a content-addressed artifact system for stimuli, outputs, logs, and publishable bundles.",
    },
    {
      id: "results-pipeline",
      title: "Results, replay, and artifact pipeline",
      columnId: "backlog",
      kind: "platform",
      summary:
        "Capture raw responses, timing logs, event streams, assets, replay traces, and downloadable bundles for both human and agent participation.",
    },
    {
      id: "matching-policy",
      title: "Participant matching policy",
      columnId: "blocked",
      kind: "product",
      summary:
        "Define how PsyOS matches humans and agents to studies and opportunities.",
    },
    {
      id: "safety-policy",
      title: "Safety and moderation policy",
      columnId: "blocked",
      kind: "governance",
      summary:
        "Specify the extendable moderation and safety boundary for autonomous research.",
    },
  ],
  dependencies: [
    {
      from: "repo-bootstrap",
      to: "publish-github",
    },
    {
      from: "publish-github",
      to: "vercel-bootstrap",
    },
    {
      from: "publish-github",
      to: "cloudflare-bootstrap",
    },
    {
      from: "vercel-bootstrap",
      to: "git-integration",
    },
    {
      from: "cloudflare-bootstrap",
      to: "infra-hardening",
    },
    {
      from: "git-integration",
      to: "infra-hardening",
    },
    {
      from: "infra-hardening",
      to: "env-contract",
    },
    {
      from: "infra-hardening",
      to: "preview-topology",
    },
    {
      from: "infra-hardening",
      to: "observability",
    },
    {
      from: "env-contract",
      to: "self-host-bootstrap",
    },
    {
      from: "repo-bootstrap",
      to: "roadmap-dag",
    },
    {
      from: "identity-auth",
      to: "study-kit",
    },
    {
      from: "roadmap-dag",
      to: "study-kit",
    },
    {
      from: "identity-auth",
      to: "experiment-builder",
    },
    {
      from: "study-kit",
      to: "experiment-builder",
    },
    {
      from: "study-kit",
      to: "results-pipeline",
    },
    {
      from: "roadmap-dag",
      to: "experiment-builder",
    },
    {
      from: "roadmap-dag",
      to: "asset-os",
    },
    {
      from: "asset-os",
      to: "results-pipeline",
    },
  ],
} as const;
