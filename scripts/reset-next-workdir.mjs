#!/usr/bin/env node

import { rmSync } from "node:fs";
import { resolve } from "node:path";

const target = process.argv[2];

if (!target) {
  console.error("Usage: node scripts/reset-next-workdir.mjs <relative-path>");
  process.exit(1);
}

rmSync(resolve(process.cwd(), target), {
  force: true,
  recursive: true,
});
