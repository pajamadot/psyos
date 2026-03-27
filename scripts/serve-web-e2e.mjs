#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";

const pnpmEntrypoint = process.env.npm_execpath;
const command = pnpmEntrypoint
  ? process.execPath
  : process.platform === "win32"
    ? "pnpm.cmd"
    : "pnpm";

const buildArgs = pnpmEntrypoint
  ? [pnpmEntrypoint, "--filter", "@psyos/web", "build"]
  : ["--filter", "@psyos/web", "build"];

const startArgs = pnpmEntrypoint
  ? [pnpmEntrypoint, "--filter", "@psyos/web", "start:e2e"]
  : ["--filter", "@psyos/web", "start:e2e"];

const build = spawnSync(command, buildArgs, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (build.error) {
  console.error(build.error);
  process.exit(1);
}

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const server = spawn(command, startArgs, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

server.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  server.kill("SIGINT");
});

process.on("SIGTERM", () => {
  server.kill("SIGTERM");
});
