#!/usr/bin/env node

import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);

function readFlag(name) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

function readMultiFlag(name) {
  const values = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === `--${name}`) {
      const value = args[i + 1];
      if (value) values.push(value);
    }
  }
  return values;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const strategy = readFlag("strategy");
const signal = readFlag("signal");
const mutation = readFlag("mutation");
const nextConstraint = readFlag("next-constraint");
const notes = readFlag("notes");
const geneId = readFlag("gene");
const capsuleId = readFlag("capsule");
const validations = readMultiFlag("validation");

const allowedStrategies = new Set([
  "balanced",
  "harden",
  "innovate",
  "repair-only",
]);

if (!strategy || !allowedStrategies.has(strategy)) {
  fail(
    "Missing or invalid --strategy. Use one of: balanced, harden, innovate, repair-only.",
  );
}

if (!signal) fail("Missing --signal.");
if (!mutation) fail("Missing --mutation.");
if (!nextConstraint) fail("Missing --next-constraint.");
if (validations.length === 0) fail("At least one --validation is required.");

const schemaPath = resolve("coordination/evolution/event-schema.json");
const ledgerPath = resolve("coordination/evolution/events.ndjson");

const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const event = {
  timestamp: new Date().toISOString(),
  strategy,
  signal,
  ...(geneId ? { geneId } : {}),
  ...(capsuleId ? { capsuleId } : {}),
  mutation,
  validation: validations,
  nextConstraint,
  ...(notes ? { notes } : {}),
};

for (const key of schema.required) {
  if (!(key in event)) {
    fail(`Event is missing required field: ${key}`);
  }
}

await mkdir(dirname(ledgerPath), { recursive: true });
await appendFile(ledgerPath, `${JSON.stringify(event)}\n`, "utf8");
console.log(`Logged evolution event to ${ledgerPath}`);
