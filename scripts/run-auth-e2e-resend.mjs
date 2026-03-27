#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const envLocalPath = resolve(".env.local");

if (!existsSync(envLocalPath)) {
  console.error("Missing .env.local at the repo root.");
  process.exit(1);
}

const pnpmEntrypoint = process.env.npm_execpath;
const command = pnpmEntrypoint ? process.execPath : process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const args = pnpmEntrypoint
  ? [
      pnpmEntrypoint,
      "--filter",
      "@psyos/api",
      "exec",
      "vitest",
      "run",
      "src/auth.resend.e2e.test.ts",
    ]
  : [
      "--filter",
      "@psyos/api",
      "exec",
      "vitest",
      "run",
      "src/auth.resend.e2e.test.ts",
    ];

const result = spawnSync(command, args, {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    RUN_RESEND_E2E: "1",
  },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
