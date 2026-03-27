import { describe, expect, it } from "vitest";

import {
  actorKindSchema,
  authActivityFeedSchema,
  authEmailRequestResponseSchema,
  authSessionInventorySchema,
  authSessionRevokeResponseSchema,
  dogfoodOverviewSchema,
  participationOpportunitySchema,
  studyRunSchema,
  studySchema,
  workspaceRoadmapSchema,
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

  it("validates dogfood overview payloads", () => {
    const parsed = dogfoodOverviewSchema.parse({
      generatedAt: "2026-03-25T00:00:00.000Z",
      workspace: {
        id: "workspace_001",
        slug: "psyos-lab",
        name: "PsyOS Lab",
        description: "Dogfood workspace",
        visibility: "public",
        createdAt: "2026-03-25T00:00:00.000Z",
        projectCount: 2,
        studyCount: 2,
        identityCount: 2,
        openOpportunityCount: 2,
      },
      access: {
        mode: "public_read",
        viewer: {
          authenticated: true,
          actorKind: "human",
          authMethod: "session",
          workspaceRole: "owner",
          workspaceIdentityHandle: "psyos-human-operator",
          capabilities: [
            "workspace.read",
            "workspace.manage",
            "roadmap.read",
            "roadmap.write",
            "asset.read",
            "asset.write",
            "study.read",
            "study.publish",
            "opportunity.read",
            "opportunity.manage",
            "result.write",
          ],
        },
      },
      projects: [
        {
          id: "project_001",
          workspaceId: "workspace_001",
          workspaceSlug: "psyos-lab",
          slug: "reaction-time-baseline",
          name: "Reaction Time Baseline",
          projectType: "study",
          studySlug: "reaction-time-baseline",
          studyTitle: "Reaction Time Baseline",
          studyStatus: "published",
          latestVersion: 1,
          openOpportunityCount: 1,
          createdAt: "2026-03-25T00:00:00.000Z",
        },
      ],
      studies: [
        {
          id: "study_001",
          workspaceId: "workspace_001",
          projectId: "project_001",
          slug: "reaction-time-baseline",
          title: "Reaction Time Baseline",
          summary: "Dogfood study.",
          status: "published",
          researchType: "reaction_time",
          leadIdentityId: "identity_001",
          projectSlug: "reaction-time-baseline",
          projectName: "Reaction Time Baseline",
          leadHandle: "psyos-human-operator",
          latestVersion: 1,
          estimatedDurationMinutes: 4,
          packageId: "reaction-time-baseline",
          nodeTypes: ["instruction", "trial", "response_capture"],
          measures: ["reaction_time_ms"],
          outputs: ["responses", "timing_trace"],
          targetKinds: ["mixed"],
          openOpportunityCount: 1,
          createdAt: "2026-03-25T00:00:00.000Z",
        },
      ],
      opportunities: [
        {
          id: "opp_001",
          studyId: "study_001",
          studySlug: "reaction-time-baseline",
          studyTitle: "Reaction Time Baseline",
          targetKind: "mixed",
          status: "open",
          instructionsMd: "Join the dogfood cohort.",
          createdAt: "2026-03-25T00:00:00.000Z",
        },
      ],
      assets: [
        {
          id: "asset_001",
          workspaceId: "workspace_001",
          projectId: "project_001",
          kind: "stimulus",
          storageKey: "cas/stimulus/asset_001.json",
          contentHash: "sha256:asset_001",
          mediaType: "application/json",
          ownerIdentityId: "identity_001",
          workspaceSlug: "psyos-lab",
          projectSlug: "reaction-time-baseline",
          studySlug: "reaction-time-baseline",
          label: "Reaction time trial schedule",
          role: "trial_schedule",
          tags: ["dogfood", "reaction-time"],
          byteSize: 1024,
          createdAt: "2026-03-25T00:00:00.000Z",
        },
      ],
      roadmap: {
        backlog: 1,
        ready: 1,
        inProgress: 1,
        blocked: 0,
        done: 1,
      },
    });

    expect(parsed.workspace?.slug).toBe("psyos-lab");
    expect(parsed.studies[0]?.nodeTypes).toContain("response_capture");
    expect(parsed.assets[0]?.role).toBe("trial_schedule");
    expect(parsed.access.viewer.capabilities).toContain("study.publish");
  });

  it("validates workspace roadmap payloads", () => {
    const parsed = workspaceRoadmapSchema.parse({
      generatedAt: "2026-03-25T00:00:00.000Z",
      workspace: {
        id: "workspace_001",
        slug: "psyos-lab",
        name: "PsyOS Lab",
        description: "Dogfood workspace",
        visibility: "public",
        createdAt: "2026-03-25T00:00:00.000Z",
        projectCount: 2,
        studyCount: 2,
        identityCount: 2,
        openOpportunityCount: 2,
      },
      access: {
        mode: "public_read",
        viewer: {
          authenticated: false,
          actorKind: null,
          authMethod: null,
          workspaceRole: null,
          workspaceIdentityHandle: null,
          capabilities: [],
        },
      },
      columns: [
        {
          id: "column_001",
          workspaceId: "workspace_001",
          projectId: null,
          slug: "ready",
          title: "Ready",
          position: 1,
          description: "Clear enough to execute.",
        },
      ],
      items: [
        {
          id: "item_001",
          workspaceId: "workspace_001",
          projectId: "project_001",
          projectSlug: "reaction-time-baseline",
          columnId: "column_001",
          columnSlug: "ready",
          columnTitle: "Ready",
          assigneeIdentityId: "identity_001",
          assigneeHandle: "psyos-agent-lab",
          title: "Review Asset OS manifest quality",
          summary: "Confirm every dogfood artifact is addressable.",
          kind: "platform",
          status: "ready",
          studySlug: "reaction-time-baseline",
          metadata: {
            scope: "workspace",
          },
          createdAt: "2026-03-25T00:00:00.000Z",
          updatedAt: "2026-03-25T00:00:00.000Z",
        },
      ],
      dependencies: [
        {
          id: "dep_001",
          fromItemId: "item_000",
          toItemId: "item_001",
          createdAt: "2026-03-25T00:00:00.000Z",
        },
      ],
      summary: {
        backlog: 1,
        ready: 1,
        inProgress: 1,
        blocked: 0,
        done: 1,
      },
    });

    expect(parsed.items[0]?.assigneeHandle).toBe("psyos-agent-lab");
    expect(parsed.items[0]?.columnSlug).toBe("ready");
    expect(parsed.access.mode).toBe("public_read");
  });

  it("validates study runs", () => {
    const parsed = studyRunSchema.parse({
      id: "run_001",
      workspaceId: "workspace_001",
      projectId: "project_001",
      studyId: "study_001",
      actorIdentityId: "identity_001",
      participantKind: "human",
      status: "completed",
      eventCount: 42,
      createdAt: "2026-03-25T00:00:00.000Z",
      completedAt: "2026-03-25T00:05:00.000Z",
    });

    expect(parsed.status).toBe("completed");
    expect(parsed.eventCount).toBe(42);
  });

  it("validates auth email request responses", () => {
    const parsed = authEmailRequestResponseSchema.parse({
      ok: true,
      message: "Magic link sent. Check your inbox.",
      workspaceSlug: "psyos-lab",
      expiresAt: "2026-03-26T00:00:00.000Z",
      delivery: {
        channel: "resend",
        status: "sent",
        messageId: "9b6e1b3c-4f43-4e58-a0af-89d9e90d0f2f",
        previewUrl: null,
      },
    });

    expect(parsed.delivery.messageId).toBe(
      "9b6e1b3c-4f43-4e58-a0af-89d9e90d0f2f",
    );
  });

  it("validates auth session inventory and activity payloads", () => {
    const inventory = authSessionInventorySchema.parse({
      authenticated: true,
      sessions: [
        {
          id: "session_001",
          createdAt: "2026-03-26T00:00:00.000Z",
          expiresAt: "2026-04-25T00:00:00.000Z",
          lastSeenAt: "2026-03-26T00:05:00.000Z",
          userAgent: "PsyOS Browser Session A",
          isCurrent: true,
        },
      ],
    });
    const activity = authActivityFeedSchema.parse({
      authenticated: true,
      events: [
        {
          id: "event_001",
          eventType: "session_created",
          createdAt: "2026-03-26T00:01:00.000Z",
          workspaceSlug: "psyos-lab",
          sessionId: "session_001",
          userAgent: "PsyOS Browser Session A",
          requestId: "request_001",
          metadata: {
            expiresAt: "2026-04-25T00:00:00.000Z",
          },
        },
      ],
    });
    const revoke = authSessionRevokeResponseSchema.parse({
      ok: true,
      revokedSessionId: "session_002",
      currentSessionCleared: false,
      inventory: {
        authenticated: true,
        sessions: [
          {
            id: "session_001",
            createdAt: "2026-03-26T00:00:00.000Z",
            expiresAt: "2026-04-25T00:00:00.000Z",
            lastSeenAt: "2026-03-26T00:05:00.000Z",
            userAgent: "PsyOS Browser Session A",
            isCurrent: true,
          },
        ],
      },
    });

    expect(inventory.sessions[0]?.isCurrent).toBe(true);
    expect(activity.events[0]?.eventType).toBe("session_created");
    expect(revoke.revokedSessionId).toBe("session_002");
  });
});
