import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { TestD1Database } from "./test-d1";

const apiPackageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = join(apiPackageRoot, "..", "..");

export function readRepoFile(...segments: string[]) {
  return readFileSync(join(apiPackageRoot, ...segments), "utf8");
}

export function buildTestDatabase() {
  const database = new TestD1Database();
  database.exec(readRepoFile("migrations", "0001_init.sql"));
  database.exec(readRepoFile("migrations", "0002_auth_foundation.sql"));
  database.exec(readRepoFile("migrations", "0003_auth_control_plane.sql"));
  database.exec(readRepoFile("migrations", "0004_study_runs.sql"));
  database.exec(readRepoFile("seeds", "0001_dogfood.sql"));
  return database;
}

export function loadRootEnvLocal() {
  const envPath = join(workspaceRoot, ".env.local");
  if (!existsSync(envPath)) {
    return {};
  }

  const content = readFileSync(envPath, "utf8");
  const entries = content.split(/\r?\n/);
  const parsed: Record<string, string> = {};

  for (const rawLine of entries) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

export function extractEmailAddress(input: string) {
  const match = input.match(/<([^>]+)>/);
  return (match?.[1] ?? input).trim();
}
