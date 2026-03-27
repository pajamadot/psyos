import { describe, expect, it } from "vitest";

import app from "./index";
import {
  buildTestDatabase,
  extractEmailAddress,
  loadRootEnvLocal,
} from "./test-helpers";

const shouldRun = process.env.RUN_RESEND_E2E === "1";
const runSuite = shouldRun ? describe : describe.skip;

type ResendEmailRecord = {
  id: string;
  html: string | null;
  text: string | null;
  last_event: string | null;
  to?: string[];
  subject?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retrieveResendEmail(
  apiKey: string,
  messageId: string,
): Promise<ResendEmailRecord> {
  let lastStatus = "unavailable";

  for (let attempt = 0; attempt < 15; attempt += 1) {
    const response = await fetch(`https://api.resend.com/emails/${messageId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    lastStatus = String(response.status);

    if (response.ok) {
      const payload = (await response.json()) as ResendEmailRecord;
      const body = payload.html ?? payload.text ?? "";

      if (body.includes("auth_token=")) {
        return payload;
      }
    }

    await sleep(2000);
  }

  throw new Error(
    `Timed out retrieving Resend email ${messageId}. Last status: ${lastStatus}.`,
  );
}

function extractLoginUrl(payload: ResendEmailRecord) {
  const body = payload.html ?? payload.text ?? "";
  const hrefMatch = body.match(/href="([^"]+)"/i);
  if (hrefMatch?.[1]) {
    return hrefMatch[1];
  }

  const urlMatch = body.match(/https:\/\/[^\s<"]+/i);
  if (urlMatch?.[0]) {
    return urlMatch[0];
  }

  throw new Error("Unable to extract a login URL from the Resend email body.");
}

runSuite("psyos resend auth e2e", () => {
  it("runs a real request-link to session lifecycle through Resend", async () => {
    const envLocal = loadRootEnvLocal();
    const resendApiKey =
      envLocal.AUTH_RESEND_API_KEY ?? process.env.AUTH_RESEND_API_KEY;
    const fromEmail = envLocal.AUTH_EMAIL_FROM ?? process.env.AUTH_EMAIL_FROM;
    const recipientEmail =
      envLocal.AUTH_E2E_TEST_EMAIL ??
      process.env.AUTH_E2E_TEST_EMAIL ??
      (fromEmail ? extractEmailAddress(fromEmail) : undefined);

    if (!resendApiKey) {
      throw new Error("Missing AUTH_RESEND_API_KEY in .env.local.");
    }

    if (!fromEmail) {
      throw new Error("Missing AUTH_EMAIL_FROM in .env.local.");
    }

    if (!recipientEmail) {
      throw new Error(
        "Missing AUTH_E2E_TEST_EMAIL in .env.local and AUTH_EMAIL_FROM could not be parsed.",
      );
    }

    const database = buildTestDatabase();
    const env = {
      APP_NAME: "psyos-api",
      APP_VERSION: "0.1.0",
      DEPLOY_ENVIRONMENT: "development",
      PUBLIC_WEB_URL: envLocal.PUBLIC_WEB_URL || "https://psyos.org",
      PUBLIC_API_URL: envLocal.PUBLIC_API_URL || "https://api.psyos.org",
      AUTH_EMAIL_PROVIDER: "resend",
      AUTH_EMAIL_FROM: fromEmail,
      AUTH_RESEND_API_KEY: resendApiKey,
      AUTH_COOKIE_DOMAIN: envLocal.AUTH_COOKIE_DOMAIN || "psyos.org",
      DB: database,
    };

    try {
      const requestResponse = await app.request(
        "/api/v1/auth/email/request-link",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email: recipientEmail,
            displayName: "Resend E2E Operator",
            workspaceSlug: "psyos-lab",
          }),
        },
        env,
      );

      expect(requestResponse.status).toBe(200);
      const requestBody = (await requestResponse.json()) as {
        ok: true;
        delivery: {
          channel: string;
          status: string;
          messageId?: string | null;
        };
      };

      expect(requestBody.ok).toBe(true);
      expect(requestBody.delivery.channel).toBe("resend");
      expect(requestBody.delivery.status).toBe("sent");
      expect(requestBody.delivery.messageId).toEqual(expect.any(String));

      const emailRecord = await retrieveResendEmail(
        resendApiKey,
        requestBody.delivery.messageId ?? "",
      );
      const loginUrl = extractLoginUrl(emailRecord);
      const token = new URL(loginUrl).searchParams.get("auth_token");

      expect(token).toEqual(expect.any(String));

      const consumeResponse = await app.request(
        "/api/v1/auth/email/consume-link",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            token,
            workspaceSlug: "psyos-lab",
          }),
        },
        env,
      );

      expect(consumeResponse.status).toBe(200);
      const sessionCookie = consumeResponse.headers.get("set-cookie");
      expect(sessionCookie).toContain("psyos_session=");

      const cookieHeader = sessionCookie?.split(";")[0] ?? "";
      const sessionResponse = await app.request(
        "/api/v1/auth/session?workspaceSlug=psyos-lab",
        {
          headers: {
            cookie: cookieHeader,
          },
        },
        env,
      );

      expect(sessionResponse.status).toBe(200);
      await expect(sessionResponse.json()).resolves.toMatchObject({
        authenticated: true,
        user: {
          primaryEmail: recipientEmail.toLowerCase(),
        },
        currentWorkspaceMembership: {
          workspaceSlug: "psyos-lab",
        },
      });

      const signOutResponse = await app.request(
        "/api/v1/auth/sign-out",
        {
          method: "POST",
          headers: {
            cookie: cookieHeader,
          },
        },
        env,
      );

      expect(signOutResponse.status).toBe(200);
      await expect(signOutResponse.json()).resolves.toMatchObject({
        ok: true,
      });
    } finally {
      database.close();
    }
  }, 90000);
});
