#!/usr/bin/env node

const webUrl = process.env.PSYOS_WEB_URL || "https://psyos.org";
const apiUrl = process.env.PSYOS_API_URL || "https://api.psyos.org";

const checks = [
  {
    id: "web-root",
    url: `${webUrl}/`,
    expectStatus: 200,
    expectContentTypeIncludes: "text/html",
    expectRequestIdHeader: false,
  },
  {
    id: "web-workspace",
    url: `${webUrl}/workspaces/psyos-lab`,
    expectStatus: 200,
    expectContentTypeIncludes: "text/html",
    expectRequestIdHeader: false,
  },
  {
    id: "web-settings",
    url: `${webUrl}/workspaces/psyos-lab/settings`,
    expectStatus: 200,
    expectContentTypeIncludes: "text/html",
    expectRequestIdHeader: false,
  },
  {
    id: "api-health",
    url: `${apiUrl}/healthz`,
    expectStatus: 200,
    expectJson: (body) => body?.status === "ok",
    expectRequestIdHeader: true,
  },
  {
    id: "api-openapi",
    url: `${apiUrl}/api/v1/openapi.json`,
    expectStatus: 200,
    expectJson: (body) => typeof body?.openapi === "string",
    expectRequestIdHeader: true,
  },
  {
    id: "api-system",
    url: `${apiUrl}/api/v1/maintenance/system`,
    expectStatus: 200,
    expectJson: (body) =>
      typeof body?.northStar === "string" &&
      body?.runtime?.requestIdHeader === "x-psyos-request-id" &&
      body?.deployment?.smokeCheckCommand === "pnpm smoke:live",
    expectRequestIdHeader: true,
  },
  {
    id: "api-auth-config",
    url: `${apiUrl}/api/v1/auth/config`,
    expectStatus: 200,
    expectJson: (body) =>
      typeof body?.sessionCookieName === "string" &&
      Array.isArray(body?.providers) &&
      body.providers.some((provider) => provider?.id === "workspace_api_key"),
    expectRequestIdHeader: true,
  },
  {
    id: "api-auth-session-anon",
    url: `${apiUrl}/api/v1/auth/session?workspaceSlug=psyos-lab`,
    expectStatus: 200,
    expectJson: (body) =>
      typeof body?.authenticated === "boolean" &&
      Array.isArray(body?.workspaceMemberships),
    expectRequestIdHeader: true,
  },
  {
    id: "api-gaps",
    url: `${apiUrl}/api/v1/maintenance/gaps`,
    expectStatus: 200,
    expectJson: (body) =>
      Array.isArray(body?.gaps) &&
      body.gaps.length > 0 &&
      typeof body.gaps[0]?.nextAction === "string",
    expectRequestIdHeader: true,
  },
  {
    id: "api-events",
    url: `${apiUrl}/api/v1/maintenance/events`,
    expectStatus: 200,
    expectJson: (body) =>
      Array.isArray(body?.events) &&
      body.events.length > 0 &&
      typeof body.events[0]?.strategy === "string",
    expectRequestIdHeader: true,
  },
  {
    id: "api-deploys",
    url: `${apiUrl}/api/v1/maintenance/deploys`,
    expectStatus: 200,
    expectJson: (body) =>
      Array.isArray(body?.deploys) &&
      body.deploys.length > 0 &&
      typeof body.deploys[0]?.rollbackChecklistId === "string",
    expectRequestIdHeader: true,
  },
  {
    id: "api-checklists",
    url: `${apiUrl}/api/v1/maintenance/checklists`,
    expectStatus: 200,
    expectJson: (body) =>
      Array.isArray(body?.checklists) &&
      body.checklists.some((checklist) => checklist?.id === "production-rollback"),
    expectRequestIdHeader: true,
  },
  {
    id: "api-asset-manifest",
    url: `${apiUrl}/api/v1/asset-os/manifest`,
    expectStatus: 200,
    expectJson: (body) =>
      Array.isArray(body?.assets) &&
      body.assets.length > 0 &&
      typeof body.assets[0]?.contentHash === "string",
    expectRequestIdHeader: true,
  },
  {
    id: "api-dogfood-overview",
    url: `${apiUrl}/api/v1/dogfood/overview`,
    expectStatus: 200,
    expectJson: (body) =>
      typeof body?.workspace?.slug === "string" &&
      Array.isArray(body?.studies) &&
      body.studies.length > 0 &&
      Array.isArray(body?.assets) &&
      body.assets.length > 0,
    expectRequestIdHeader: true,
  },
  {
    id: "api-workspace-snapshot",
    url: `${apiUrl}/api/v1/workspaces/psyos-lab/snapshot`,
    expectStatus: 200,
    expectJson: (body) =>
      typeof body?.workspace?.slug === "string" &&
      body.workspace.slug === "psyos-lab" &&
      Array.isArray(body?.projects) &&
      Array.isArray(body?.studies),
    expectRequestIdHeader: true,
  },
  {
    id: "api-workspace-roadmap",
    url: `${apiUrl}/api/v1/workspaces/psyos-lab/roadmap`,
    expectStatus: 200,
    expectJson: (body) =>
      typeof body?.workspace?.slug === "string" &&
      body.workspace.slug === "psyos-lab" &&
      Array.isArray(body?.columns) &&
      Array.isArray(body?.items) &&
      Array.isArray(body?.dependencies),
    expectRequestIdHeader: true,
  },
  {
    id: "api-docs",
    url: `${apiUrl}/api/v1/docs`,
    expectStatus: 200,
    expectContentTypeIncludes: "text/html",
    expectRequestIdHeader: true,
  },
];

const failures = [];

for (const check of checks) {
  const start = Date.now();

  try {
    const response = await fetch(check.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    const elapsedMs = Date.now() - start;
    const contentType = response.headers.get("content-type") || "";
    const requestId = response.headers.get("x-psyos-request-id");

    if (response.status !== check.expectStatus) {
      failures.push(
        `${check.id}: expected status ${check.expectStatus}, got ${response.status}`,
      );
      continue;
    }

    if (
      check.expectContentTypeIncludes &&
      !contentType.includes(check.expectContentTypeIncludes)
    ) {
      failures.push(
        `${check.id}: expected content-type including "${check.expectContentTypeIncludes}", got "${contentType}"`,
      );
      continue;
    }

    if (check.expectRequestIdHeader && !requestId) {
      failures.push(`${check.id}: missing x-psyos-request-id header`);
      continue;
    }

    if (check.expectJson) {
      const body = await response.json();
      if (!check.expectJson(body)) {
        failures.push(`${check.id}: JSON shape assertion failed`);
        continue;
      }
    } else {
      await response.text();
    }

    console.log(`PASS ${check.id} ${response.status} ${elapsedMs}ms ${check.url}`);
  } catch (error) {
    failures.push(
      `${check.id}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (failures.length > 0) {
  console.error("Live smoke checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("All live smoke checks passed.");
