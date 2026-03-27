import { describe, expect, it } from "vitest";

import app from "./index";

describe("psyos api", () => {
  it("serves health", async () => {
    const response = await app.request("/healthz");

    expect(response.status).toBe(200);
    expect(response.headers.get("x-psyos-request-id")).toEqual(
      expect.any(String),
    );
    expect(response.headers.get("x-psyos-runtime-version")).toBe("0.1.0");
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      database: {
        configured: false,
      },
    });
  });

  it("returns bootstrap studies response without D1", async () => {
    const response = await app.request("/api/v1/studies");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      studies: [],
      source: "bootstrap",
    });
  });

  it("serves the meta-process surface", async () => {
    const response = await app.request("/api/v1/discover/meta-process");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      northStar: expect.any(String),
      lockedDecisions: {
        agentAuthorship: true,
        agentParticipation: true,
      },
    });
  });

  it("serves enriched system metadata", async () => {
    const response = await app.request("/api/v1/maintenance/system");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      version: "0.1.0",
      runtime: {
        requestIdHeader: "x-psyos-request-id",
        deployedVia: "wrangler",
      },
      auth: {
        agentAuth: "Workspace-scoped API keys",
        humanAuth: "OAuth plus email magic link",
        emailProvider: "disabled",
        integrationEmailHarness: "Mailpit",
        separateIdentityModels: true,
      },
      docs: {
        deploys: "/api/v1/maintenance/deploys",
        checklists: "/api/v1/maintenance/checklists",
        assetManifest: "/api/v1/asset-os/manifest",
        dogfoodOverview: "/api/v1/dogfood/overview",
        workspaceSnapshotTemplate:
          "/api/v1/workspaces/{workspaceSlug}/snapshot",
        workspaceRoadmapTemplate: "/api/v1/workspaces/{workspaceSlug}/roadmap",
        workspaceAssetManifestTemplate:
          "/api/v1/workspaces/{workspaceSlug}/asset-os/manifest",
      },
      observability: {
        requestIdHeader: "x-psyos-request-id",
      },
    });
  });

  it("serves auth configuration metadata", async () => {
    const response = await app.request("/api/v1/auth/config");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sessionCookieName: "psyos_session",
      emailProvider: "disabled",
      providers: expect.arrayContaining([
        expect.objectContaining({
          id: "email_magic_link",
          state: "disabled",
        }),
        expect.objectContaining({
          id: "workspace_api_key",
          state: "enabled",
        }),
      ]),
    });
  });

  it("serves an anonymous auth session without D1", async () => {
    const response = await app.request(
      "/api/v1/auth/session?workspaceSlug=psyos-lab",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      authenticated: false,
      user: null,
      workspaceMemberships: [],
      currentWorkspaceMembership: null,
      workspaceIdentity: null,
    });
  });

  it("rejects auth session inventory without D1", async () => {
    const response = await app.request("/api/v1/auth/sessions");

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("D1 binding"),
    });
  });

  it("rejects auth activity without D1", async () => {
    const response = await app.request("/api/v1/auth/activity");

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("D1 binding"),
    });
  });

  it("rejects auth session revoke without D1", async () => {
    const response = await app.request("/api/v1/auth/sessions/revoke", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sessionId: "session_001",
      }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("D1 binding"),
    });
  });

  it("rejects magic-link requests without D1", async () => {
    const response = await app.request("/api/v1/auth/email/request-link", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "operator@example.com",
        workspaceSlug: "psyos-lab",
      }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("D1 binding"),
    });
  });

  it("serves structured maintenance gaps", async () => {
    const response = await app.request("/api/v1/maintenance/gaps");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      gaps: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          nextAction: expect.any(String),
        }),
      ]),
    });
  });

  it("serves operational events", async () => {
    const response = await app.request("/api/v1/maintenance/events");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      events: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          strategy: expect.any(String),
          summary: expect.any(String),
        }),
      ]),
    });
  });

  it("serves deploy history records", async () => {
    const response = await app.request("/api/v1/maintenance/deploys");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deploys: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          environment: "production",
          rollbackChecklistId: "production-rollback",
          verification: expect.arrayContaining([expect.any(String)]),
        }),
      ]),
    });
  });

  it("serves operational checklists", async () => {
    const response = await app.request("/api/v1/maintenance/checklists");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      checklists: expect.arrayContaining([
        expect.objectContaining({
          id: "production-rollback",
          category: "rollback",
          steps: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              title: expect.any(String),
              successSignal: expect.any(String),
            }),
          ]),
        }),
      ]),
    });
  });

  it("serves empty asset manifest without D1", async () => {
    const response = await app.request("/api/v1/asset-os/manifest");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      assets: [],
      source: "bootstrap",
    });
  });

  it("serves empty dogfood overview without D1", async () => {
    const response = await app.request("/api/v1/dogfood/overview");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      workspace: null,
      projects: [],
      studies: [],
      opportunities: [],
      assets: [],
      source: "bootstrap",
    });
  });

  it("serves empty workspace snapshot without D1", async () => {
    const response = await app.request("/api/v1/workspaces/psyos-lab/snapshot");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      workspace: null,
      projects: [],
      studies: [],
      opportunities: [],
      assets: [],
      source: "bootstrap",
    });
  });

  it("serves empty workspace roadmap without D1", async () => {
    const response = await app.request("/api/v1/workspaces/psyos-lab/roadmap");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      workspace: null,
      columns: [],
      items: [],
      dependencies: [],
      source: "bootstrap",
    });
  });

  it("serves empty workspace asset manifest without D1", async () => {
    const response = await app.request(
      "/api/v1/workspaces/psyos-lab/asset-os/manifest",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      workspace: null,
      assets: [],
      source: "bootstrap",
    });
  });
});
