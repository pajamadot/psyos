export const psyosNorthStar =
  "A hosted and self-deployable multi-agent psychology research platform where humans and agents can author, publish, discover, and participate in studies.";

export const psyosDecisions = {
  builderReference:
    "Conceptually informed by Cogix experiment-builder patterns, but implemented as an original rewrite.",
  agentAuthorship: true,
  agentParticipation: true,
  firstLoop:
    "Internal iteration workflow for PsyOS itself before optimizing external publishing flows.",
  complianceMetadata:
    "Deferred for launch; keep consent, IRB, compensation, and safety metadata on the wishlist.",
  identityModel:
    "Separate human and agent identities, kept intentionally simple in the bootstrap.",
  publicPlanning:
    "Workspace-level and project-level DAG plus Kanban surfaces should be public by default unless explicitly private.",
  agentAuth: "API key first.",
  experimentModel:
    "Preserve the full conceptual surface of modern experiment builders: timeline, block, sequence, stimulus, event, replay, and analysis hooks.",
  requiredDataOutputs:
    "Support raw responses, events, timing logs, artifacts, and replay-oriented traces.",
  publicationResolution:
    "Public study pages resolve to latest by default while versions remain tracked internally.",
  deploymentModel:
    "Hosted product plus self-deployment support from public docs.",
  workflowScope:
    "Port the full Pajama-style agentic workflow posture: plans, DAG, memory, QA, publish, and asset operating system surfaces.",
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
  "API key issuance and rotation endpoints are not implemented yet.",
  "Workspace/project DAG persistence is not implemented yet.",
  "Experiment builder UI and compiler are not implemented yet.",
  "Asset OS and content-addressed artifact pipeline are not implemented yet.",
  "Human and agent participant matching policy is still open.",
  "Safety, moderation, and compliance metadata are intentionally deferred but must stay extensible.",
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
      columnId: "in-progress",
      kind: "operations",
      summary:
        "Create the public GitHub repository and push the initial bootstrap commit.",
    },
    {
      id: "vercel-bootstrap",
      title: "Bootstrap Vercel project",
      columnId: "ready",
      kind: "infrastructure",
      summary:
        "Create and link the frontend project so the repo can deploy from day one.",
    },
    {
      id: "cloudflare-bootstrap",
      title: "Bootstrap Cloudflare Worker and D1",
      columnId: "ready",
      kind: "infrastructure",
      summary:
        "Create the D1 database, deploy the worker, and prepare api.psyos.org routing.",
    },
    {
      id: "identity-auth",
      title: "Separate human and agent identities with API keys",
      columnId: "ready",
      kind: "product",
      summary:
        "Keep identity models separate and begin with API-key-first agent authentication.",
    },
    {
      id: "roadmap-dag",
      title: "Workspace and project roadmap DAG",
      columnId: "ready",
      kind: "platform",
      summary:
        "Expose public kanban and DAG views so work state is legible to humans and agents.",
    },
    {
      id: "experiment-builder",
      title: "Original experiment builder rewrite",
      columnId: "backlog",
      kind: "product",
      summary:
        "Design a PsyOS-native builder that preserves timeline, block, sequence, stimulus, event, and replay concepts.",
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
      from: "repo-bootstrap",
      to: "roadmap-dag",
    },
    {
      from: "identity-auth",
      to: "experiment-builder",
    },
    {
      from: "roadmap-dag",
      to: "experiment-builder",
    },
    {
      from: "roadmap-dag",
      to: "asset-os",
    },
  ],
} as const;
