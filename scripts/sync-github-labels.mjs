#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const repoFlagIndex = args.indexOf("--repo");
const repo =
  repoFlagIndex === -1 ? "pajamadot/psyos" : args[repoFlagIndex + 1];
const ghCommand =
  process.platform === "win32"
    ? "G:\\Program Files\\GitHub CLI\\gh.exe"
    : "gh";

if (!repo) {
  console.error("Missing repo. Use --repo owner/name.");
  process.exit(1);
}

const labels = [
  {
    name: "type:feature-slice",
    color: "1D76DB",
    description: "New product, platform, or user-facing capability",
  },
  {
    name: "type:meta-iteration",
    color: "5319E7",
    description: "Workflow, control-plane, or self-improvement work",
  },
  {
    name: "type:bug",
    color: "D73A4A",
    description: "Regression or incorrect behavior",
  },
  {
    name: "status:triage",
    color: "FBCA04",
    description: "Newly opened and not ready yet",
  },
  {
    name: "status:ready",
    color: "0E8A16",
    description: "Ready for implementation",
  },
  {
    name: "status:blocked",
    color: "B60205",
    description: "Blocked on decision, dependency, or infra",
  },
  {
    name: "status:in-progress",
    color: "1F6FEB",
    description: "Actively being implemented",
  },
  {
    name: "status:done",
    color: "8250DF",
    description: "Implemented and verified",
  },
  {
    name: "area:infra",
    color: "0052CC",
    description: "Infrastructure and deployment",
  },
  {
    name: "area:auth",
    color: "C2E0C6",
    description: "User system, OAuth, sessions, API keys",
  },
  {
    name: "area:workspace",
    color: "BFD4F2",
    description: "Workspace shell, DAG, Kanban, planning",
  },
  {
    name: "area:asset-os",
    color: "F9D0C4",
    description: "Assets, artifacts, bundles, traces",
  },
  {
    name: "area:study-runtime",
    color: "D4C5F9",
    description: "Study packages, execution runtime, protocol logic",
  },
  {
    name: "area:docs",
    color: "EDEDED",
    description: "Docs, OSS operator UX, self-host guidance",
  },
];

for (const label of labels) {
  const result = spawnSync(
    ghCommand,
    [
      "-R",
      repo,
      "label",
      "create",
      label.name,
      "--color",
      label.color,
      "--description",
      label.description,
      "--force",
    ],
    {
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Synchronized ${labels.length} labels to ${repo}.`);
