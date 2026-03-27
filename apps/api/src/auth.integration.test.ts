import { afterEach, describe, expect, it, vi } from "vitest";

import app from "./index";
import { buildTestDatabase } from "./test-helpers";

type MailpitMessage = {
  HTML: string;
  To: Array<{ Email: string }>;
};

const authHeaders = {
  "content-type": "application/json",
  origin: "https://psyos.org",
};

function extractMagicLinkToken(message: MailpitMessage) {
  const hrefMatch = message.HTML.match(/href="([^"]+)"/);
  expect(hrefMatch?.[1]).toBeTruthy();
  return new URL(hrefMatch?.[1] ?? "https://psyos.org").searchParams.get(
    "auth_token",
  );
}

describe("psyos auth integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("manages multiple sessions and auth activity for one user", async () => {
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

    const requestLink = async () => {
      const response = await app.request(
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

      expect(response.status).toBe(200);
      const payload = (await response.json()) as {
        delivery: {
          messageId: string | null;
        };
      };
      expect(payload.delivery.messageId).toBeNull();
    };

    const consumeLink = async (token: string, userAgent: string) => {
      const response = await app.request(
        "/api/v1/auth/email/consume-link",
        {
          method: "POST",
          headers: {
            ...authHeaders,
            "user-agent": userAgent,
          },
          body: JSON.stringify({
            token,
            workspaceSlug: "psyos-lab",
          }),
        },
        env,
      );

      expect(response.status).toBe(200);
      const sessionCookie = response.headers.get("set-cookie");
      expect(sessionCookie).toContain("psyos_session=");
      return sessionCookie?.split(";")[0] ?? "";
    };

    await requestLink();
    await requestLink();

    expect(mailDeliveries).toHaveLength(2);
    const [firstMessage, secondMessage] = mailDeliveries;
    if (!firstMessage || !secondMessage) {
      throw new Error("Expected two Mailpit messages for the auth flow.");
    }

    expect(firstMessage.To[0]?.Email).toBe("operator@example.com");

    const firstToken = extractMagicLinkToken(firstMessage);
    const secondToken = extractMagicLinkToken(secondMessage);

    expect(firstToken).toBeTruthy();
    expect(secondToken).toBeTruthy();

    const firstCookie = await consumeLink(
      firstToken ?? "",
      "PsyOS Browser Session A",
    );
    const secondCookie = await consumeLink(
      secondToken ?? "",
      "PsyOS Browser Session B",
    );

    const inventoryResponse = await app.request(
      "/api/v1/auth/sessions",
      {
        headers: {
          cookie: firstCookie,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Browser Session A",
        },
      },
      env,
    );

    expect(inventoryResponse.status).toBe(200);
    const inventoryBody = (await inventoryResponse.json()) as {
      authenticated: boolean;
      sessions: Array<{
        id: string;
        isCurrent: boolean;
        userAgent: string | null;
      }>;
    };
    expect(inventoryBody.authenticated).toBe(true);
    expect(inventoryBody.sessions).toHaveLength(2);
    expect(
      inventoryBody.sessions.filter((session) => session.isCurrent),
    ).toHaveLength(1);
    expect(inventoryBody.sessions.map((session) => session.userAgent)).toEqual(
      expect.arrayContaining([
        "PsyOS Browser Session A",
        "PsyOS Browser Session B",
      ]),
    );

    const remoteSession = inventoryBody.sessions.find(
      (session) => !session.isCurrent,
    );
    expect(remoteSession?.id).toBeTruthy();

    const activityResponse = await app.request(
      "/api/v1/auth/activity?limit=10",
      {
        headers: {
          cookie: firstCookie,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Browser Session A",
        },
      },
      env,
    );

    expect(activityResponse.status).toBe(200);
    const activityBody = (await activityResponse.json()) as {
      authenticated: boolean;
      events: Array<{
        eventType: string;
        metadata: Record<string, unknown>;
      }>;
    };
    expect(activityBody.authenticated).toBe(true);
    expect(activityBody.events.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        "magic_link_requested",
        "magic_link_consumed",
        "session_created",
      ]),
    );

    const revokeResponse = await app.request(
      "/api/v1/auth/sessions/revoke",
      {
        method: "POST",
        headers: {
          ...authHeaders,
          cookie: firstCookie,
          "user-agent": "PsyOS Browser Session A",
        },
        body: JSON.stringify({
          sessionId: remoteSession?.id,
        }),
      },
      env,
    );

    expect(revokeResponse.status).toBe(200);
    const revokeBody = (await revokeResponse.json()) as {
      ok: true;
      currentSessionCleared: boolean;
      inventory: {
        authenticated: boolean;
        sessions: Array<{ id: string }>;
      };
    };
    expect(revokeBody.ok).toBe(true);
    expect(revokeBody.currentSessionCleared).toBe(false);
    expect(revokeBody.inventory.authenticated).toBe(true);
    expect(revokeBody.inventory.sessions).toHaveLength(1);
    expect(revokeBody.inventory.sessions[0]?.id).not.toBe(remoteSession?.id);

    const activityAfterRevokeResponse = await app.request(
      "/api/v1/auth/activity?limit=10",
      {
        headers: {
          cookie: firstCookie,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Browser Session A",
        },
      },
      env,
    );

    expect(activityAfterRevokeResponse.status).toBe(200);
    const activityAfterRevoke = (await activityAfterRevokeResponse.json()) as {
      events: Array<{
        eventType: string;
        metadata: Record<string, unknown>;
      }>;
    };
    expect(activityAfterRevoke.events.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(["session_revoked"]),
    );

    const signOutResponse = await app.request(
      "/api/v1/auth/sign-out",
      {
        method: "POST",
        headers: {
          cookie: firstCookie,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Browser Session A",
        },
      },
      env,
    );

    expect(signOutResponse.status).toBe(200);
    await expect(signOutResponse.json()).resolves.toMatchObject({
      ok: true,
    });

    const revokedSessionResponse = await app.request(
      "/api/v1/auth/session?workspaceSlug=psyos-lab",
      {
        headers: {
          cookie: firstCookie,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Browser Session A",
        },
      },
      env,
    );

    expect(revokedSessionResponse.status).toBe(200);
    await expect(revokedSessionResponse.json()).resolves.toMatchObject({
      authenticated: false,
    });

    const secondSessionResponse = await app.request(
      "/api/v1/auth/session?workspaceSlug=psyos-lab",
      {
        headers: {
          cookie: secondCookie,
          origin: "https://psyos.org",
          "user-agent": "PsyOS Browser Session B",
        },
      },
      env,
    );

    expect(secondSessionResponse.status).toBe(200);
    await expect(secondSessionResponse.json()).resolves.toMatchObject({
      authenticated: false,
    });

    database.close();
  });
});
