import { describe, expect, it } from "vitest";

import {
  actorKindSchema,
  participationOpportunitySchema,
  studySchema,
} from "./research";

describe("psyos contracts", () => {
  it("accepts supported actor kinds", () => {
    expect(actorKindSchema.parse("human")).toBe("human");
    expect(actorKindSchema.parse("agent")).toBe("agent");
  });

  it("validates studies", () => {
    const parsed = studySchema.parse({
      id: "study_001",
      workspaceId: "workspace_001",
      projectId: "project_001",
      slug: "memory-systems",
      title: "Memory Systems",
      summary: "A bootstrap study object.",
      status: "draft",
      researchType: "survey",
      leadIdentityId: "identity_001",
      createdAt: "2026-03-25T00:00:00.000Z",
    });

    expect(parsed.slug).toBe("memory-systems");
    expect(parsed.workspaceId).toBe("workspace_001");
  });

  it("validates participation opportunities", () => {
    const parsed = participationOpportunitySchema.parse({
      id: "opp_001",
      studyId: "study_001",
      targetKind: "mixed",
      status: "open",
      createdAt: "2026-03-25T00:00:00.000Z",
    });

    expect(parsed.targetKind).toBe("mixed");
  });
});
