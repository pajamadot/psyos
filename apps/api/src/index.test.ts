import { describe, expect, it } from "vitest";

import app from "./index";

describe("psyos api", () => {
  it("serves health", async () => {
    const response = await app.request("/healthz");

    expect(response.status).toBe(200);
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
});
