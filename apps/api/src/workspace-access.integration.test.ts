import { afterEach, describe, expect, it, vi } from "vitest";

import app from "./index";
import { buildTestDatabase } from "./test-helpers";

type MailpitMessage = {
  HTML: string;
};

const authHeaders = {
  "content-type": "application/json",
  origin: "https://psyos.org",
};

const extractMagicLinkToken = (message: MailpitMessage) => {
  const hrefMatch = message.HTML.match(/href="([^"]+)"/);
  expect(hrefMatch?.[1]).toBeTruthy();
  return new URL(hrefMatch?.[1] ?? "https://psyos.org").searchParams.get(
    "auth_token",
  );
};

describe("psyos workspace access", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("projects anonymous viewer state for public workspace routes", async () => {
    const database = buildTestDatabase();
    const env = {
      APP_NAME: "psyos-api",
      APP_VERSION: "0.1.0",
      DEPLOY_ENVIRONMENT: "development",
      PUBLIC_WEB_URL: "https://psyos.org",
      PUBLIC_API_URL: "https://api.psyos.org",
      DB: database,
    };

    const snapshotResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/snapshot",
      undefined,
      env,
    );

    expect(snapshotResponse.status).toBe(200);
    await expect(snapshotResponse.json()).resolves.toMatchObject({
      workspace: {
        slug: "psyos-lab",
        visibility: "public",
      },
      access: {
        mode: "public_read",
        viewer: {
          authenticated: false,
          capabilities: [],
        },
      },
    });

    const manifestResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/asset-os/manifest",
      undefined,
      env,
    );

    expect(manifestResponse.status).toBe(200);
    await expect(manifestResponse.json()).resolves.toMatchObject({
      workspace: {
        slug: "psyos-lab",
        visibility: "public",
      },
      access: {
        mode: "public_read",
      },
      assets: expect.any(Array),
    });

    database.close();
  });

  it("requires membership for private workspaces and projects owner capabilities after login", async () => {
    const database = buildTestDatabase();
    const mailDeliveries: MailpitMessage[] = [];

    database.exec(
      "UPDATE workspaces SET visibility = 'private' WHERE slug = 'psyos-lab';",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        if (init?.body && typeof init.body === "string") {
          mailDeliveries.push(JSON.parse(init.body) as MailpitMessage);
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }),
    );

    const env = {
      APP_NAME: "psyos-api",
      APP_VERSION: "0.1.0",
      DEPLOY_ENVIRONMENT: "development",
      PUBLIC_WEB_URL: "https://psyos.org",
      PUBLIC_API_URL: "https://api.psyos.org",
      AUTH_EMAIL_PROVIDER: "mailpit",
      MAILPIT_HTTP_URL: "http://mailpit.test",
      DB: database,
    };

    const anonymousSnapshot = await app.request(
      "/api/v1/workspaces/psyos-lab/snapshot",
      undefined,
      env,
    );

    expect(anonymousSnapshot.status).toBe(403);
    await expect(anonymousSnapshot.json()).resolves.toMatchObject({
      error: expect.stringContaining("private"),
    });

    const anonymousManifest = await app.request(
      "/api/v1/workspaces/psyos-lab/asset-os/manifest",
      undefined,
      env,
    );

    expect(anonymousManifest.status).toBe(403);

    const requestLinkResponse = await app.request(
      "/api/v1/auth/email/request-link",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          email: "operator@example.com",
          displayName: "Operator",
          workspaceSlug: "psyos-lab",
        }),
      },
      env,
    );

    expect(requestLinkResponse.status).toBe(200);
    const loginToken = extractMagicLinkToken(mailDeliveries[0] ?? { HTML: "" });
    expect(loginToken).toBeTruthy();

    const consumeResponse = await app.request(
      "/api/v1/auth/email/consume-link",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          "user-agent": "PsyOS Boundary Test",
        },
        body: JSON.stringify({
          token: loginToken,
          workspaceSlug: "psyos-lab",
        }),
      },
      env,
    );

    expect(consumeResponse.status).toBe(200);
    const sessionCookie = consumeResponse.headers.get("set-cookie");
    expect(sessionCookie).toContain("psyos_session=");
    const cookieHeader = sessionCookie?.split(";")[0] ?? "";

    const authorizedSnapshot = await app.request(
      "/api/v1/workspaces/psyos-lab/snapshot",
      {
        headers: {
          cookie: cookieHeader,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Boundary Test",
        },
      },
      env,
    );

    expect(authorizedSnapshot.status).toBe(200);
    await expect(authorizedSnapshot.json()).resolves.toMatchObject({
      workspace: {
        slug: "psyos-lab",
        visibility: "private",
      },
      access: {
        mode: "workspace_member",
        viewer: {
          authenticated: true,
          authMethod: "session",
          actorKind: "human",
          workspaceRole: "owner",
          workspaceIdentityHandle: expect.any(String),
          capabilities: expect.arrayContaining([
            "workspace.read",
            "asset.write",
            "study.publish",
          ]),
        },
      },
    });

    const authorizedManifest = await app.request(
      "/api/v1/workspaces/psyos-lab/asset-os/manifest",
      {
        headers: {
          cookie: cookieHeader,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Boundary Test",
        },
      },
      env,
    );

    expect(authorizedManifest.status).toBe(200);
    await expect(authorizedManifest.json()).resolves.toMatchObject({
      workspace: {
        slug: "psyos-lab",
        visibility: "private",
      },
      access: {
        mode: "workspace_member",
        viewer: {
          workspaceRole: "owner",
        },
      },
      assets: expect.arrayContaining([
        expect.objectContaining({
          workspaceSlug: "psyos-lab",
        }),
      ]),
    });

    const authorizedRoadmap = await app.request(
      "/api/v1/workspaces/psyos-lab/roadmap",
      {
        headers: {
          cookie: cookieHeader,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Boundary Test",
        },
      },
      env,
    );

    expect(authorizedRoadmap.status).toBe(200);
    await expect(authorizedRoadmap.json()).resolves.toMatchObject({
      workspace: {
        slug: "psyos-lab",
        visibility: "private",
      },
      access: {
        mode: "workspace_member",
      },
      items: expect.any(Array),
    });

    database.close();
  });

  it("gates roadmap mutations by capability and persists create/update flows", async () => {
    const database = buildTestDatabase();
    const mailDeliveries: MailpitMessage[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        if (init?.body && typeof init.body === "string") {
          mailDeliveries.push(JSON.parse(init.body) as MailpitMessage);
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }),
    );

    const env = {
      APP_NAME: "psyos-api",
      APP_VERSION: "0.1.0",
      DEPLOY_ENVIRONMENT: "development",
      PUBLIC_WEB_URL: "https://psyos.org",
      PUBLIC_API_URL: "https://api.psyos.org",
      AUTH_EMAIL_PROVIDER: "mailpit",
      MAILPIT_HTTP_URL: "http://mailpit.test",
      DB: database,
    };

    const anonymousCreateResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/roadmap/items",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          columnSlug: "ready",
          title: "Anonymous should not create this",
          summary: "Capability gate check",
          kind: "platform",
        }),
      },
      env,
    );

    expect(anonymousCreateResponse.status).toBe(401);

    const requestLinkResponse = await app.request(
      "/api/v1/auth/email/request-link",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          email: "mutation-operator@example.com",
          displayName: "Mutation Operator",
          workspaceSlug: "psyos-lab",
        }),
      },
      env,
    );

    expect(requestLinkResponse.status).toBe(200);
    const loginToken = extractMagicLinkToken(mailDeliveries[0] ?? { HTML: "" });
    expect(loginToken).toBeTruthy();

    const consumeResponse = await app.request(
      "/api/v1/auth/email/consume-link",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          "user-agent": "PsyOS Mutation Test",
        },
        body: JSON.stringify({
          token: loginToken,
          workspaceSlug: "psyos-lab",
        }),
      },
      env,
    );

    expect(consumeResponse.status).toBe(200);
    const sessionCookie = consumeResponse.headers.get("set-cookie");
    expect(sessionCookie).toContain("psyos_session=");
    const cookieHeader = sessionCookie?.split(";")[0] ?? "";

    database.exec(
      "UPDATE workspace_memberships SET role = 'viewer' WHERE workspace_id = 'ws_psyos_lab';",
    );

    const viewerCreateResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/roadmap/items",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Mutation Test",
        },
        body: JSON.stringify({
          columnSlug: "ready",
          title: "Viewer should not create this",
          summary: "Capability gate check",
          kind: "platform",
        }),
      },
      env,
    );

    expect(viewerCreateResponse.status).toBe(403);

    database.exec(
      "UPDATE workspace_memberships SET role = 'researcher' WHERE workspace_id = 'ws_psyos_lab';",
    );

    const createResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/roadmap/items",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Mutation Test",
        },
        body: JSON.stringify({
          projectSlug: "adaptive-nback",
          columnSlug: "ready",
          title: "Dogfood roadmap mutation",
          summary: "Create a real roadmap card through the control-plane API.",
          kind: "platform",
          assigneeHandle: "psyos-agent-lab",
          studySlug: "adaptive-nback",
          metadata: {
            source: "workspace-access.integration.test",
          },
        }),
      },
      env,
    );

    expect(createResponse.status).toBe(201);
    const createBody = (await createResponse.json()) as {
      ok: true;
      item: {
        id: string;
        projectSlug: string | null;
        columnSlug: string;
        status: string;
        assigneeHandle: string | null;
        studySlug: string | null;
        metadata: Record<string, unknown>;
      };
    };
    expect(createBody.ok).toBe(true);
    expect(createBody.item.projectSlug).toBe("adaptive-nback");
    expect(createBody.item.columnSlug).toBe("ready");
    expect(createBody.item.status).toBe("ready");
    expect(createBody.item.assigneeHandle).toBe("psyos-agent-lab");
    expect(createBody.item.studySlug).toBe("adaptive-nback");
    expect(createBody.item.metadata.source).toBe(
      "workspace-access.integration.test",
    );

    const updateResponse = await app.request(
      `/api/v1/workspaces/psyos-lab/roadmap/items/${createBody.item.id}`,
      {
        method: "PATCH",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Mutation Test",
        },
        body: JSON.stringify({
          status: "done",
          title: "Dogfood roadmap mutation closed",
          studySlug: null,
        }),
      },
      env,
    );

    expect(updateResponse.status).toBe(200);
    const updateBody = (await updateResponse.json()) as {
      ok: true;
      item: {
        id: string;
        title: string;
        columnSlug: string;
        status: string;
        studySlug: string | null;
      };
    };
    expect(updateBody.ok).toBe(true);
    expect(updateBody.item.id).toBe(createBody.item.id);
    expect(updateBody.item.title).toBe("Dogfood roadmap mutation closed");
    expect(updateBody.item.columnSlug).toBe("done");
    expect(updateBody.item.status).toBe("done");
    expect(updateBody.item.studySlug).toBeNull();

    const roadmapResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/roadmap",
      {
        headers: {
          cookie: cookieHeader,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Mutation Test",
        },
      },
      env,
    );

    expect(roadmapResponse.status).toBe(200);
    await expect(roadmapResponse.json()).resolves.toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          id: createBody.item.id,
          title: "Dogfood roadmap mutation closed",
          columnSlug: "done",
          status: "done",
        }),
      ]),
    });

    database.close();
  });

  it("gates roadmap dependency mutations and rejects DAG cycles", async () => {
    const database = buildTestDatabase();
    const mailDeliveries: MailpitMessage[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        if (init?.body && typeof init.body === "string") {
          mailDeliveries.push(JSON.parse(init.body) as MailpitMessage);
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }),
    );

    const env = {
      APP_NAME: "psyos-api",
      APP_VERSION: "0.1.0",
      DEPLOY_ENVIRONMENT: "development",
      PUBLIC_WEB_URL: "https://psyos.org",
      PUBLIC_API_URL: "https://api.psyos.org",
      AUTH_EMAIL_PROVIDER: "mailpit",
      MAILPIT_HTTP_URL: "http://mailpit.test",
      DB: database,
    };

    const requestLinkResponse = await app.request(
      "/api/v1/auth/email/request-link",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          email: "dependency-operator@example.com",
          displayName: "Dependency Operator",
          workspaceSlug: "psyos-lab",
        }),
      },
      env,
    );

    expect(requestLinkResponse.status).toBe(200);
    const loginToken = extractMagicLinkToken(mailDeliveries[0] ?? { HTML: "" });
    expect(loginToken).toBeTruthy();

    const consumeResponse = await app.request(
      "/api/v1/auth/email/consume-link",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          "user-agent": "PsyOS Dependency Test",
        },
        body: JSON.stringify({
          token: loginToken,
          workspaceSlug: "psyos-lab",
        }),
      },
      env,
    );

    expect(consumeResponse.status).toBe(200);
    const sessionCookie = consumeResponse.headers.get("set-cookie");
    expect(sessionCookie).toContain("psyos_session=");
    const cookieHeader = sessionCookie?.split(";")[0] ?? "";

    const anonymousCreateResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/roadmap/dependencies",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          fromItemId: "item_fake_a",
          toItemId: "item_fake_b",
        }),
      },
      env,
    );

    expect(anonymousCreateResponse.status).toBe(401);

    database.exec(
      "UPDATE workspace_memberships SET role = 'viewer' WHERE workspace_id = 'ws_psyos_lab';",
    );

    const viewerCreateResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/roadmap/dependencies",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Dependency Test",
        },
        body: JSON.stringify({
          fromItemId: "item_fake_a",
          toItemId: "item_fake_b",
        }),
      },
      env,
    );

    expect(viewerCreateResponse.status).toBe(403);

    database.exec(
      "UPDATE workspace_memberships SET role = 'researcher' WHERE workspace_id = 'ws_psyos_lab';",
    );

    const createFirstItemResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/roadmap/items",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Dependency Test",
        },
        body: JSON.stringify({
          columnSlug: "backlog",
          title: "Dependency source",
          summary: "Source node for dependency mutation testing.",
          kind: "platform",
        }),
      },
      env,
    );

    expect(createFirstItemResponse.status).toBe(201);
    const firstItemBody = (await createFirstItemResponse.json()) as {
      item: { id: string };
    };

    const createSecondItemResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/roadmap/items",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Dependency Test",
        },
        body: JSON.stringify({
          columnSlug: "ready",
          title: "Dependency target",
          summary: "Target node for dependency mutation testing.",
          kind: "platform",
        }),
      },
      env,
    );

    expect(createSecondItemResponse.status).toBe(201);
    const secondItemBody = (await createSecondItemResponse.json()) as {
      item: { id: string };
    };

    const createDependencyResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/roadmap/dependencies",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Dependency Test",
        },
        body: JSON.stringify({
          fromItemId: firstItemBody.item.id,
          toItemId: secondItemBody.item.id,
        }),
      },
      env,
    );

    expect(createDependencyResponse.status).toBe(201);
    const createDependencyBody = (await createDependencyResponse.json()) as {
      ok: true;
      dependency: {
        id: string;
        fromItemId: string;
        toItemId: string;
      };
    };
    expect(createDependencyBody.ok).toBe(true);
    expect(createDependencyBody.dependency.fromItemId).toBe(
      firstItemBody.item.id,
    );
    expect(createDependencyBody.dependency.toItemId).toBe(
      secondItemBody.item.id,
    );

    const duplicateDependencyResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/roadmap/dependencies",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Dependency Test",
        },
        body: JSON.stringify({
          fromItemId: firstItemBody.item.id,
          toItemId: secondItemBody.item.id,
        }),
      },
      env,
    );

    expect(duplicateDependencyResponse.status).toBe(409);

    const cycleDependencyResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/roadmap/dependencies",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Dependency Test",
        },
        body: JSON.stringify({
          fromItemId: secondItemBody.item.id,
          toItemId: firstItemBody.item.id,
        }),
      },
      env,
    );

    expect(cycleDependencyResponse.status).toBe(409);

    const deleteDependencyResponse = await app.request(
      `/api/v1/workspaces/psyos-lab/roadmap/dependencies/${createDependencyBody.dependency.id}`,
      {
        method: "DELETE",
        headers: {
          cookie: cookieHeader,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Dependency Test",
        },
      },
      env,
    );

    expect(deleteDependencyResponse.status).toBe(200);
    await expect(deleteDependencyResponse.json()).resolves.toMatchObject({
      ok: true,
      deletedDependencyId: createDependencyBody.dependency.id,
    });

    const roadmapResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/roadmap",
      {
        headers: {
          cookie: cookieHeader,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Dependency Test",
        },
      },
      env,
    );

    expect(roadmapResponse.status).toBe(200);
    const roadmapBody = (await roadmapResponse.json()) as {
      dependencies: { id: string }[];
    };
    expect(
      roadmapBody.dependencies.find(
        (dependency) => dependency.id === createDependencyBody.dependency.id,
      ),
    ).toBeUndefined();

    database.close();
  });

  it("gates study publish mutations and advances latest version state", async () => {
    const database = buildTestDatabase();
    const mailDeliveries: MailpitMessage[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        if (init?.body && typeof init.body === "string") {
          mailDeliveries.push(JSON.parse(init.body) as MailpitMessage);
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }),
    );

    const env = {
      APP_NAME: "psyos-api",
      APP_VERSION: "0.1.0",
      DEPLOY_ENVIRONMENT: "development",
      PUBLIC_WEB_URL: "https://psyos.org",
      PUBLIC_API_URL: "https://api.psyos.org",
      AUTH_EMAIL_PROVIDER: "mailpit",
      MAILPIT_HTTP_URL: "http://mailpit.test",
      DB: database,
    };

    const anonymousPublishResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/studies/adaptive-nback/publish",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          changelog: "Anonymous users cannot publish studies.",
        }),
      },
      env,
    );

    expect(anonymousPublishResponse.status).toBe(401);

    const requestLinkResponse = await app.request(
      "/api/v1/auth/email/request-link",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          email: "publish-operator@example.com",
          displayName: "Publish Operator",
          workspaceSlug: "psyos-lab",
        }),
      },
      env,
    );

    expect(requestLinkResponse.status).toBe(200);
    const loginToken = extractMagicLinkToken(mailDeliveries[0] ?? { HTML: "" });
    expect(loginToken).toBeTruthy();

    const consumeResponse = await app.request(
      "/api/v1/auth/email/consume-link",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          "user-agent": "PsyOS Publish Test",
        },
        body: JSON.stringify({
          token: loginToken,
          workspaceSlug: "psyos-lab",
        }),
      },
      env,
    );

    expect(consumeResponse.status).toBe(200);
    const sessionCookie = consumeResponse.headers.get("set-cookie");
    expect(sessionCookie).toContain("psyos_session=");
    const cookieHeader = sessionCookie?.split(";")[0] ?? "";

    database.exec(
      "UPDATE workspace_memberships SET role = 'viewer' WHERE workspace_id = 'ws_psyos_lab';",
    );

    const viewerPublishResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/studies/adaptive-nback/publish",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Publish Test",
        },
        body: JSON.stringify({
          changelog: "Viewer should not publish studies.",
        }),
      },
      env,
    );

    expect(viewerPublishResponse.status).toBe(403);

    database.exec(
      "UPDATE workspace_memberships SET role = 'researcher' WHERE workspace_id = 'ws_psyos_lab';",
    );

    const publishResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/studies/adaptive-nback/publish",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Publish Test",
        },
        body: JSON.stringify({
          changelog: "Publish v2 from the study control plane.",
        }),
      },
      env,
    );

    expect(publishResponse.status).toBe(201);
    const publishBody = (await publishResponse.json()) as {
      ok: true;
      study: {
        slug: string;
        status: string;
        latestVersion: number;
      };
      publication: {
        studyId: string;
        version: number;
        changelog: string | null;
      };
    };
    expect(publishBody.ok).toBe(true);
    expect(publishBody.study.slug).toBe("adaptive-nback");
    expect(publishBody.study.status).toBe("published");
    expect(publishBody.study.latestVersion).toBe(2);
    expect(publishBody.publication.version).toBe(2);
    expect(publishBody.publication.changelog).toBe(
      "Publish v2 from the study control plane.",
    );

    const snapshotResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/snapshot",
      {
        headers: {
          cookie: cookieHeader,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Publish Test",
        },
      },
      env,
    );

    expect(snapshotResponse.status).toBe(200);
    await expect(snapshotResponse.json()).resolves.toMatchObject({
      studies: expect.arrayContaining([
        expect.objectContaining({
          slug: "adaptive-nback",
          status: "published",
          latestVersion: 2,
        }),
      ]),
      projects: expect.arrayContaining([
        expect.objectContaining({
          slug: "adaptive-nback",
          studyStatus: "published",
          latestVersion: 2,
        }),
      ]),
    });

    database.close();
  });

  it("gates opportunity mutations and keeps workspace snapshot counts aligned", async () => {
    const database = buildTestDatabase();
    const mailDeliveries: MailpitMessage[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        if (init?.body && typeof init.body === "string") {
          mailDeliveries.push(JSON.parse(init.body) as MailpitMessage);
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }),
    );

    const env = {
      APP_NAME: "psyos-api",
      APP_VERSION: "0.1.0",
      DEPLOY_ENVIRONMENT: "development",
      PUBLIC_WEB_URL: "https://psyos.org",
      PUBLIC_API_URL: "https://api.psyos.org",
      AUTH_EMAIL_PROVIDER: "mailpit",
      MAILPIT_HTTP_URL: "http://mailpit.test",
      DB: database,
    };

    const requestLinkResponse = await app.request(
      "/api/v1/auth/email/request-link",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          email: "opportunity-operator@example.com",
          displayName: "Opportunity Operator",
          workspaceSlug: "psyos-lab",
        }),
      },
      env,
    );

    expect(requestLinkResponse.status).toBe(200);
    const loginToken = extractMagicLinkToken(mailDeliveries[0] ?? { HTML: "" });
    expect(loginToken).toBeTruthy();

    const consumeResponse = await app.request(
      "/api/v1/auth/email/consume-link",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          "user-agent": "PsyOS Opportunity Test",
        },
        body: JSON.stringify({
          token: loginToken,
          workspaceSlug: "psyos-lab",
        }),
      },
      env,
    );

    expect(consumeResponse.status).toBe(200);
    const sessionCookie = consumeResponse.headers.get("set-cookie");
    expect(sessionCookie).toContain("psyos_session=");
    const cookieHeader = sessionCookie?.split(";")[0] ?? "";

    database.exec(
      "UPDATE workspace_memberships SET role = 'viewer' WHERE workspace_id = 'ws_psyos_lab';",
    );

    const viewerCreateResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/studies/adaptive-nback/opportunities",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Opportunity Test",
        },
        body: JSON.stringify({
          targetKind: "human",
          status: "open",
          instructionsMd: "Viewer cannot create this opportunity.",
        }),
      },
      env,
    );

    expect(viewerCreateResponse.status).toBe(403);

    database.exec(
      "UPDATE workspace_memberships SET role = 'researcher' WHERE workspace_id = 'ws_psyos_lab';",
    );

    const createResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/studies/adaptive-nback/opportunities",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Opportunity Test",
        },
        body: JSON.stringify({
          targetKind: "human",
          status: "open",
          instructionsMd: "Join the human dogfood cohort for adaptive n-back.",
        }),
      },
      env,
    );

    expect(createResponse.status).toBe(201);
    const createBody = (await createResponse.json()) as {
      ok: true;
      opportunity: {
        id: string;
        studySlug: string;
        targetKind: string;
        status: string;
      };
    };
    expect(createBody.ok).toBe(true);
    expect(createBody.opportunity.studySlug).toBe("adaptive-nback");
    expect(createBody.opportunity.targetKind).toBe("human");
    expect(createBody.opportunity.status).toBe("open");

    const snapshotAfterCreate = await app.request(
      "/api/v1/workspaces/psyos-lab/snapshot",
      {
        headers: {
          cookie: cookieHeader,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Opportunity Test",
        },
      },
      env,
    );

    expect(snapshotAfterCreate.status).toBe(200);
    await expect(snapshotAfterCreate.json()).resolves.toMatchObject({
      studies: expect.arrayContaining([
        expect.objectContaining({
          slug: "adaptive-nback",
          openOpportunityCount: 2,
        }),
      ]),
      projects: expect.arrayContaining([
        expect.objectContaining({
          slug: "adaptive-nback",
          openOpportunityCount: 2,
        }),
      ]),
    });

    const updateResponse = await app.request(
      `/api/v1/workspaces/psyos-lab/studies/adaptive-nback/opportunities/${createBody.opportunity.id}`,
      {
        method: "PATCH",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Opportunity Test",
        },
        body: JSON.stringify({
          status: "closed",
          instructionsMd: "Closed after initial dogfood recruitment batch.",
        }),
      },
      env,
    );

    expect(updateResponse.status).toBe(200);
    await expect(updateResponse.json()).resolves.toMatchObject({
      ok: true,
      opportunity: expect.objectContaining({
        id: createBody.opportunity.id,
        status: "closed",
      }),
    });

    const snapshotAfterClose = await app.request(
      "/api/v1/workspaces/psyos-lab/snapshot",
      {
        headers: {
          cookie: cookieHeader,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Opportunity Test",
        },
      },
      env,
    );

    expect(snapshotAfterClose.status).toBe(200);
    await expect(snapshotAfterClose.json()).resolves.toMatchObject({
      studies: expect.arrayContaining([
        expect.objectContaining({
          slug: "adaptive-nback",
          openOpportunityCount: 1,
        }),
      ]),
      projects: expect.arrayContaining([
        expect.objectContaining({
          slug: "adaptive-nback",
          openOpportunityCount: 1,
        }),
      ]),
    });

    database.close();
  });

  it("gates run ingestion and exposes study-scoped run listings", async () => {
    const database = buildTestDatabase();
    const mailDeliveries: MailpitMessage[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        if (init?.body && typeof init.body === "string") {
          mailDeliveries.push(JSON.parse(init.body) as MailpitMessage);
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }),
    );

    const env = {
      APP_NAME: "psyos-api",
      APP_VERSION: "0.1.0",
      DEPLOY_ENVIRONMENT: "development",
      PUBLIC_WEB_URL: "https://psyos.org",
      PUBLIC_API_URL: "https://api.psyos.org",
      AUTH_EMAIL_PROVIDER: "mailpit",
      MAILPIT_HTTP_URL: "http://mailpit.test",
      DB: database,
    };

    const requestLinkResponse = await app.request(
      "/api/v1/auth/email/request-link",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          email: "run-operator@example.com",
          displayName: "Run Operator",
          workspaceSlug: "psyos-lab",
        }),
      },
      env,
    );

    expect(requestLinkResponse.status).toBe(200);
    const loginToken = extractMagicLinkToken(mailDeliveries[0] ?? { HTML: "" });
    expect(loginToken).toBeTruthy();

    const consumeResponse = await app.request(
      "/api/v1/auth/email/consume-link",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          "user-agent": "PsyOS Run Test",
        },
        body: JSON.stringify({
          token: loginToken,
          workspaceSlug: "psyos-lab",
        }),
      },
      env,
    );

    expect(consumeResponse.status).toBe(200);
    const sessionCookie = consumeResponse.headers.get("set-cookie");
    expect(sessionCookie).toContain("psyos_session=");
    const cookieHeader = sessionCookie?.split(";")[0] ?? "";

    database.exec(
      "UPDATE workspace_memberships SET role = 'viewer' WHERE workspace_id = 'ws_psyos_lab';",
    );

    const viewerIngestResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/studies/adaptive-nback/runs",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Run Test",
        },
        body: JSON.stringify({
          status: "completed",
          eventCount: 48,
          summary: {
            accuracy: 0.82,
            reactionTimeMsMedian: 533,
          },
        }),
      },
      env,
    );

    expect(viewerIngestResponse.status).toBe(403);

    database.exec(
      "UPDATE workspace_memberships SET role = 'researcher' WHERE workspace_id = 'ws_psyos_lab';",
    );

    const ingestResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/studies/adaptive-nback/runs",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: cookieHeader,
          "user-agent": "PsyOS Run Test",
        },
        body: JSON.stringify({
          status: "completed",
          eventCount: 48,
          summary: {
            accuracy: 0.82,
            reactionTimeMsMedian: 533,
          },
        }),
      },
      env,
    );

    expect(ingestResponse.status).toBe(201);
    const ingestBody = (await ingestResponse.json()) as {
      ok: true;
      run: {
        id: string;
        studySlug: string;
        actorHandle: string | null;
        participantKind: string;
        status: string;
        eventCount: number;
        summary: Record<string, unknown>;
      };
    };
    expect(ingestBody.ok).toBe(true);
    expect(ingestBody.run.studySlug).toBe("adaptive-nback");
    expect(ingestBody.run.actorHandle).toBeTruthy();
    expect(ingestBody.run.participantKind).toBe("human");
    expect(ingestBody.run.status).toBe("completed");
    expect(ingestBody.run.eventCount).toBe(48);
    expect(ingestBody.run.summary.accuracy).toBe(0.82);

    const listResponse = await app.request(
      "/api/v1/workspaces/psyos-lab/studies/adaptive-nback/runs",
      {
        headers: {
          cookie: cookieHeader,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Run Test",
        },
      },
      env,
    );

    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toMatchObject({
      access: {
        mode: "public_read",
        viewer: {
          authenticated: true,
          workspaceRole: "researcher",
        },
      },
      study: expect.objectContaining({
        slug: "adaptive-nback",
      }),
      runs: expect.arrayContaining([
        expect.objectContaining({
          id: ingestBody.run.id,
          status: "completed",
          eventCount: 48,
        }),
      ]),
    });

    database.close();
  });
});
