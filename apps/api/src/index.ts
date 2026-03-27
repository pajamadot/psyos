import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  type OpportunityStatus,
  type StudyStatus,
  actorKindSchema,
  authActivityFeedSchema,
  authConfigSchema,
  authEmailConsumeResponseSchema,
  authEmailConsumeSchema,
  authEmailRequestResponseSchema,
  authEmailRequestSchema,
  authSessionInventorySchema,
  authSessionRevokeResponseSchema,
  authSessionRevokeSchema,
  authSessionSchema,
  bootstrapDeployRecords,
  bootstrapGapRecords,
  bootstrapOperationalChecklists,
  bootstrapOperationalEvents,
  bootstrapRoadmap,
  experimentNodeTypeSchema,
  metaProcess,
  operatingGuide,
  platformPrinciples,
  psyosDecisions,
  psyosNorthStar,
  roadmapItemKindSchema,
  roadmapItemStatusSchema,
} from "@psyos/contracts";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { listAuthActivityForUser, recordAuthEvent } from "./auth/activity";
import {
  buildAuthSessionInventoryResponse,
  buildAuthSessionResponse,
  resolveActorContext,
  resolveAuthenticatedSessionActor,
} from "./auth/actor-context";
import {
  ensureUserForEmail,
  ensureWorkspaceMembershipAndIdentity,
} from "./auth/actors";
import {
  buildWorkspaceAccess,
  canReadWorkspace,
  hasWorkspaceCapability,
} from "./auth/capabilities";
import {
  consumeMagicLink,
  persistMagicLink,
  sendMagicLinkEmail,
} from "./auth/email";
import {
  clearSession,
  createSession,
  revokeSessionForUser,
} from "./auth/sessions";
import {
  authSessionCookieName,
  getAuthCookieDomain,
  getAuthEmailProvider,
  getUserAgent,
} from "./auth/shared";
import type {
  Bindings,
  Variables,
  WorkspaceAccess,
  WorkspaceRecord,
} from "./auth/types";

type CorsContextLike = {
  req: {
    header(name: string): string | undefined;
  };
  header(name: string, value: string): void;
  env?: Bindings;
  res: {
    headers: Headers;
  };
};

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();
const getBindings = (context: { env?: Bindings }): Bindings =>
  context.env ?? {};
const getRuntimeVersion = (bindings: Bindings) =>
  bindings.APP_VERSION ?? "0.1.0";
const getDeployEnvironment = (bindings: Bindings) =>
  bindings.DEPLOY_ENVIRONMENT ?? "production";
const getDeployedVia = (bindings: Bindings) =>
  bindings.DEPLOYED_VIA ?? "wrangler";
const getGitCommit = (bindings: Bindings) => bindings.GIT_COMMIT ?? "unknown";
const getPublicApiUrl = (bindings: Bindings) =>
  bindings.PUBLIC_API_URL ?? "https://api.psyos.org";
const getPublicWebUrl = (bindings: Bindings) =>
  bindings.PUBLIC_WEB_URL ?? "https://psyos.org";
const toInt = (value: unknown) => {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value ?? 0), 10);

  return Number.isFinite(parsed) ? parsed : 0;
};

const parseJsonObject = (value: string | null | undefined) => {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

const parseJsonStringArray = (value: string | null | undefined) => {
  if (!value) return [];

  try {
    return toStringArray(JSON.parse(value));
  } catch {
    return [];
  }
};

const parseProtocolSummary = (protocolJson: string) => {
  const protocol = parseJsonObject(protocolJson) as Record<string, unknown>;
  const nodes = Array.isArray(protocol.nodes)
    ? protocol.nodes.filter(
        (node): node is Record<string, unknown> =>
          Boolean(node) && typeof node === "object",
      )
    : [];
  const nodeTypes = [
    ...new Set(
      nodes
        .map((node) => node.type)
        .filter((value): value is string => typeof value === "string"),
    ),
  ];
  const estimatedDurationMinutes =
    typeof protocol.estimatedDurationMinutes === "number"
      ? protocol.estimatedDurationMinutes
      : null;
  const packageId =
    typeof protocol.packageId === "string" ? protocol.packageId : null;

  return {
    estimatedDurationMinutes,
    packageId,
    nodeTypes,
    measures: toStringArray(protocol.measures),
    outputs: toStringArray(protocol.outputs),
  };
};

const parseAssetMetadata = (metadataJson: string | null | undefined) => {
  const metadata = parseJsonObject(metadataJson) as Record<string, unknown>;

  return {
    label: typeof metadata.label === "string" ? metadata.label : null,
    role: typeof metadata.role === "string" ? metadata.role : null,
    studySlug:
      typeof metadata.studySlug === "string" ? metadata.studySlug : null,
    tags: toStringArray(metadata.tags),
  };
};

const buildAllowedOrigins = (bindings: Bindings) => {
  const origins = new Set<string>([
    getPublicWebUrl(bindings),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ]);

  try {
    const webHost = new URL(getPublicWebUrl(bindings)).hostname;
    if (webHost === "psyos.org") {
      origins.add("https://www.psyos.org");
    }
    if (webHost === "www.psyos.org") {
      origins.add("https://psyos.org");
    }
  } catch {
    // Ignore malformed PUBLIC_WEB_URL and keep the defaults.
  }

  return origins;
};

const healthResponseSchema = z
  .object({
    status: z.literal("ok"),
    service: z.string(),
    database: z.object({
      configured: z.boolean(),
      heartbeat: z.number().nullable(),
    }),
    now: z.string(),
  })
  .openapi("HealthResponse");

const maintenanceSystemSchema = z
  .object({
    name: z.string(),
    version: z.string(),
    northStar: z.string(),
    runtime: z.object({
      service: z.string(),
      version: z.string(),
      environment: z.string(),
      deployedVia: z.string(),
      commit: z.string(),
      requestIdHeader: z.string(),
    }),
    deployment: z.object({
      frontend: z.string().url(),
      backend: z.string().url(),
      model: z.string(),
      smokeCheckCommand: z.string(),
    }),
    auth: z.object({
      agentAuth: z.string(),
      humanAuth: z.string(),
      emailProvider: z.string(),
      integrationEmailHarness: z.string(),
      separateIdentityModels: z.boolean(),
      actorKinds: z.array(z.string()),
    }),
    builderConcepts: z.array(z.string()),
    docs: z.object({
      openapi: z.string(),
      swaggerUi: z.string(),
      metaProcess: z.string(),
      operatingGuide: z.string(),
      roadmap: z.string(),
      workspaceSnapshotTemplate: z.string(),
      workspaceRoadmapTemplate: z.string(),
      workspaceAssetManifestTemplate: z.string(),
      gaps: z.string(),
      events: z.string(),
      deploys: z.string(),
      checklists: z.string(),
      deploymentGuide: z.string(),
      assetManifest: z.string(),
      dogfoodOverview: z.string(),
    }),
    observability: z.object({
      requestIdHeader: z.string(),
      runtimeHeaders: z.array(z.string()),
      smokeChecks: z.array(z.string()),
      logsConfigured: z.boolean(),
    }),
  })
  .openapi("MaintenanceSystemResponse");

const bootstrapResponseSchema = z
  .object({
    service: z.string(),
    message: z.string(),
    docs: z.string(),
  })
  .openapi("BootstrapResponse");

const studySchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    status: z.string(),
    researchType: z.string(),
    createdAt: z.string(),
  })
  .openapi("StudyRecord");

const studyListResponseSchema = z
  .object({
    studies: z.array(studySchema),
    source: z.string().optional(),
    warning: z.string().optional(),
  })
  .openapi("StudyListResponse");

const opportunitySchema = z
  .object({
    id: z.string(),
    studyId: z.string(),
    targetKind: z.string(),
    status: z.string(),
    createdAt: z.string(),
  })
  .openapi("OpportunityRecord");

const opportunityListResponseSchema = z
  .object({
    opportunities: z.array(opportunitySchema),
    source: z.string().optional(),
    warning: z.string().optional(),
  })
  .openapi("OpportunityListResponse");

const assetManifestEntrySchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    projectId: z.string().nullable().optional(),
    ownerIdentityId: z.string().nullable().optional(),
    kind: z.string(),
    storageKey: z.string(),
    contentHash: z.string(),
    mediaType: z.string(),
    byteSize: z.number().nullable().optional(),
    workspaceSlug: z.string(),
    projectSlug: z.string().nullable().optional(),
    studySlug: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
    tags: z.array(z.string()),
    createdAt: z.string(),
  })
  .openapi("AssetManifestEntry");

const assetManifestResponseSchema = z
  .object({
    generatedAt: z.string(),
    assets: z.array(assetManifestEntrySchema),
    source: z.string().optional(),
    warning: z.string().optional(),
  })
  .openapi("AssetManifestResponse");

const workspaceSummarySchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    visibility: z.enum(["public", "private"]),
    createdAt: z.string(),
    projectCount: z.number(),
    studyCount: z.number(),
    identityCount: z.number(),
    openOpportunityCount: z.number(),
  })
  .openapi("WorkspaceSummary");

const workspaceViewerSchema = z
  .object({
    authenticated: z.boolean(),
    actorKind: actorKindSchema.nullable(),
    authMethod: z.enum(["session", "api_key"]).nullable(),
    workspaceRole: z
      .enum(["owner", "admin", "researcher", "viewer"])
      .nullable(),
    workspaceIdentityHandle: z.string().nullable().optional(),
    capabilities: z.array(
      z.enum([
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
      ]),
    ),
  })
  .openapi("WorkspaceViewer");

const workspaceAccessSchema = z
  .object({
    mode: z.enum(["public_read", "workspace_member"]),
    viewer: workspaceViewerSchema,
  })
  .openapi("WorkspaceAccess");

const projectSummarySchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    workspaceSlug: z.string(),
    slug: z.string(),
    name: z.string(),
    projectType: z.string(),
    studySlug: z.string().nullable().optional(),
    studyTitle: z.string().nullable().optional(),
    studyStatus: z.string().nullable().optional(),
    latestVersion: z.number(),
    openOpportunityCount: z.number(),
    createdAt: z.string(),
  })
  .openapi("ProjectSummary");

const dogfoodStudySchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    projectId: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    status: z.string(),
    researchType: z.string(),
    leadIdentityId: z.string(),
    projectSlug: z.string(),
    projectName: z.string(),
    leadHandle: z.string(),
    latestVersion: z.number(),
    estimatedDurationMinutes: z.number().nullable().optional(),
    packageId: z.string().nullable().optional(),
    nodeTypes: z.array(z.string()),
    measures: z.array(z.string()),
    outputs: z.array(z.string()),
    targetKinds: z.array(z.string()),
    openOpportunityCount: z.number(),
    createdAt: z.string(),
  })
  .openapi("DogfoodStudy");

const dogfoodOpportunitySchema = z
  .object({
    id: z.string(),
    studyId: z.string(),
    studySlug: z.string(),
    studyTitle: z.string(),
    targetKind: z.string(),
    status: z.string(),
    instructionsMd: z.string().nullable().optional(),
    createdAt: z.string(),
  })
  .openapi("DogfoodOpportunity");

const roadmapStatusSummarySchema = z
  .object({
    backlog: z.number(),
    ready: z.number(),
    inProgress: z.number(),
    blocked: z.number(),
    done: z.number(),
  })
  .openapi("RoadmapStatusSummary");

const dogfoodOverviewResponseSchema = z
  .object({
    generatedAt: z.string(),
    workspace: workspaceSummarySchema.nullable(),
    access: workspaceAccessSchema,
    projects: z.array(projectSummarySchema),
    studies: z.array(dogfoodStudySchema),
    opportunities: z.array(dogfoodOpportunitySchema),
    assets: z.array(assetManifestEntrySchema),
    roadmap: roadmapStatusSummarySchema,
    source: z.string().optional(),
    warning: z.string().optional(),
  })
  .openapi("DogfoodOverviewResponse");

const workspaceRouteParamsSchema = z
  .object({
    workspaceSlug: z.string(),
  })
  .openapi("WorkspaceRouteParams");

const workspaceRoadmapItemRouteParamsSchema = z
  .object({
    workspaceSlug: z.string(),
    itemId: z.string(),
  })
  .openapi("WorkspaceRoadmapItemRouteParams");

const workspaceRoadmapDependencyRouteParamsSchema = z
  .object({
    workspaceSlug: z.string(),
    dependencyId: z.string(),
  })
  .openapi("WorkspaceRoadmapDependencyRouteParams");

const workspaceStudyRouteParamsSchema = z
  .object({
    workspaceSlug: z.string(),
    studySlug: z.string(),
  })
  .openapi("WorkspaceStudyRouteParams");

const workspaceStudyOpportunityRouteParamsSchema = z
  .object({
    workspaceSlug: z.string(),
    studySlug: z.string(),
    opportunityId: z.string(),
  })
  .openapi("WorkspaceStudyOpportunityRouteParams");

const errorResponseSchema = z
  .object({
    error: z.string(),
  })
  .openapi("ErrorResponse");

const authActivityQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .openapi("AuthActivityQuery");

const workspaceRoadmapColumnSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    projectId: z.string().nullable().optional(),
    slug: z.string(),
    title: z.string(),
    position: z.number(),
    description: z.string().nullable().optional(),
  })
  .openapi("WorkspaceRoadmapColumn");

const workspaceRoadmapItemSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    projectId: z.string().nullable().optional(),
    projectSlug: z.string().nullable().optional(),
    columnId: z.string(),
    columnSlug: z.string(),
    columnTitle: z.string(),
    assigneeIdentityId: z.string().nullable().optional(),
    assigneeHandle: z.string().nullable().optional(),
    title: z.string(),
    summary: z.string(),
    kind: z.string(),
    status: z.string(),
    studySlug: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("WorkspaceRoadmapItem");

const workspaceRoadmapDependencySchema = z
  .object({
    id: z.string(),
    fromItemId: z.string(),
    toItemId: z.string(),
    createdAt: z.string(),
  })
  .openapi("WorkspaceRoadmapDependency");

const workspaceRoadmapResponseSchema = z
  .object({
    generatedAt: z.string(),
    workspace: workspaceSummarySchema.nullable(),
    access: workspaceAccessSchema,
    columns: z.array(workspaceRoadmapColumnSchema),
    items: z.array(workspaceRoadmapItemSchema),
    dependencies: z.array(workspaceRoadmapDependencySchema),
    summary: roadmapStatusSummarySchema,
    source: z.string().optional(),
    warning: z.string().optional(),
  })
  .openapi("WorkspaceRoadmapResponse");

const roadmapItemCreateSchema = z
  .object({
    projectSlug: z.string().min(1).optional(),
    columnSlug: z.string().min(1),
    title: z.string().min(1).max(180),
    summary: z.string().min(1).max(2000),
    kind: roadmapItemKindSchema,
    status: roadmapItemStatusSchema.optional(),
    assigneeHandle: z.string().min(1).nullable().optional(),
    studySlug: z.string().min(1).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .openapi("RoadmapItemCreate");

const roadmapItemUpdateSchema = z
  .object({
    columnSlug: z.string().min(1).optional(),
    title: z.string().min(1).max(180).optional(),
    summary: z.string().min(1).max(2000).optional(),
    kind: roadmapItemKindSchema.optional(),
    status: roadmapItemStatusSchema.optional(),
    assigneeHandle: z.string().min(1).nullable().optional(),
    studySlug: z.string().min(1).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .openapi("RoadmapItemUpdate");

const roadmapItemMutationResponseSchema = z
  .object({
    ok: z.literal(true),
    item: workspaceRoadmapItemSchema,
  })
  .openapi("RoadmapItemMutationResponse");

const roadmapDependencyCreateSchema = z
  .object({
    fromItemId: z.string().min(1),
    toItemId: z.string().min(1),
  })
  .openapi("RoadmapDependencyCreate");

const roadmapDependencyMutationResponseSchema = z
  .object({
    ok: z.literal(true),
    dependency: z.lazy(() => workspaceRoadmapDependencySchema),
  })
  .openapi("RoadmapDependencyMutationResponse");

const roadmapDependencyDeleteResponseSchema = z
  .object({
    ok: z.literal(true),
    deletedDependencyId: z.string().min(1),
  })
  .openapi("RoadmapDependencyDeleteResponse");

const studyPublishSchema = z
  .object({
    changelog: z.string().min(1).max(4000).optional(),
  })
  .openapi("StudyPublish");

const studyPublicationRecordSchema = z
  .object({
    id: z.string().min(1),
    studyId: z.string().min(1),
    version: z.number().int().positive(),
    changelog: z.string().nullable().optional(),
    publishedAt: z.string().min(1),
  })
  .openapi("StudyPublicationRecord");

const studyPublishResponseSchema = z
  .object({
    ok: z.literal(true),
    study: z.lazy(() => dogfoodStudySchema),
    publication: studyPublicationRecordSchema,
  })
  .openapi("StudyPublishResponse");

const opportunityMutationSchema = z
  .object({
    targetKind: z.enum(["human", "agent", "mixed"]).optional(),
    status: z.enum(["open", "paused", "closed"]).optional(),
    instructionsMd: z.string().min(1).max(6000).nullable().optional(),
    eligibility: z.record(z.string(), z.unknown()).optional(),
  })
  .openapi("OpportunityMutation");

const opportunityMutationResponseSchema = z
  .object({
    ok: z.literal(true),
    opportunity: dogfoodOpportunitySchema,
  })
  .openapi("OpportunityMutationResponse");

const studyRunStatusSchema = z
  .enum(["started", "completed", "failed", "abandoned"])
  .openapi("StudyRunStatus");

const normalizeStudyRunStatus = (
  value: string | null | undefined,
): z.infer<typeof studyRunStatusSchema> => {
  if (value === "started") return "started";
  if (value === "failed") return "failed";
  if (value === "abandoned") return "abandoned";
  return "completed";
};

const studyRunSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    projectId: z.string(),
    projectSlug: z.string(),
    studyId: z.string(),
    studySlug: z.string(),
    actorIdentityId: z.string().nullable().optional(),
    actorHandle: z.string().nullable().optional(),
    participantKind: actorKindSchema,
    status: studyRunStatusSchema,
    eventCount: z.number().int().nonnegative(),
    summary: z.record(z.string(), z.unknown()),
    createdAt: z.string(),
    completedAt: z.string().nullable().optional(),
  })
  .openapi("StudyRun");

const studyRunIngestionSchema = z
  .object({
    status: studyRunStatusSchema.default("completed"),
    eventCount: z.number().int().nonnegative().optional(),
    summary: z.record(z.string(), z.unknown()).optional(),
    completedAt: z.string().datetime().nullable().optional(),
  })
  .openapi("StudyRunIngestion");

const studyRunMutationResponseSchema = z
  .object({
    ok: z.literal(true),
    run: studyRunSchema,
  })
  .openapi("StudyRunMutationResponse");

const studyRunsResponseSchema = z
  .object({
    generatedAt: z.string(),
    workspace: workspaceSummarySchema.nullable(),
    access: workspaceAccessSchema,
    study: z.lazy(() => dogfoodStudySchema).nullable(),
    runs: z.array(studyRunSchema),
    source: z.string().optional(),
    warning: z.string().optional(),
  })
  .openapi("StudyRunsResponse");

const workspaceAssetManifestResponseSchema = z
  .object({
    generatedAt: z.string(),
    workspace: workspaceSummarySchema.nullable(),
    access: workspaceAccessSchema,
    assets: z.array(assetManifestEntrySchema),
    source: z.string().optional(),
    warning: z.string().optional(),
  })
  .openapi("WorkspaceAssetManifestResponse");

const authSessionQuerySchema = z
  .object({
    workspaceSlug: z.string().optional(),
  })
  .openapi("AuthSessionQuery");

const lockedDecisionsSchema = z
  .object({
    builderReference: z.string(),
    agentAuthorship: z.boolean(),
    agentParticipation: z.boolean(),
    firstLoop: z.string(),
    complianceMetadata: z.string(),
    identityModel: z.string(),
    publicPlanning: z.string(),
    agentAuth: z.string(),
    experimentModel: z.string(),
    requiredDataOutputs: z.string(),
    publicationResolution: z.string(),
    deploymentModel: z.string(),
    workflowScope: z.string(),
  })
  .openapi("LockedDecisions");

const metaProcessResponseSchema = z
  .object({
    northStar: z.string(),
    flow: z.array(z.string()),
    principles: z.array(z.string()),
    lockedDecisions: lockedDecisionsSchema,
  })
  .openapi("MetaProcessResponse");

const operatingGuideItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
  })
  .openapi("OperatingGuideItem");

const operatingGuideResponseSchema = z
  .object({
    stages: z.array(operatingGuideItemSchema),
  })
  .openapi("OperatingGuideResponse");

const roadmapColumnSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
  })
  .openapi("RoadmapColumn");

const roadmapItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    columnId: z.string(),
    kind: z.string(),
    summary: z.string(),
  })
  .openapi("RoadmapItem");

const roadmapDependencySchema = z
  .object({
    from: z.string(),
    to: z.string(),
  })
  .openapi("RoadmapDependency");

const roadmapResponseSchema = z
  .object({
    columns: z.array(roadmapColumnSchema),
    items: z.array(roadmapItemSchema),
    dependencies: z.array(roadmapDependencySchema),
  })
  .openapi("RoadmapResponse");

const gapsResponseSchema = z
  .object({
    gaps: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        domain: z.string(),
        severity: z.string(),
        summary: z.string(),
        nextAction: z.string(),
        docsPath: z.string(),
      }),
    ),
  })
  .openapi("GapResponse");

const operationalEventSchema = z
  .object({
    id: z.string(),
    timestamp: z.string(),
    category: z.string(),
    strategy: z.string(),
    summary: z.string(),
    validation: z.array(z.string()),
    nextConstraint: z.string(),
  })
  .openapi("OperationalEvent");

const operationalEventsResponseSchema = z
  .object({
    events: z.array(operationalEventSchema),
  })
  .openapi("OperationalEventsResponse");

const deployRecordSchema = z
  .object({
    id: z.string(),
    timestamp: z.string(),
    environment: z.string(),
    surface: z.string(),
    version: z.string(),
    commit: z.string(),
    summary: z.string(),
    delivery: z.array(z.string()),
    verification: z.array(z.string()),
    rollbackChecklistId: z.string(),
  })
  .openapi("DeployRecord");

const deployHistoryResponseSchema = z
  .object({
    deploys: z.array(deployRecordSchema),
  })
  .openapi("DeployHistoryResponse");

const operationalChecklistStepSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    command: z.string().optional(),
    successSignal: z.string(),
  })
  .openapi("OperationalChecklistStep");

const operationalChecklistSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    category: z.string(),
    summary: z.string(),
    steps: z.array(operationalChecklistStepSchema),
  })
  .openapi("OperationalChecklist");

const operationalChecklistResponseSchema = z
  .object({
    checklists: z.array(operationalChecklistSchema),
  })
  .openapi("OperationalChecklistResponse");

const rootRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["system"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: bootstrapResponseSchema,
        },
      },
      description: "Bootstrap service metadata.",
    },
  },
});

const healthRoute = createRoute({
  method: "get",
  path: "/healthz",
  tags: ["system"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: healthResponseSchema,
        },
      },
      description: "Health status.",
    },
  },
});

const authConfigRoute = createRoute({
  method: "get",
  path: "/api/v1/auth/config",
  tags: ["auth"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: authConfigSchema,
        },
      },
      description: "Human and agent auth configuration exposed to clients.",
    },
  },
});

const authSessionRoute = createRoute({
  method: "get",
  path: "/api/v1/auth/session",
  tags: ["auth"],
  request: {
    query: authSessionQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: authSessionSchema,
        },
      },
      description: "Current authenticated user session for the browser.",
    },
  },
});

const authEmailRequestRoute = createRoute({
  method: "post",
  path: "/api/v1/auth/email/request-link",
  tags: ["auth"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: authEmailRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: authEmailRequestResponseSchema,
        },
      },
      description: "Queue and deliver an email magic-link sign-in flow.",
    },
    400: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Invalid email payload or unknown workspace.",
    },
    503: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "Email provider is not configured for the current environment.",
    },
  },
});

const authEmailConsumeRoute = createRoute({
  method: "post",
  path: "/api/v1/auth/email/consume-link",
  tags: ["auth"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: authEmailConsumeSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: authEmailConsumeResponseSchema,
        },
      },
      description:
        "Consume a magic link token, mint a session, and set the auth cookie.",
    },
    400: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Expired or invalid login token.",
    },
    503: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Auth persistence is unavailable.",
    },
  },
});

const authSignOutRoute = createRoute({
  method: "post",
  path: "/api/v1/auth/sign-out",
  tags: ["auth"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z
            .object({ ok: z.literal(true) })
            .openapi("AuthSignOutResponse"),
        },
      },
      description:
        "Revoke the current browser session and clear the auth cookie.",
    },
  },
});

const authSessionsRoute = createRoute({
  method: "get",
  path: "/api/v1/auth/sessions",
  tags: ["auth"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: authSessionInventorySchema,
        },
      },
      description: "List active browser sessions for the authenticated user.",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Authentication is required.",
    },
    503: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Auth persistence is unavailable.",
    },
  },
});

const authSessionRevokeRoute = createRoute({
  method: "post",
  path: "/api/v1/auth/sessions/revoke",
  tags: ["auth"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: authSessionRevokeSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: authSessionRevokeResponseSchema,
        },
      },
      description: "Revoke one session belonging to the authenticated user.",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Authentication is required.",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "The target session was not found.",
    },
    503: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Auth persistence is unavailable.",
    },
  },
});

const authActivityRoute = createRoute({
  method: "get",
  path: "/api/v1/auth/activity",
  tags: ["auth"],
  request: {
    query: authActivityQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: authActivityFeedSchema,
        },
      },
      description: "Recent auth activity for the authenticated user.",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Authentication is required.",
    },
    503: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Auth persistence is unavailable.",
    },
  },
});

const maintenanceSystemRoute = createRoute({
  method: "get",
  path: "/api/v1/maintenance/system",
  tags: ["system"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: maintenanceSystemSchema,
        },
      },
      description: "Platform metadata and deployment map.",
    },
  },
});

const legacySystemRoute = createRoute({
  method: "get",
  path: "/api/v1/system",
  tags: ["system"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: maintenanceSystemSchema,
        },
      },
      description: "Backward-compatible alias for maintenance system metadata.",
    },
  },
});

const metaProcessRoute = createRoute({
  method: "get",
  path: "/api/v1/discover/meta-process",
  tags: ["discover"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: metaProcessResponseSchema,
        },
      },
      description: "Current PsyOS meta-process and locked bootstrap decisions.",
    },
  },
});

const operatingGuideRoute = createRoute({
  method: "get",
  path: "/api/v1/discover/operating-guide",
  tags: ["discover"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: operatingGuideResponseSchema,
        },
      },
      description: "Stage-by-stage operating guide for the bootstrap platform.",
    },
  },
});

const roadmapRoute = createRoute({
  method: "get",
  path: "/api/v1/roadmap/bootstrap",
  tags: ["roadmap"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: roadmapResponseSchema,
        },
      },
      description:
        "Bootstrap roadmap expressed as kanban columns plus DAG edges.",
    },
  },
});

const gapsRoute = createRoute({
  method: "get",
  path: "/api/v1/maintenance/gaps",
  tags: ["system"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: gapsResponseSchema,
        },
      },
      description:
        "Current bootstrap gaps and intentionally deferred surfaces.",
    },
  },
});

const operationalEventsRoute = createRoute({
  method: "get",
  path: "/api/v1/maintenance/events",
  tags: ["system"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: operationalEventsResponseSchema,
        },
      },
      description:
        "Recent infrastructure and control-plane mutations exposed as queryable records.",
    },
  },
});

const deployHistoryRoute = createRoute({
  method: "get",
  path: "/api/v1/maintenance/deploys",
  tags: ["system"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: deployHistoryResponseSchema,
        },
      },
      description:
        "Known deploy records and verification posture exposed as queryable maintenance metadata.",
    },
  },
});

const operationalChecklistRoute = createRoute({
  method: "get",
  path: "/api/v1/maintenance/checklists",
  tags: ["system"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: operationalChecklistResponseSchema,
        },
      },
      description:
        "Operational deploy and rollback checklists exposed as queryable maintenance records.",
    },
  },
});

const assetManifestRoute = createRoute({
  method: "get",
  path: "/api/v1/asset-os/manifest",
  tags: ["assets"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: assetManifestResponseSchema,
        },
      },
      description:
        "Asset OS manifest for persisted research artifacts tracked by the platform.",
    },
  },
});

const dogfoodOverviewRoute = createRoute({
  method: "get",
  path: "/api/v1/dogfood/overview",
  tags: ["studies", "assets"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: dogfoodOverviewResponseSchema,
        },
      },
      description:
        "Dogfood workspace overview combining workspace, study, roadmap, opportunity, and Asset OS state.",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "Workspace membership is required to read this private workspace.",
    },
  },
});

const workspaceSnapshotRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{workspaceSlug}/snapshot",
  tags: ["workspaces", "studies", "assets"],
  request: {
    params: workspaceRouteParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: dogfoodOverviewResponseSchema,
        },
      },
      description:
        "Workspace snapshot combining workspace, studies, opportunities, roadmap summary, and Asset OS manifest state.",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Workspace not found.",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "Workspace membership is required to read this private workspace.",
    },
  },
});

const workspaceAssetManifestRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{workspaceSlug}/asset-os/manifest",
  tags: ["workspaces", "assets"],
  request: {
    params: workspaceRouteParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: workspaceAssetManifestResponseSchema,
        },
      },
      description:
        "Workspace-scoped Asset OS manifest with explicit viewer and access posture.",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Workspace not found.",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "Workspace membership is required to read this private workspace.",
    },
  },
});

const workspaceRoadmapRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{workspaceSlug}/roadmap",
  tags: ["workspaces", "roadmap"],
  request: {
    params: workspaceRouteParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: workspaceRoadmapResponseSchema,
        },
      },
      description:
        "Workspace roadmap as real kanban columns plus dependency edges backed by D1.",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Workspace not found.",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "Workspace membership is required to read this private workspace.",
    },
  },
});

const workspaceRoadmapCreateItemRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{workspaceSlug}/roadmap/items",
  tags: ["workspaces", "roadmap"],
  request: {
    params: workspaceRouteParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: roadmapItemCreateSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: roadmapItemMutationResponseSchema,
        },
      },
      description: "Roadmap item created.",
    },
    400: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Invalid roadmap mutation input.",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Authentication is required.",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "The current actor lacks the workspace capability required for roadmap writes.",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Workspace or referenced project context was not found.",
    },
    503: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Roadmap mutations require a configured D1 binding.",
    },
  },
});

const workspaceRoadmapUpdateItemRoute = createRoute({
  method: "patch",
  path: "/api/v1/workspaces/{workspaceSlug}/roadmap/items/{itemId}",
  tags: ["workspaces", "roadmap"],
  request: {
    params: workspaceRoadmapItemRouteParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: roadmapItemUpdateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: roadmapItemMutationResponseSchema,
        },
      },
      description: "Roadmap item updated.",
    },
    400: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Invalid roadmap mutation input.",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Authentication is required.",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "The current actor lacks the workspace capability required for roadmap writes.",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Workspace or roadmap item was not found.",
    },
    503: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Roadmap mutations require a configured D1 binding.",
    },
  },
});

const workspaceRoadmapCreateDependencyRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{workspaceSlug}/roadmap/dependencies",
  tags: ["workspaces", "roadmap"],
  request: {
    params: workspaceRouteParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: roadmapDependencyCreateSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: roadmapDependencyMutationResponseSchema,
        },
      },
      description: "Roadmap dependency created.",
    },
    400: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Invalid roadmap dependency input.",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Authentication is required.",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "The current actor lacks the workspace capability required for roadmap writes.",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Workspace or roadmap item was not found.",
    },
    409: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "The dependency already exists or would introduce a roadmap cycle.",
    },
    503: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Roadmap mutations require a configured D1 binding.",
    },
  },
});

const workspaceRoadmapDeleteDependencyRoute = createRoute({
  method: "delete",
  path: "/api/v1/workspaces/{workspaceSlug}/roadmap/dependencies/{dependencyId}",
  tags: ["workspaces", "roadmap"],
  request: {
    params: workspaceRoadmapDependencyRouteParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: roadmapDependencyDeleteResponseSchema,
        },
      },
      description: "Roadmap dependency deleted.",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Authentication is required.",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "The current actor lacks the workspace capability required for roadmap writes.",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Workspace or roadmap dependency was not found.",
    },
    503: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Roadmap mutations require a configured D1 binding.",
    },
  },
});

const workspaceStudyPublishRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{workspaceSlug}/studies/{studySlug}/publish",
  tags: ["workspaces", "studies"],
  request: {
    params: workspaceStudyRouteParamsSchema,
    body: {
      required: false,
      content: {
        "application/json": {
          schema: studyPublishSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: studyPublishResponseSchema,
        },
      },
      description:
        "Published a new immutable study version and advanced the latest-resolving study state.",
    },
    400: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Invalid study publish input.",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Authentication is required.",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "The current actor lacks the workspace capability required for study publishing.",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Workspace or study was not found.",
    },
    409: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "The study cannot be published in its current state.",
    },
    503: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Study publishing requires a configured D1 binding.",
    },
  },
});

const workspaceStudyCreateOpportunityRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{workspaceSlug}/studies/{studySlug}/opportunities",
  tags: ["workspaces", "studies", "opportunities"],
  request: {
    params: workspaceStudyRouteParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: opportunityMutationSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: opportunityMutationResponseSchema,
        },
      },
      description: "Opportunity created.",
    },
    400: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Invalid opportunity mutation input.",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Authentication is required.",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "The current actor lacks the workspace capability required for opportunity management.",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Workspace or study was not found.",
    },
    503: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Opportunity mutations require a configured D1 binding.",
    },
  },
});

const workspaceStudyUpdateOpportunityRoute = createRoute({
  method: "patch",
  path: "/api/v1/workspaces/{workspaceSlug}/studies/{studySlug}/opportunities/{opportunityId}",
  tags: ["workspaces", "studies", "opportunities"],
  request: {
    params: workspaceStudyOpportunityRouteParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: opportunityMutationSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: opportunityMutationResponseSchema,
        },
      },
      description: "Opportunity updated.",
    },
    400: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Invalid opportunity mutation input.",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Authentication is required.",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "The current actor lacks the workspace capability required for opportunity management.",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Workspace, study, or opportunity was not found.",
    },
    503: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Opportunity mutations require a configured D1 binding.",
    },
  },
});

const workspaceStudyRunsRoute = createRoute({
  method: "get",
  path: "/api/v1/workspaces/{workspaceSlug}/studies/{studySlug}/runs",
  tags: ["workspaces", "studies", "results"],
  request: {
    params: workspaceStudyRouteParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: studyRunsResponseSchema,
        },
      },
      description: "Study runs scoped to the workspace and study.",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Authentication is required.",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "The current actor lacks the workspace capability required for study reads.",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Workspace or study was not found.",
    },
    503: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Study runs require a configured D1 binding.",
    },
  },
});

const workspaceStudyIngestRunRoute = createRoute({
  method: "post",
  path: "/api/v1/workspaces/{workspaceSlug}/studies/{studySlug}/runs",
  tags: ["workspaces", "studies", "results"],
  request: {
    params: workspaceStudyRouteParamsSchema,
    body: {
      required: false,
      content: {
        "application/json": {
          schema: studyRunIngestionSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: studyRunMutationResponseSchema,
        },
      },
      description: "Study run ingested.",
    },
    400: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Invalid study run payload.",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Authentication is required.",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description:
        "The current actor lacks the workspace capability required for result ingestion.",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Workspace or study was not found.",
    },
    503: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Study run ingestion requires a configured D1 binding.",
    },
  },
});

const studiesRoute = createRoute({
  method: "get",
  path: "/api/v1/studies",
  tags: ["studies"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: studyListResponseSchema,
        },
      },
      description: "List recent studies.",
    },
  },
});

const opportunitiesRoute = createRoute({
  method: "get",
  path: "/api/v1/opportunities",
  tags: ["opportunities"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: opportunityListResponseSchema,
        },
      },
      description: "List recent participation opportunities.",
    },
  },
});

const buildMaintenanceSystemResponse = (bindings: Bindings) => ({
  name: "PsyOS API",
  version: getRuntimeVersion(bindings),
  northStar: psyosNorthStar,
  runtime: {
    service: bindings.APP_NAME ?? "psyos-api",
    version: getRuntimeVersion(bindings),
    environment: getDeployEnvironment(bindings),
    deployedVia: getDeployedVia(bindings),
    commit: getGitCommit(bindings),
    requestIdHeader: "x-psyos-request-id",
  },
  deployment: {
    frontend: getPublicWebUrl(bindings),
    backend: getPublicApiUrl(bindings),
    model: "Hosted platform with self-deployment support",
    smokeCheckCommand: "pnpm smoke:live",
  },
  auth: {
    agentAuth: "Workspace-scoped API keys",
    humanAuth: "OAuth plus email magic link",
    emailProvider: getAuthEmailProvider(bindings),
    integrationEmailHarness: "Mailpit",
    separateIdentityModels: true,
    actorKinds: actorKindSchema.options,
  },
  builderConcepts: experimentNodeTypeSchema.options,
  docs: {
    openapi: "/api/v1/openapi.json",
    swaggerUi: "/api/v1/docs",
    metaProcess: "/api/v1/discover/meta-process",
    operatingGuide: "/api/v1/discover/operating-guide",
    roadmap: "/api/v1/roadmap/bootstrap",
    workspaceSnapshotTemplate: "/api/v1/workspaces/{workspaceSlug}/snapshot",
    workspaceRoadmapTemplate: "/api/v1/workspaces/{workspaceSlug}/roadmap",
    workspaceAssetManifestTemplate:
      "/api/v1/workspaces/{workspaceSlug}/asset-os/manifest",
    gaps: "/api/v1/maintenance/gaps",
    events: "/api/v1/maintenance/events",
    deploys: "/api/v1/maintenance/deploys",
    checklists: "/api/v1/maintenance/checklists",
    deploymentGuide: "docs/deployment.md",
    assetManifest: "/api/v1/asset-os/manifest",
    dogfoodOverview: "/api/v1/dogfood/overview",
  },
  observability: {
    requestIdHeader: "x-psyos-request-id",
    runtimeHeaders: [
      "x-psyos-request-id",
      "x-psyos-runtime-version",
      "x-psyos-deploy-environment",
      "x-psyos-commit",
    ],
    smokeChecks: ["pnpm smoke:live"],
    logsConfigured: true,
  },
});

const buildEmptyRoadmapSummary = () => ({
  backlog: 0,
  ready: 0,
  inProgress: 0,
  blocked: 0,
  done: 0,
});

const buildAnonymousWorkspaceAccess = (
  mode: WorkspaceAccess["mode"] = "public_read",
): WorkspaceAccess => ({
  mode,
  viewer: {
    authenticated: false,
    actorKind: null,
    authMethod: null,
    workspaceRole: null,
    workspaceIdentityHandle: null,
    capabilities: [],
  },
});

const queryAssetManifestEntries = async (
  env: Bindings,
  workspaceId?: string,
) => {
  if (!env.DB) return [];

  const query = workspaceId
    ? `SELECT
        a.id,
        a.workspace_id AS workspaceId,
        a.project_id AS projectId,
        a.owner_identity_id AS ownerIdentityId,
        a.kind,
        a.storage_key AS storageKey,
        a.content_hash AS contentHash,
        a.media_type AS mediaType,
        a.byte_size AS byteSize,
        a.metadata_json AS metadataJson,
        a.created_at AS createdAt,
        w.slug AS workspaceSlug,
        p.slug AS projectSlug
      FROM assets a
      JOIN workspaces w ON w.id = a.workspace_id
      LEFT JOIN projects p ON p.id = a.project_id
      WHERE a.workspace_id = ?
      ORDER BY a.created_at DESC
      LIMIT 100`
    : `SELECT
        a.id,
        a.workspace_id AS workspaceId,
        a.project_id AS projectId,
        a.owner_identity_id AS ownerIdentityId,
        a.kind,
        a.storage_key AS storageKey,
        a.content_hash AS contentHash,
        a.media_type AS mediaType,
        a.byte_size AS byteSize,
        a.metadata_json AS metadataJson,
        a.created_at AS createdAt,
        w.slug AS workspaceSlug,
        p.slug AS projectSlug
      FROM assets a
      JOIN workspaces w ON w.id = a.workspace_id
      LEFT JOIN projects p ON p.id = a.project_id
      ORDER BY a.created_at DESC
      LIMIT 100`;

  const statement = env.DB.prepare(query);
  const rows = workspaceId
    ? await statement.bind(workspaceId).all<{
        id: string;
        workspaceId: string;
        projectId: string | null;
        ownerIdentityId: string | null;
        kind: string;
        storageKey: string;
        contentHash: string;
        mediaType: string;
        byteSize: number | string | null;
        metadataJson: string | null;
        createdAt: string;
        workspaceSlug: string;
        projectSlug: string | null;
      }>()
    : await statement.all<{
        id: string;
        workspaceId: string;
        projectId: string | null;
        ownerIdentityId: string | null;
        kind: string;
        storageKey: string;
        contentHash: string;
        mediaType: string;
        byteSize: number | string | null;
        metadataJson: string | null;
        createdAt: string;
        workspaceSlug: string;
        projectSlug: string | null;
      }>();

  return rows.results.map((row) => {
    const metadata = parseAssetMetadata(row.metadataJson);

    return {
      id: row.id,
      workspaceId: row.workspaceId,
      projectId: row.projectId,
      ownerIdentityId: row.ownerIdentityId,
      kind: row.kind,
      storageKey: row.storageKey,
      contentHash: row.contentHash,
      mediaType: row.mediaType,
      byteSize:
        row.byteSize === null || row.byteSize === undefined
          ? null
          : toInt(row.byteSize),
      workspaceSlug: row.workspaceSlug,
      projectSlug: row.projectSlug,
      studySlug: metadata.studySlug,
      label: metadata.label,
      role: metadata.role,
      tags: metadata.tags,
      createdAt: row.createdAt,
    };
  });
};

const buildEmptyWorkspaceSnapshot = (warning: string) => ({
  generatedAt: new Date().toISOString(),
  workspace: null,
  access: buildAnonymousWorkspaceAccess(),
  projects: [],
  studies: [],
  opportunities: [],
  assets: [],
  roadmap: buildEmptyRoadmapSummary(),
  source: "bootstrap",
  warning,
});

const buildEmptyWorkspaceRoadmap = (warning: string) => ({
  generatedAt: new Date().toISOString(),
  workspace: null,
  access: buildAnonymousWorkspaceAccess(),
  columns: [],
  items: [],
  dependencies: [],
  summary: buildEmptyRoadmapSummary(),
  source: "bootstrap",
  warning,
});

const buildEmptyWorkspaceAssetManifest = (warning: string) => ({
  generatedAt: new Date().toISOString(),
  workspace: null,
  access: buildAnonymousWorkspaceAccess(),
  assets: [],
  source: "bootstrap",
  warning,
});

const queryWorkspaceSummaryBySlug = async (
  env: Bindings,
  workspaceSlug: string,
) => {
  if (!env.DB) return null;

  const workspaceRows = await env.DB.prepare(
    `SELECT
      w.id,
      w.slug,
      w.name,
      w.description,
      w.visibility,
      w.created_at AS createdAt,
      COUNT(DISTINCT p.id) AS projectCount,
      COUNT(DISTINCT s.id) AS studyCount,
      COUNT(DISTINCT i.id) AS identityCount,
      COUNT(DISTINCT CASE WHEN o.status = 'open' THEN o.id END) AS openOpportunityCount
    FROM workspaces w
    LEFT JOIN projects p ON p.workspace_id = w.id
    LEFT JOIN studies s ON s.workspace_id = w.id
    LEFT JOIN identities i ON i.workspace_id = w.id
    LEFT JOIN participation_opportunities o ON o.study_id = s.id
    WHERE w.slug = ?
    GROUP BY w.id, w.slug, w.name, w.description, w.visibility, w.created_at
    LIMIT 1`,
  )
    .bind(workspaceSlug)
    .all<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      visibility: "public" | "private";
      createdAt: string;
      projectCount: number | string;
      studyCount: number | string;
      identityCount: number | string;
      openOpportunityCount: number | string;
    }>();

  const workspaceRow = workspaceRows.results[0];
  if (!workspaceRow) return null;

  return {
    id: workspaceRow.id,
    slug: workspaceRow.slug,
    name: workspaceRow.name,
    description: workspaceRow.description,
    visibility: workspaceRow.visibility,
    createdAt: workspaceRow.createdAt,
    projectCount: toInt(workspaceRow.projectCount),
    studyCount: toInt(workspaceRow.studyCount),
    identityCount: toInt(workspaceRow.identityCount),
    openOpportunityCount: toInt(workspaceRow.openOpportunityCount),
  };
};

const queryWorkspaceProjects = async (env: Bindings, workspaceId: string) => {
  if (!env.DB) return [];

  const projectRows = await env.DB.prepare(
    `SELECT
      p.id,
      p.workspace_id AS workspaceId,
      w.slug AS workspaceSlug,
      p.slug,
      p.name,
      p.project_type AS projectType,
      p.created_at AS createdAt,
      s.slug AS studySlug,
      s.title AS studyTitle,
      s.status AS studyStatus,
      COALESCE(MAX(sp.version), 0) AS latestVersion,
      COUNT(DISTINCT CASE WHEN o.status = 'open' THEN o.id END) AS openOpportunityCount
    FROM projects p
    JOIN workspaces w ON w.id = p.workspace_id
    LEFT JOIN studies s ON s.project_id = p.id
    LEFT JOIN study_publications sp ON sp.study_id = s.id
    LEFT JOIN participation_opportunities o ON o.study_id = s.id
    WHERE p.workspace_id = ?
    GROUP BY
      p.id,
      p.workspace_id,
      w.slug,
      p.slug,
      p.name,
      p.project_type,
      p.created_at,
      s.slug,
      s.title,
      s.status
    ORDER BY p.created_at ASC`,
  )
    .bind(workspaceId)
    .all<{
      id: string;
      workspaceId: string;
      workspaceSlug: string;
      slug: string;
      name: string;
      projectType: string;
      createdAt: string;
      studySlug: string | null;
      studyTitle: string | null;
      studyStatus: StudyStatus | null;
      latestVersion: number | string;
      openOpportunityCount: number | string;
    }>();

  return projectRows.results.map((row) => ({
    ...row,
    latestVersion: toInt(row.latestVersion),
    openOpportunityCount: toInt(row.openOpportunityCount),
  }));
};

const queryWorkspaceStudyBySlug = async (
  env: Bindings,
  workspaceId: string,
  studySlug: string,
) => {
  if (!env.DB) return null;

  const row = await env.DB.prepare(
    `SELECT
      s.id,
      s.workspace_id AS workspaceId,
      s.project_id AS projectId,
      s.slug,
      s.title,
      s.summary,
      s.status,
      s.research_type AS researchType,
      s.lead_identity_id AS leadIdentityId,
      s.protocol_json AS protocolJson,
      s.created_at AS createdAt,
      s.updated_at AS updatedAt,
      p.slug AS projectSlug,
      p.name AS projectName,
      i.handle AS leadHandle,
      COALESCE(MAX(sp.version), 0) AS latestVersion,
      json_group_array(DISTINCT o.target_kind) AS targetKindsJson,
      COUNT(DISTINCT CASE WHEN o.status = 'open' THEN o.id END) AS openOpportunityCount
    FROM studies s
    JOIN projects p ON p.id = s.project_id
    JOIN identities i ON i.id = s.lead_identity_id
    LEFT JOIN study_publications sp ON sp.study_id = s.id
    LEFT JOIN participation_opportunities o ON o.study_id = s.id
    WHERE s.workspace_id = ? AND s.slug = ?
    GROUP BY
      s.id,
      s.workspace_id,
      s.project_id,
      s.slug,
      s.title,
      s.summary,
      s.status,
      s.research_type,
      s.lead_identity_id,
      s.protocol_json,
      s.created_at,
      s.updated_at,
      p.slug,
      p.name,
      i.handle
    LIMIT 1`,
  )
    .bind(workspaceId, studySlug)
    .first<{
      id: string;
      workspaceId: string;
      projectId: string;
      slug: string;
      title: string;
      summary: string;
      status: StudyStatus;
      researchType: string;
      leadIdentityId: string;
      protocolJson: string;
      createdAt: string;
      updatedAt: string;
      projectSlug: string;
      projectName: string;
      leadHandle: string;
      latestVersion: number | string;
      targetKindsJson: string | null;
      openOpportunityCount: number | string;
    }>();

  if (!row) {
    return null;
  }

  const protocol = parseProtocolSummary(row.protocolJson);

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    status: row.status,
    researchType: row.researchType,
    leadIdentityId: row.leadIdentityId,
    protocolJson: row.protocolJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    projectSlug: row.projectSlug,
    projectName: row.projectName,
    leadHandle: row.leadHandle,
    latestVersion: toInt(row.latestVersion),
    estimatedDurationMinutes: protocol.estimatedDurationMinutes,
    packageId: protocol.packageId,
    nodeTypes: protocol.nodeTypes,
    measures: protocol.measures,
    outputs: protocol.outputs,
    targetKinds: parseJsonStringArray(row.targetKindsJson),
    openOpportunityCount: toInt(row.openOpportunityCount),
  };
};

const queryWorkspaceStudies = async (env: Bindings, workspaceId: string) => {
  if (!env.DB) return [];

  const studyRows = await env.DB.prepare(
    `SELECT
      s.id,
      s.workspace_id AS workspaceId,
      s.project_id AS projectId,
      s.slug,
      s.title,
      s.summary,
      s.status,
      s.research_type AS researchType,
      s.lead_identity_id AS leadIdentityId,
      s.protocol_json AS protocolJson,
      s.created_at AS createdAt,
      p.slug AS projectSlug,
      p.name AS projectName,
      i.handle AS leadHandle,
      COALESCE(MAX(sp.version), 0) AS latestVersion,
      json_group_array(DISTINCT o.target_kind) AS targetKindsJson,
      COUNT(DISTINCT CASE WHEN o.status = 'open' THEN o.id END) AS openOpportunityCount
    FROM studies s
    JOIN projects p ON p.id = s.project_id
    JOIN identities i ON i.id = s.lead_identity_id
    LEFT JOIN study_publications sp ON sp.study_id = s.id
    LEFT JOIN participation_opportunities o ON o.study_id = s.id
    WHERE s.workspace_id = ?
    GROUP BY
      s.id,
      s.workspace_id,
      s.project_id,
      s.slug,
      s.title,
      s.summary,
      s.status,
      s.research_type,
      s.lead_identity_id,
      s.protocol_json,
      s.created_at,
      p.slug,
      p.name,
      i.handle
    ORDER BY s.created_at ASC`,
  )
    .bind(workspaceId)
    .all<{
      id: string;
      workspaceId: string;
      projectId: string;
      slug: string;
      title: string;
      summary: string;
      status: StudyStatus;
      researchType: string;
      leadIdentityId: string;
      protocolJson: string;
      createdAt: string;
      projectSlug: string;
      projectName: string;
      leadHandle: string;
      latestVersion: number | string;
      targetKindsJson: string | null;
      openOpportunityCount: number | string;
    }>();

  return studyRows.results.map((row) => {
    const protocol = parseProtocolSummary(row.protocolJson);

    return {
      id: row.id,
      workspaceId: row.workspaceId,
      projectId: row.projectId,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      status: row.status,
      researchType: row.researchType,
      leadIdentityId: row.leadIdentityId,
      projectSlug: row.projectSlug,
      projectName: row.projectName,
      leadHandle: row.leadHandle,
      latestVersion: toInt(row.latestVersion),
      estimatedDurationMinutes: protocol.estimatedDurationMinutes,
      packageId: protocol.packageId,
      nodeTypes: protocol.nodeTypes,
      measures: protocol.measures,
      outputs: protocol.outputs,
      targetKinds: parseJsonStringArray(row.targetKindsJson),
      openOpportunityCount: toInt(row.openOpportunityCount),
      createdAt: row.createdAt,
    };
  });
};

const queryWorkspaceOpportunities = async (
  env: Bindings,
  workspaceId: string,
) => {
  if (!env.DB) return [];

  const opportunityRows = await env.DB.prepare(
    `SELECT
      o.id,
      o.study_id AS studyId,
      s.slug AS studySlug,
      s.title AS studyTitle,
      o.target_kind AS targetKind,
      o.status,
      o.instructions_md AS instructionsMd,
      o.created_at AS createdAt
    FROM participation_opportunities o
    JOIN studies s ON s.id = o.study_id
    WHERE s.workspace_id = ?
    ORDER BY o.created_at ASC`,
  )
    .bind(workspaceId)
    .all<{
      id: string;
      studyId: string;
      studySlug: string;
      studyTitle: string;
      targetKind: string;
      status: OpportunityStatus;
      instructionsMd: string | null;
      createdAt: string;
    }>();

  return opportunityRows.results.map((row) => ({ ...row }));
};

const queryWorkspaceOpportunityById = async (
  env: Bindings,
  workspaceId: string,
  studyId: string,
  opportunityId: string,
) => {
  if (!env.DB) return null;

  return env.DB.prepare(
    `SELECT
      o.id,
      o.study_id AS studyId,
      s.slug AS studySlug,
      s.title AS studyTitle,
      o.target_kind AS targetKind,
      o.status,
      o.instructions_md AS instructionsMd,
      o.created_at AS createdAt
    FROM participation_opportunities o
    JOIN studies s ON s.id = o.study_id
    WHERE s.workspace_id = ?
      AND o.study_id = ?
      AND o.id = ?
    LIMIT 1`,
  )
    .bind(workspaceId, studyId, opportunityId)
    .first<{
      id: string;
      studyId: string;
      studySlug: string;
      studyTitle: string;
      targetKind: OpportunityStatus | "human" | "agent" | "mixed";
      status: OpportunityStatus;
      instructionsMd: string | null;
      createdAt: string;
    }>();
};

const queryWorkspaceStudyRuns = async (
  env: Bindings,
  workspaceId: string,
  studyId: string,
): Promise<z.infer<typeof studyRunSchema>[]> => {
  if (!env.DB) return [];

  const rows = await env.DB.prepare(
    `SELECT
      r.id,
      r.workspace_id AS workspaceId,
      r.project_id AS projectId,
      p.slug AS projectSlug,
      r.study_id AS studyId,
      s.slug AS studySlug,
      r.actor_identity_id AS actorIdentityId,
      i.handle AS actorHandle,
      r.participant_kind AS participantKind,
      r.status,
      r.event_count AS eventCount,
      r.summary_json AS summaryJson,
      r.created_at AS createdAt,
      r.completed_at AS completedAt
    FROM study_runs r
    JOIN studies s ON s.id = r.study_id
    JOIN projects p ON p.id = r.project_id
    LEFT JOIN identities i ON i.id = r.actor_identity_id
    WHERE r.workspace_id = ?
      AND r.study_id = ?
    ORDER BY r.created_at DESC`,
  )
    .bind(workspaceId, studyId)
    .all<{
      id: string;
      workspaceId: string;
      projectId: string;
      projectSlug: string;
      studyId: string;
      studySlug: string;
      actorIdentityId: string | null;
      actorHandle: string | null;
      participantKind: string;
      status: string;
      eventCount: number | string;
      summaryJson: string | null;
      createdAt: string;
      completedAt: string | null;
    }>();

  return rows.results.map((row) => {
    const participantKind: z.infer<typeof actorKindSchema> =
      row.participantKind === "agent" ? "agent" : "human";
    const status = normalizeStudyRunStatus(row.status);

    return {
      id: row.id,
      workspaceId: row.workspaceId,
      projectId: row.projectId,
      projectSlug: row.projectSlug,
      studyId: row.studyId,
      studySlug: row.studySlug,
      actorIdentityId: row.actorIdentityId,
      actorHandle: row.actorHandle,
      participantKind,
      status,
      eventCount: toInt(row.eventCount),
      summary: parseJsonObject(row.summaryJson),
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    };
  });
};

const queryWorkspaceStudyRunById = async (
  env: Bindings,
  workspaceId: string,
  studyId: string,
  runId: string,
) => {
  const runs = await queryWorkspaceStudyRuns(env, workspaceId, studyId);
  return runs.find((run) => run.id === runId) ?? null;
};

const queryWorkspaceRoadmapSummary = async (
  env: Bindings,
  workspaceId: string,
) => {
  if (!env.DB) return buildEmptyRoadmapSummary();

  const roadmapRows = await env.DB.prepare(
    `SELECT status, COUNT(*) AS count
    FROM roadmap_items
    WHERE workspace_id = ?
    GROUP BY status`,
  )
    .bind(workspaceId)
    .all<{
      status: string;
      count: number | string;
    }>();

  const summary = buildEmptyRoadmapSummary();
  for (const row of roadmapRows.results) {
    const count = toInt(row.count);
    if (row.status === "backlog") summary.backlog = count;
    if (row.status === "ready") summary.ready = count;
    if (row.status === "in_progress") summary.inProgress = count;
    if (row.status === "blocked") summary.blocked = count;
    if (row.status === "done") summary.done = count;
  }

  return summary;
};

const roadmapStatusByColumnSlug = {
  backlog: "backlog",
  ready: "ready",
  blocked: "blocked",
  done: "done",
  "in-progress": "in_progress",
  in_progress: "in_progress",
} as const;

const roadmapColumnSlugByStatus: Record<
  z.infer<typeof roadmapItemStatusSchema>,
  string
> = {
  backlog: "backlog",
  ready: "ready",
  in_progress: "in-progress",
  blocked: "blocked",
  done: "done",
};

const normalizeRoadmapStatusToken = (
  value: string | null | undefined,
): z.infer<typeof roadmapItemStatusSchema> | null => {
  if (!value) return null;

  return (
    roadmapStatusByColumnSlug[
      value as keyof typeof roadmapStatusByColumnSlug
    ] ?? null
  );
};

const resolveWorkspaceProjectBySlug = async (
  env: Bindings,
  workspaceId: string,
  projectSlug: string,
) => {
  if (!env.DB) return null;

  return env.DB.prepare(
    `SELECT id, slug, name
    FROM projects
    WHERE workspace_id = ? AND slug = ?
    LIMIT 1`,
  )
    .bind(workspaceId, projectSlug)
    .first<{
      id: string;
      slug: string;
      name: string;
    }>();
};

const resolveWorkspaceIdentityByHandle = async (
  env: Bindings,
  workspaceId: string,
  handle: string,
) => {
  if (!env.DB) return null;

  return env.DB.prepare(
    `SELECT id, handle
    FROM identities
    WHERE workspace_id = ? AND handle = ?
    LIMIT 1`,
  )
    .bind(workspaceId, handle)
    .first<{
      id: string;
      handle: string;
    }>();
};

const resolveRoadmapColumn = async (
  env: Bindings,
  workspaceId: string,
  columnSlug: string,
  projectId?: string | null,
) => {
  if (!env.DB) return null;

  if (projectId) {
    const projectColumn = await env.DB.prepare(
      `SELECT id, workspace_id AS workspaceId, project_id AS projectId, slug, title
      FROM roadmap_columns
      WHERE workspace_id = ? AND project_id = ? AND slug = ?
      LIMIT 1`,
    )
      .bind(workspaceId, projectId, columnSlug)
      .first<{
        id: string;
        workspaceId: string;
        projectId: string | null;
        slug: string;
        title: string;
      }>();

    if (projectColumn) {
      return projectColumn;
    }
  }

  return env.DB.prepare(
    `SELECT id, workspace_id AS workspaceId, project_id AS projectId, slug, title
    FROM roadmap_columns
    WHERE workspace_id = ? AND project_id IS NULL AND slug = ?
    LIMIT 1`,
  )
    .bind(workspaceId, columnSlug)
    .first<{
      id: string;
      workspaceId: string;
      projectId: string | null;
      slug: string;
      title: string;
    }>();
};

const resolveRoadmapPlacement = async (
  env: Bindings,
  options: {
    workspaceId: string;
    projectId?: string | null;
    columnSlug?: string | null;
    status?: z.infer<typeof roadmapItemStatusSchema> | null;
  },
) => {
  const requestedStatus = options.status ?? null;
  const targetColumnSlug =
    options.columnSlug ??
    (requestedStatus ? roadmapColumnSlugByStatus[requestedStatus] : null);

  if (!targetColumnSlug) {
    return {
      error:
        "A roadmap column or status is required to place the item on the board.",
    };
  }

  const column = await resolveRoadmapColumn(
    env,
    options.workspaceId,
    targetColumnSlug,
    options.projectId,
  );
  if (!column) {
    return {
      error: `Roadmap column "${targetColumnSlug}" was not found in this workspace context.`,
    };
  }

  const derivedStatus = normalizeRoadmapStatusToken(column.slug);
  if (!derivedStatus) {
    return {
      error: `Roadmap column "${column.slug}" is not mappable to a canonical roadmap status.`,
    };
  }

  if (requestedStatus && requestedStatus !== derivedStatus) {
    return {
      error:
        "Roadmap status and column must agree. Use the column that matches the target status.",
    };
  }

  return {
    column,
    status: derivedStatus,
  };
};

const buildRoadmapItemMetadata = (
  baseMetadata: Record<string, unknown> | null | undefined,
  updates: Record<string, unknown> | null | undefined,
  studySlug: string | null | undefined,
) => {
  const metadata = {
    ...(baseMetadata ?? {}),
    ...(updates ?? {}),
  };

  if (studySlug !== undefined) {
    if (studySlug === null) {
      metadata.studySlug = undefined;
    } else {
      metadata.studySlug = studySlug;
    }
  }

  return metadata;
};

const queryWorkspaceRoadmapItemById = async (
  env: Bindings,
  workspaceId: string,
  itemId: string,
) => {
  if (!env.DB) return null;

  const row = await env.DB.prepare(
    `SELECT
      ri.id,
      ri.workspace_id AS workspaceId,
      ri.project_id AS projectId,
      p.slug AS projectSlug,
      ri.column_id AS columnId,
      c.slug AS columnSlug,
      c.title AS columnTitle,
      ri.assignee_identity_id AS assigneeIdentityId,
      i.handle AS assigneeHandle,
      ri.title,
      ri.summary,
      ri.kind,
      ri.status,
      ri.metadata_json AS metadataJson,
      ri.created_at AS createdAt,
      ri.updated_at AS updatedAt
    FROM roadmap_items ri
    JOIN roadmap_columns c ON c.id = ri.column_id
    LEFT JOIN projects p ON p.id = ri.project_id
    LEFT JOIN identities i ON i.id = ri.assignee_identity_id
    WHERE ri.workspace_id = ? AND ri.id = ?
    LIMIT 1`,
  )
    .bind(workspaceId, itemId)
    .first<{
      id: string;
      workspaceId: string;
      projectId: string | null;
      projectSlug: string | null;
      columnId: string;
      columnSlug: string;
      columnTitle: string;
      assigneeIdentityId: string | null;
      assigneeHandle: string | null;
      title: string;
      summary: string;
      kind: string;
      status: string;
      metadataJson: string | null;
      createdAt: string;
      updatedAt: string;
    }>();

  if (!row) return null;

  const metadata = parseJsonObject(row.metadataJson) as Record<string, unknown>;

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    projectSlug: row.projectSlug,
    columnId: row.columnId,
    columnSlug: row.columnSlug,
    columnTitle: row.columnTitle,
    assigneeIdentityId: row.assigneeIdentityId,
    assigneeHandle: row.assigneeHandle,
    title: row.title,
    summary: row.summary,
    kind: row.kind,
    status: row.status,
    studySlug:
      typeof metadata.studySlug === "string" ? metadata.studySlug : null,
    metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const queryWorkspaceRoadmapDependencyById = async (
  env: Bindings,
  workspaceId: string,
  dependencyId: string,
) => {
  if (!env.DB) return null;

  return env.DB.prepare(
    `SELECT
      d.id,
      d.from_item_id AS fromItemId,
      d.to_item_id AS toItemId,
      d.created_at AS createdAt
    FROM roadmap_dependencies d
    JOIN roadmap_items source_item ON source_item.id = d.from_item_id
    JOIN roadmap_items target_item ON target_item.id = d.to_item_id
    WHERE d.id = ?
      AND source_item.workspace_id = ?
      AND target_item.workspace_id = ?
    LIMIT 1`,
  )
    .bind(dependencyId, workspaceId, workspaceId)
    .first<{
      id: string;
      fromItemId: string;
      toItemId: string;
      createdAt: string;
    }>();
};

const queryWorkspaceRoadmapDependencyByEdge = async (
  env: Bindings,
  workspaceId: string,
  fromItemId: string,
  toItemId: string,
) => {
  if (!env.DB) return null;

  return env.DB.prepare(
    `SELECT
      d.id,
      d.from_item_id AS fromItemId,
      d.to_item_id AS toItemId,
      d.created_at AS createdAt
    FROM roadmap_dependencies d
    JOIN roadmap_items source_item ON source_item.id = d.from_item_id
    JOIN roadmap_items target_item ON target_item.id = d.to_item_id
    WHERE d.from_item_id = ?
      AND d.to_item_id = ?
      AND source_item.workspace_id = ?
      AND target_item.workspace_id = ?
    LIMIT 1`,
  )
    .bind(fromItemId, toItemId, workspaceId, workspaceId)
    .first<{
      id: string;
      fromItemId: string;
      toItemId: string;
      createdAt: string;
    }>();
};

const queryWorkspaceRoadmapDependencies = async (
  env: Bindings,
  workspaceId: string,
) => {
  if (!env.DB) return [];

  const rows = await env.DB.prepare(
    `SELECT
      d.id,
      d.from_item_id AS fromItemId,
      d.to_item_id AS toItemId,
      d.created_at AS createdAt
    FROM roadmap_dependencies d
    JOIN roadmap_items source_item ON source_item.id = d.from_item_id
    JOIN roadmap_items target_item ON target_item.id = d.to_item_id
    WHERE source_item.workspace_id = ?
      AND target_item.workspace_id = ?
    ORDER BY d.created_at ASC`,
  )
    .bind(workspaceId, workspaceId)
    .all<{
      id: string;
      fromItemId: string;
      toItemId: string;
      createdAt: string;
    }>();

  return rows.results.map((row) => ({ ...row }));
};

const wouldIntroduceRoadmapCycle = (
  dependencies: {
    fromItemId: string;
    toItemId: string;
  }[],
  fromItemId: string,
  toItemId: string,
) => {
  if (fromItemId === toItemId) {
    return true;
  }

  const outgoing = new Map<string, string[]>();
  for (const dependency of dependencies) {
    const targets = outgoing.get(dependency.fromItemId) ?? [];
    targets.push(dependency.toItemId);
    outgoing.set(dependency.fromItemId, targets);
  }

  const queue = [toItemId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    if (current === fromItemId) {
      return true;
    }

    visited.add(current);
    for (const next of outgoing.get(current) ?? []) {
      if (!visited.has(next)) {
        queue.push(next);
      }
    }
  }

  return false;
};

const queryWorkspaceRoadmapDetails = async (
  env: Bindings,
  workspaceId: string,
) => {
  if (!env.DB) {
    return {
      columns: [],
      items: [],
      dependencies: [],
      summary: buildEmptyRoadmapSummary(),
    };
  }

  const [columnRows, itemRows, dependencyRows, summary] = await Promise.all([
    env.DB.prepare(
      `SELECT
        c.id,
        c.workspace_id AS workspaceId,
        c.project_id AS projectId,
        c.slug,
        c.title,
        c.position,
        c.description
      FROM roadmap_columns c
      WHERE c.workspace_id = ?
      ORDER BY c.position ASC, c.title ASC`,
    )
      .bind(workspaceId)
      .all<{
        id: string;
        workspaceId: string;
        projectId: string | null;
        slug: string;
        title: string;
        position: number | string;
        description: string | null;
      }>(),
    env.DB.prepare(
      `SELECT
        ri.id,
        ri.workspace_id AS workspaceId,
        ri.project_id AS projectId,
        p.slug AS projectSlug,
        ri.column_id AS columnId,
        c.slug AS columnSlug,
        c.title AS columnTitle,
        ri.assignee_identity_id AS assigneeIdentityId,
        i.handle AS assigneeHandle,
        ri.title,
        ri.summary,
        ri.kind,
        ri.status,
        ri.metadata_json AS metadataJson,
        ri.created_at AS createdAt,
        ri.updated_at AS updatedAt
      FROM roadmap_items ri
      JOIN roadmap_columns c ON c.id = ri.column_id
      LEFT JOIN projects p ON p.id = ri.project_id
      LEFT JOIN identities i ON i.id = ri.assignee_identity_id
      WHERE ri.workspace_id = ?
      ORDER BY c.position ASC, ri.created_at ASC`,
    )
      .bind(workspaceId)
      .all<{
        id: string;
        workspaceId: string;
        projectId: string | null;
        projectSlug: string | null;
        columnId: string;
        columnSlug: string;
        columnTitle: string;
        assigneeIdentityId: string | null;
        assigneeHandle: string | null;
        title: string;
        summary: string;
        kind: string;
        status: string;
        metadataJson: string | null;
        createdAt: string;
        updatedAt: string;
      }>(),
    env.DB.prepare(
      `SELECT
        d.id,
        d.from_item_id AS fromItemId,
        d.to_item_id AS toItemId,
        d.created_at AS createdAt
      FROM roadmap_dependencies d
      JOIN roadmap_items ri ON ri.id = d.from_item_id
      WHERE ri.workspace_id = ?
      ORDER BY d.created_at ASC`,
    )
      .bind(workspaceId)
      .all<{
        id: string;
        fromItemId: string;
        toItemId: string;
        createdAt: string;
      }>(),
    queryWorkspaceRoadmapSummary(env, workspaceId),
  ]);

  return {
    columns: columnRows.results.map((row) => ({
      ...row,
      position: toInt(row.position),
    })),
    items: itemRows.results.map((row) => {
      const metadata = parseJsonObject(row.metadataJson) as Record<
        string,
        unknown
      >;

      return {
        id: row.id,
        workspaceId: row.workspaceId,
        projectId: row.projectId,
        projectSlug: row.projectSlug,
        columnId: row.columnId,
        columnSlug: row.columnSlug,
        columnTitle: row.columnTitle,
        assigneeIdentityId: row.assigneeIdentityId,
        assigneeHandle: row.assigneeHandle,
        title: row.title,
        summary: row.summary,
        kind: row.kind,
        status: row.status,
        studySlug:
          typeof metadata.studySlug === "string" ? metadata.studySlug : null,
        metadata,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }),
    dependencies: dependencyRows.results.map((row) => ({ ...row })),
    summary,
  };
};

const queryWorkspaceSnapshotBySlug = async (
  env: Bindings,
  workspaceSlug: string,
) => {
  const workspace = await queryWorkspaceSummaryBySlug(env, workspaceSlug);
  if (!workspace) return null;

  const [projects, studies, opportunities, assets, roadmap] = await Promise.all(
    [
      queryWorkspaceProjects(env, workspace.id),
      queryWorkspaceStudies(env, workspace.id),
      queryWorkspaceOpportunities(env, workspace.id),
      queryAssetManifestEntries(env, workspace.id),
      queryWorkspaceRoadmapSummary(env, workspace.id),
    ],
  );

  return {
    generatedAt: new Date().toISOString(),
    workspace,
    projects,
    studies,
    opportunities,
    assets,
    roadmap,
  };
};

const buildAuthConfig = (bindings: Bindings) => {
  const emailProvider = getAuthEmailProvider(bindings);
  const googleState: "enabled" | "planned" = bindings.AUTH_GOOGLE_CLIENT_ID
    ? "enabled"
    : "planned";
  const githubState: "enabled" | "planned" = bindings.AUTH_GITHUB_CLIENT_ID
    ? "enabled"
    : "planned";
  const emailState: "enabled" | "disabled" =
    emailProvider === "disabled" ? "disabled" : "enabled";

  return {
    sessionCookieName: authSessionCookieName,
    cookieDomain: getAuthCookieDomain(bindings) ?? null,
    emailProvider,
    integrationEmailHarness: "Mailpit",
    providers: [
      {
        id: "google",
        label: "Google OAuth",
        actorKind: "human" as const,
        state: googleState,
        strategy: "OAuth 2.0 / OIDC",
      },
      {
        id: "github",
        label: "GitHub OAuth",
        actorKind: "human" as const,
        state: githubState,
        strategy: "OAuth 2.0",
      },
      {
        id: "email_magic_link",
        label: "Email magic link",
        actorKind: "human" as const,
        state: emailState,
        strategy: "One-time login tokens delivered over email",
      },
      {
        id: "workspace_api_key",
        label: "Workspace API key",
        actorKind: "agent" as const,
        state: "enabled" as const,
        strategy: "Workspace-scoped opaque API keys",
      },
    ],
  };
};

const applyAuthCorsHeaders = (context: CorsContextLike) => {
  const bindings = getBindings(context);
  const origin = context.req.header("origin");
  if (!origin) return;

  const allowedOrigins = buildAllowedOrigins(bindings);
  if (!allowedOrigins.has(origin)) return;

  context.header("Access-Control-Allow-Origin", origin);
  context.header("Access-Control-Allow-Credentials", "true");
  context.header("Access-Control-Allow-Headers", "content-type");
  context.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  context.header("Vary", "Origin");
};

const getWorkspaceBySlug = async (env: Bindings, workspaceSlug: string) => {
  if (!env.DB) return null;

  return env.DB.prepare(
    `SELECT id, slug, name, visibility
    FROM workspaces
    WHERE slug = ?
    LIMIT 1`,
  )
    .bind(workspaceSlug)
    .first<{
      id: string;
      slug: string;
      name: string;
      visibility: "public" | "private";
    }>();
};

const getWorkspaceMembershipCount = async (
  env: Bindings,
  workspaceId: string,
) => {
  if (!env.DB) return 0;

  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count
    FROM workspace_memberships
    WHERE workspace_id = ?`,
  )
    .bind(workspaceId)
    .first<{ count: number | string }>();

  return toInt(row?.count ?? 0);
};

const resolveWorkspaceRouteAccess = async (
  context: {
    req: { header(name: string): string | undefined };
  },
  env: Bindings,
  workspace: Pick<WorkspaceRecord, "slug" | "visibility">,
) => {
  const sessionToken = getCookie(
    context as Parameters<typeof getCookie>[0],
    authSessionCookieName,
  );
  const actor = await resolveActorContext(env, {
    sessionToken,
    workspaceSlug: workspace.slug,
    userAgent: getUserAgent(context),
  });
  const access = buildWorkspaceAccess(actor, workspace);

  return {
    actor,
    access,
    canRead: canReadWorkspace(actor, workspace),
  };
};

app.use("*", async (context, next) => {
  const requestId =
    context.req.header("x-psyos-request-id") ?? crypto.randomUUID();

  context.set("requestId", requestId);
  await next();

  const env = getBindings(context);
  context.header("x-psyos-request-id", requestId);
  context.header("x-psyos-runtime-version", getRuntimeVersion(env));
  context.header("x-psyos-deploy-environment", getDeployEnvironment(env));
  context.header("x-psyos-commit", getGitCommit(env));
});

app.use("/api/v1/auth/*", async (context, next) => {
  applyAuthCorsHeaders(context);

  if (context.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: context.res.headers,
    });
  }

  await next();
  applyAuthCorsHeaders(context);
});

app.doc("/api/v1/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "PsyOS API",
    version: "0.1.0",
    description: "Open-source multi-agent psychology research platform API.",
  },
  servers: [
    {
      url: "https://api.psyos.org",
      description: "Production",
    },
    {
      url: "http://127.0.0.1:8787",
      description: "Local development",
    },
  ],
});

app.get("/api/v1/docs", swaggerUI({ url: "/api/v1/openapi.json" }));

app.openapi(rootRoute, (context) => {
  const env = getBindings(context);

  return context.json(
    {
      service: env.APP_NAME ?? "psyos-api",
      message: "PsyOS API bootstrap",
      docs: "/api/v1/docs",
    },
    200,
  );
});

app.openapi(healthRoute, async (context) => {
  const env = getBindings(context);
  const hasDatabase = Boolean(env.DB);
  const heartbeat = hasDatabase
    ? await env.DB?.prepare("SELECT 1 AS ok").first<{ ok: number }>()
    : null;

  return context.json(
    {
      status: "ok",
      service: env.APP_NAME ?? "psyos-api",
      database: {
        configured: hasDatabase,
        heartbeat: heartbeat?.ok ?? null,
      },
      now: new Date().toISOString(),
    },
    200,
  );
});

app.openapi(authConfigRoute, (context) => {
  return context.json(buildAuthConfig(getBindings(context)), 200);
});

app.openapi(authSessionRoute, async (context) => {
  const env = getBindings(context);
  const { workspaceSlug } = context.req.valid("query");
  const sessionToken = getCookie(context, authSessionCookieName);

  return context.json(
    await buildAuthSessionResponse(
      env,
      sessionToken,
      workspaceSlug,
      getUserAgent(context),
    ),
    200,
  );
});

app.openapi(authEmailRequestRoute, async (context) => {
  const env = getBindings(context);
  const requestId = context.get("requestId");
  const userAgent = getUserAgent(context);
  const { displayName, email, workspaceSlug } = authEmailRequestSchema.parse(
    await context.req.json(),
  );
  let workspace: WorkspaceRecord | null = null;

  if (!env.DB) {
    return context.json(
      {
        error: "D1 binding is required for auth flows.",
      },
      503,
    );
  }

  if (workspaceSlug) {
    workspace = await getWorkspaceBySlug(env, workspaceSlug);
    if (!workspace) {
      return context.json(
        {
          error: `Workspace "${workspaceSlug}" was not found.`,
        },
        400,
      );
    }
  }

  if (getAuthEmailProvider(env) === "disabled") {
    return context.json(
      {
        error: "Magic-link delivery is disabled for this environment.",
      },
      503,
    );
  }

  const user = await ensureUserForEmail(env, email, displayName);
  if (!user) {
    return context.json(
      {
        error: "Unable to prepare a user for this email address.",
      },
      503,
    );
  }

  const tokenRecord = await persistMagicLink(env, user.id, user.primaryEmail);
  if (!tokenRecord) {
    return context.json(
      {
        error: "Unable to create a login token.",
      },
      503,
    );
  }

  const loginUrl = new URL(
    workspaceSlug
      ? `/workspaces/${workspaceSlug}/settings`
      : "/workspaces/psyos-lab/settings",
    getPublicWebUrl(env),
  );
  loginUrl.searchParams.set("auth_token", tokenRecord.token);
  if (workspaceSlug) {
    loginUrl.searchParams.set("workspace", workspaceSlug);
  }

  try {
    const delivery = await sendMagicLinkEmail(
      env,
      user.primaryEmail,
      loginUrl.toString(),
    );

    await recordAuthEvent(env, {
      userId: user.id,
      workspaceId: workspace?.id ?? null,
      eventType: "magic_link_requested",
      userAgent,
      requestId,
      metadata: {
        workspaceSlug: workspaceSlug ?? null,
        deliveryChannel: delivery.channel,
        deliveryStatus: delivery.status,
        messageId: delivery.messageId ?? null,
      },
    });

    return context.json(
      {
        ok: true as const,
        message:
          delivery.status === "preview"
            ? "Preview login link generated. Open it manually in the browser."
            : "Magic link sent. Check your inbox.",
        workspaceSlug: workspaceSlug ?? null,
        expiresAt: tokenRecord.expiresAt,
        delivery,
      },
      200,
    );
  } catch (error) {
    await recordAuthEvent(env, {
      userId: user.id,
      workspaceId: workspace?.id ?? null,
      eventType: "magic_link_failed",
      userAgent,
      requestId,
      metadata: {
        workspaceSlug: workspaceSlug ?? null,
        reason: error instanceof Error ? error.message : "unknown",
      },
    });

    return context.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Magic link delivery failed.",
      },
      503,
    );
  }
});

app.openapi(authEmailConsumeRoute, async (context) => {
  const env = getBindings(context);
  const requestId = context.get("requestId");
  const userAgent = getUserAgent(context);
  const { token, workspaceSlug } = authEmailConsumeSchema.parse(
    await context.req.json(),
  );

  if (!env.DB) {
    return context.json(
      {
        error: "D1 binding is required for auth flows.",
      },
      503,
    );
  }

  const user = await consumeMagicLink(env, token);
  if (!user) {
    return context.json(
      {
        error: "This login link is invalid or has expired.",
      },
      400,
    );
  }

  if (workspaceSlug) {
    const workspaceJoined = await ensureWorkspaceMembershipAndIdentity(
      env,
      {
        id: user.id,
        handle: user.handle,
        displayName: user.displayName,
        primaryEmail: user.primaryEmail,
      },
      workspaceSlug,
      {
        getWorkspaceBySlug,
        getWorkspaceMembershipCount,
      },
    );

    if (!workspaceJoined) {
      return context.json(
        {
          error: `Workspace "${workspaceSlug}" was not found.`,
        },
        400,
      );
    }
  }

  const session = await createSession(env, user.id, userAgent);
  if (!session) {
    return context.json(
      {
        error: "Unable to create a browser session.",
      },
      503,
    );
  }

  const workspace = workspaceSlug
    ? await getWorkspaceBySlug(env, workspaceSlug)
    : null;
  await recordAuthEvent(env, {
    userId: user.id,
    workspaceId: workspace?.id ?? null,
    eventType: "magic_link_consumed",
    userAgent,
    requestId,
    metadata: {
      workspaceSlug: workspaceSlug ?? null,
    },
  });
  await recordAuthEvent(env, {
    userId: user.id,
    workspaceId: workspace?.id ?? null,
    sessionId: session.id,
    eventType: "session_created",
    userAgent,
    requestId,
    metadata: {
      workspaceSlug: workspaceSlug ?? null,
      expiresAt: session.expiresAt,
    },
  });

  const cookieDomain = getAuthCookieDomain(env);
  setCookie(context, authSessionCookieName, session.sessionToken, {
    domain: cookieDomain,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: getDeployEnvironment(env) !== "development",
    expires: new Date(session.expiresAt),
  });

  return context.json(
    {
      ok: true as const,
      session: await buildAuthSessionResponse(
        env,
        session.sessionToken,
        workspaceSlug,
        userAgent,
      ),
    },
    200,
  );
});

app.openapi(authSessionsRoute, async (context) => {
  const env = getBindings(context);
  const sessionToken = getCookie(context, authSessionCookieName);

  if (!env.DB) {
    return context.json(
      {
        error: "D1 binding is required for auth flows.",
      },
      503,
    );
  }

  const actor = await resolveAuthenticatedSessionActor(env, {
    sessionToken,
    userAgent: getUserAgent(context),
  });
  if (!actor) {
    return context.json(
      {
        error: "Authentication is required.",
      },
      401,
    );
  }

  return context.json(
    await buildAuthSessionInventoryResponse(env, actor, sessionToken),
    200,
  );
});

app.openapi(authSessionRevokeRoute, async (context) => {
  const env = getBindings(context);
  const requestId = context.get("requestId");
  const userAgent = getUserAgent(context);
  const sessionToken = getCookie(context, authSessionCookieName);

  if (!env.DB) {
    return context.json(
      {
        error: "D1 binding is required for auth flows.",
      },
      503,
    );
  }

  const actor = await resolveAuthenticatedSessionActor(env, {
    sessionToken,
    userAgent,
  });
  if (!actor) {
    return context.json(
      {
        error: "Authentication is required.",
      },
      401,
    );
  }

  const { sessionId } = authSessionRevokeSchema.parse(await context.req.json());
  const revoked = await revokeSessionForUser(env, actor.user.id, sessionId);
  if (!revoked) {
    return context.json(
      {
        error: "The target session was not found.",
      },
      404,
    );
  }

  const currentSessionCleared = actor.session.id === sessionId;
  if (currentSessionCleared) {
    deleteCookie(context, authSessionCookieName, {
      domain: getAuthCookieDomain(env),
      path: "/",
    });
  }

  await recordAuthEvent(env, {
    userId: actor.user.id,
    sessionId,
    eventType: "session_revoked",
    userAgent,
    requestId,
    metadata: {
      reason: currentSessionCleared ? "self_revoke" : "remote_revoke",
      currentSessionCleared,
    },
  });

  return context.json(
    {
      ok: true as const,
      revokedSessionId: sessionId,
      currentSessionCleared,
      inventory: await buildAuthSessionInventoryResponse(
        env,
        currentSessionCleared ? null : actor,
        currentSessionCleared ? null : sessionToken,
      ),
    },
    200,
  );
});

app.openapi(authActivityRoute, async (context) => {
  const env = getBindings(context);
  const { limit } = context.req.valid("query");
  const sessionToken = getCookie(context, authSessionCookieName);

  if (!env.DB) {
    return context.json(
      {
        error: "D1 binding is required for auth flows.",
      },
      503,
    );
  }

  const actor = await resolveAuthenticatedSessionActor(env, {
    sessionToken,
    userAgent: getUserAgent(context),
  });
  if (!actor) {
    return context.json(
      {
        error: "Authentication is required.",
      },
      401,
    );
  }

  return context.json(
    {
      authenticated: true,
      events: await listAuthActivityForUser(env, actor.user.id, limit ?? 12),
    },
    200,
  );
});

app.openapi(authSignOutRoute, async (context) => {
  const env = getBindings(context);
  const requestId = context.get("requestId");
  const userAgent = getUserAgent(context);
  const sessionToken = getCookie(context, authSessionCookieName);
  const cookieDomain = getAuthCookieDomain(env);

  const clearedSession = await clearSession(env, sessionToken);
  if (clearedSession) {
    await recordAuthEvent(env, {
      userId: clearedSession.userId,
      sessionId: clearedSession.id,
      eventType: "session_revoked",
      userAgent,
      requestId,
      metadata: {
        reason: "sign_out",
        currentSessionCleared: true,
      },
    });
  }
  deleteCookie(context, authSessionCookieName, {
    domain: cookieDomain,
    path: "/",
  });

  return context.json(
    {
      ok: true as const,
    },
    200,
  );
});

app.openapi(maintenanceSystemRoute, (context) => {
  return context.json(
    buildMaintenanceSystemResponse(getBindings(context)),
    200,
  );
});

app.openapi(legacySystemRoute, (context) => {
  return context.json(
    buildMaintenanceSystemResponse(getBindings(context)),
    200,
  );
});

app.openapi(metaProcessRoute, (context) => {
  return context.json(
    {
      northStar: psyosNorthStar,
      flow: [...metaProcess],
      principles: [...platformPrinciples],
      lockedDecisions: psyosDecisions,
    },
    200,
  );
});

app.openapi(operatingGuideRoute, (context) => {
  return context.json(
    {
      stages: [...operatingGuide],
    },
    200,
  );
});

app.openapi(roadmapRoute, (context) => {
  return context.json(
    {
      columns: bootstrapRoadmap.columns.map((column) => ({ ...column })),
      items: bootstrapRoadmap.items.map((item) => ({ ...item })),
      dependencies: bootstrapRoadmap.dependencies.map((dependency) => ({
        ...dependency,
      })),
    },
    200,
  );
});

app.openapi(gapsRoute, (context) => {
  return context.json(
    {
      gaps: bootstrapGapRecords.map((gap) => ({ ...gap })),
    },
    200,
  );
});

app.openapi(operationalEventsRoute, (context) => {
  return context.json(
    {
      events: bootstrapOperationalEvents.map((event) => ({
        ...event,
        validation: [...event.validation],
      })),
    },
    200,
  );
});

app.openapi(deployHistoryRoute, (context) => {
  return context.json(
    {
      deploys: bootstrapDeployRecords.map((deploy) => ({
        ...deploy,
        delivery: [...deploy.delivery],
        verification: [...deploy.verification],
      })),
    },
    200,
  );
});

app.openapi(operationalChecklistRoute, (context) => {
  return context.json(
    {
      checklists: bootstrapOperationalChecklists.map((checklist) => ({
        ...checklist,
        steps: checklist.steps.map((step) => ({ ...step })),
      })),
    },
    200,
  );
});

app.openapi(assetManifestRoute, async (context) => {
  const env = getBindings(context);

  if (!env.DB) {
    return context.json(
      {
        generatedAt: new Date().toISOString(),
        assets: [],
        source: "bootstrap",
        warning: "D1 binding not configured yet.",
      },
      200,
    );
  }

  return context.json(
    {
      generatedAt: new Date().toISOString(),
      assets: await queryAssetManifestEntries(env),
    },
    200,
  );
});

app.openapi(workspaceAssetManifestRoute, async (context) => {
  const env = getBindings(context);
  const { workspaceSlug } = context.req.valid("param");

  if (!env.DB) {
    return context.json(
      buildEmptyWorkspaceAssetManifest("D1 binding not configured yet."),
      200,
    );
  }

  const workspace = await queryWorkspaceSummaryBySlug(env, workspaceSlug);
  if (!workspace) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" was not found.`,
      },
      404,
    );
  }

  const { access, canRead } = await resolveWorkspaceRouteAccess(
    context,
    env,
    workspace,
  );
  if (!canRead) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" is private. Sign in with an active workspace membership to continue.`,
      },
      403,
    );
  }

  return context.json(
    {
      generatedAt: new Date().toISOString(),
      workspace,
      access,
      assets: await queryAssetManifestEntries(env, workspace.id),
    },
    200,
  );
});

app.openapi(workspaceSnapshotRoute, async (context) => {
  const env = getBindings(context);
  const { workspaceSlug } = context.req.valid("param");

  if (!env.DB) {
    return context.json(
      buildEmptyWorkspaceSnapshot("D1 binding not configured yet."),
      200,
    );
  }

  const snapshot = await queryWorkspaceSnapshotBySlug(env, workspaceSlug);
  if (!snapshot) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" was not found.`,
      },
      404,
    );
  }

  const { access, canRead } = await resolveWorkspaceRouteAccess(
    context,
    env,
    snapshot.workspace,
  );
  if (!canRead) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" is private. Sign in with an active workspace membership to continue.`,
      },
      403,
    );
  }

  return context.json(
    {
      ...snapshot,
      access,
    },
    200,
  );
});

app.openapi(workspaceRoadmapRoute, async (context) => {
  const env = getBindings(context);
  const { workspaceSlug } = context.req.valid("param");

  if (!env.DB) {
    return context.json(
      buildEmptyWorkspaceRoadmap("D1 binding not configured yet."),
      200,
    );
  }

  const workspace = await queryWorkspaceSummaryBySlug(env, workspaceSlug);
  if (!workspace) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" was not found.`,
      },
      404,
    );
  }

  const { access, canRead } = await resolveWorkspaceRouteAccess(
    context,
    env,
    workspace,
  );
  if (!canRead) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" is private. Sign in with an active workspace membership to continue.`,
      },
      403,
    );
  }

  const roadmap = await queryWorkspaceRoadmapDetails(env, workspace.id);

  return context.json(
    {
      generatedAt: new Date().toISOString(),
      workspace,
      access,
      columns: roadmap.columns,
      items: roadmap.items,
      dependencies: roadmap.dependencies,
      summary: roadmap.summary,
    },
    200,
  );
});

app.openapi(dogfoodOverviewRoute, async (context) => {
  const env = getBindings(context);

  if (!env.DB) {
    return context.json(
      buildEmptyWorkspaceSnapshot("D1 binding not configured yet."),
      200,
    );
  }

  const snapshot = await queryWorkspaceSnapshotBySlug(env, "psyos-lab");
  if (!snapshot) {
    return context.json(
      buildEmptyWorkspaceSnapshot("No dogfood workspace seeded yet."),
      200,
    );
  }

  const { access, canRead } = await resolveWorkspaceRouteAccess(
    context,
    env,
    snapshot.workspace,
  );
  if (!canRead) {
    return context.json(
      {
        error:
          'Workspace "psyos-lab" is private. Sign in with an active workspace membership to continue.',
      },
      403,
    );
  }

  return context.json(
    {
      ...snapshot,
      access,
    },
    200,
  );
});

app.openapi(workspaceRoadmapCreateItemRoute, async (context) => {
  const env = getBindings(context);
  const { workspaceSlug } = context.req.valid("param");

  if (!env.DB) {
    return context.json(
      {
        error: "D1 binding is required for roadmap mutations.",
      },
      503,
    );
  }

  const workspace = await queryWorkspaceSummaryBySlug(env, workspaceSlug);
  if (!workspace) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" was not found.`,
      },
      404,
    );
  }

  const { access } = await resolveWorkspaceRouteAccess(context, env, workspace);
  if (!access.viewer.authenticated) {
    return context.json(
      {
        error: "Authentication is required.",
      },
      401,
    );
  }

  if (!hasWorkspaceCapability(access.viewer, "roadmap.write")) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" requires roadmap.write capability for this mutation.`,
      },
      403,
    );
  }

  const body = roadmapItemCreateSchema.parse(await context.req.json());
  const project = body.projectSlug
    ? await resolveWorkspaceProjectBySlug(env, workspace.id, body.projectSlug)
    : null;
  if (body.projectSlug && !project) {
    return context.json(
      {
        error: `Project "${body.projectSlug}" was not found in workspace "${workspaceSlug}".`,
      },
      404,
    );
  }

  const placement = await resolveRoadmapPlacement(env, {
    workspaceId: workspace.id,
    projectId: project?.id ?? null,
    columnSlug: body.columnSlug,
    status: body.status ?? null,
  });
  if ("error" in placement) {
    return context.json(
      {
        error: placement.error ?? "Invalid roadmap placement.",
      },
      400,
    );
  }

  const assignee = body.assigneeHandle
    ? await resolveWorkspaceIdentityByHandle(
        env,
        workspace.id,
        body.assigneeHandle,
      )
    : null;
  if (body.assigneeHandle && !assignee) {
    return context.json(
      {
        error: `Identity "${body.assigneeHandle}" was not found in workspace "${workspaceSlug}".`,
      },
      404,
    );
  }

  const metadata = buildRoadmapItemMetadata(
    undefined,
    body.metadata,
    body.studySlug,
  );
  const itemId = `item_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO roadmap_items (
      id,
      workspace_id,
      project_id,
      column_id,
      assignee_identity_id,
      title,
      summary,
      kind,
      status,
      metadata_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      itemId,
      workspace.id,
      project?.id ?? null,
      placement.column.id,
      assignee?.id ?? null,
      body.title,
      body.summary,
      body.kind,
      placement.status,
      JSON.stringify(metadata),
      now,
      now,
    )
    .run();

  const item = await queryWorkspaceRoadmapItemById(env, workspace.id, itemId);
  if (!item) {
    return context.json(
      {
        error: "Roadmap item was created but could not be read back.",
      },
      503,
    );
  }

  return context.json(
    {
      ok: true as const,
      item,
    },
    201,
  );
});

app.openapi(workspaceRoadmapUpdateItemRoute, async (context) => {
  const env = getBindings(context);
  const { workspaceSlug, itemId } = context.req.valid("param");

  if (!env.DB) {
    return context.json(
      {
        error: "D1 binding is required for roadmap mutations.",
      },
      503,
    );
  }

  const workspace = await queryWorkspaceSummaryBySlug(env, workspaceSlug);
  if (!workspace) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" was not found.`,
      },
      404,
    );
  }

  const { access } = await resolveWorkspaceRouteAccess(context, env, workspace);
  if (!access.viewer.authenticated) {
    return context.json(
      {
        error: "Authentication is required.",
      },
      401,
    );
  }

  if (!hasWorkspaceCapability(access.viewer, "roadmap.write")) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" requires roadmap.write capability for this mutation.`,
      },
      403,
    );
  }

  const existingItem = await queryWorkspaceRoadmapItemById(
    env,
    workspace.id,
    itemId,
  );
  if (!existingItem) {
    return context.json(
      {
        error: `Roadmap item "${itemId}" was not found in workspace "${workspaceSlug}".`,
      },
      404,
    );
  }

  const body = roadmapItemUpdateSchema.parse(await context.req.json());
  if (
    body.columnSlug === undefined &&
    body.title === undefined &&
    body.summary === undefined &&
    body.kind === undefined &&
    body.status === undefined &&
    body.assigneeHandle === undefined &&
    body.studySlug === undefined &&
    body.metadata === undefined
  ) {
    return context.json(
      {
        error: "At least one roadmap field must be provided for update.",
      },
      400,
    );
  }

  const placement =
    body.columnSlug !== undefined || body.status !== undefined
      ? await resolveRoadmapPlacement(env, {
          workspaceId: workspace.id,
          projectId: existingItem.projectId,
          columnSlug: body.columnSlug ?? undefined,
          status: body.status ?? undefined,
        })
      : {
          column: {
            id: existingItem.columnId,
            slug: existingItem.columnSlug,
            title: existingItem.columnTitle,
          },
          status: existingItem.status as z.infer<
            typeof roadmapItemStatusSchema
          >,
        };

  if ("error" in placement) {
    return context.json(
      {
        error: placement.error ?? "Invalid roadmap placement.",
      },
      400,
    );
  }

  const assignee =
    body.assigneeHandle === undefined
      ? {
          id: existingItem.assigneeIdentityId,
        }
      : body.assigneeHandle === null
        ? { id: null }
        : await resolveWorkspaceIdentityByHandle(
            env,
            workspace.id,
            body.assigneeHandle,
          );

  if (
    body.assigneeHandle !== undefined &&
    body.assigneeHandle !== null &&
    !assignee
  ) {
    return context.json(
      {
        error: `Identity "${body.assigneeHandle}" was not found in workspace "${workspaceSlug}".`,
      },
      404,
    );
  }

  const metadata = buildRoadmapItemMetadata(
    existingItem.metadata,
    body.metadata,
    body.studySlug,
  );
  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE roadmap_items
    SET column_id = ?,
        assignee_identity_id = ?,
        title = ?,
        summary = ?,
        kind = ?,
        status = ?,
        metadata_json = ?,
        updated_at = ?
    WHERE id = ? AND workspace_id = ?`,
  )
    .bind(
      placement.column.id,
      assignee?.id ?? null,
      body.title ?? existingItem.title,
      body.summary ?? existingItem.summary,
      body.kind ?? existingItem.kind,
      placement.status,
      JSON.stringify(metadata),
      now,
      itemId,
      workspace.id,
    )
    .run();

  const item = await queryWorkspaceRoadmapItemById(env, workspace.id, itemId);
  if (!item) {
    return context.json(
      {
        error: "Roadmap item was updated but could not be read back.",
      },
      503,
    );
  }

  return context.json(
    {
      ok: true as const,
      item,
    },
    200,
  );
});

app.openapi(workspaceRoadmapCreateDependencyRoute, async (context) => {
  const env = getBindings(context);
  const { workspaceSlug } = context.req.valid("param");

  if (!env.DB) {
    return context.json(
      {
        error: "D1 binding is required for roadmap mutations.",
      },
      503,
    );
  }

  const workspace = await queryWorkspaceSummaryBySlug(env, workspaceSlug);
  if (!workspace) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" was not found.`,
      },
      404,
    );
  }

  const { access } = await resolveWorkspaceRouteAccess(context, env, workspace);
  if (!access.viewer.authenticated) {
    return context.json(
      {
        error: "Authentication is required.",
      },
      401,
    );
  }

  if (!hasWorkspaceCapability(access.viewer, "roadmap.write")) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" requires roadmap.write capability for this mutation.`,
      },
      403,
    );
  }

  const body = roadmapDependencyCreateSchema.parse(await context.req.json());
  if (body.fromItemId === body.toItemId) {
    return context.json(
      {
        error: "Roadmap dependencies must connect two distinct items.",
      },
      400,
    );
  }

  const [fromItem, toItem] = await Promise.all([
    queryWorkspaceRoadmapItemById(env, workspace.id, body.fromItemId),
    queryWorkspaceRoadmapItemById(env, workspace.id, body.toItemId),
  ]);

  if (!fromItem || !toItem) {
    return context.json(
      {
        error:
          "Both roadmap items must exist in the target workspace before creating a dependency.",
      },
      404,
    );
  }

  const existingDependency = await queryWorkspaceRoadmapDependencyByEdge(
    env,
    workspace.id,
    body.fromItemId,
    body.toItemId,
  );
  if (existingDependency) {
    return context.json(
      {
        error: "This roadmap dependency already exists.",
      },
      409,
    );
  }

  const existingDependencies = await queryWorkspaceRoadmapDependencies(
    env,
    workspace.id,
  );
  if (
    wouldIntroduceRoadmapCycle(
      existingDependencies,
      body.fromItemId,
      body.toItemId,
    )
  ) {
    return context.json(
      {
        error:
          "This roadmap dependency would introduce a cycle. Remove the conflicting edge first.",
      },
      409,
    );
  }

  const dependencyId = `dep_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO roadmap_dependencies (
      id,
      from_item_id,
      to_item_id,
      created_at
    ) VALUES (?, ?, ?, ?)`,
  )
    .bind(dependencyId, body.fromItemId, body.toItemId, now)
    .run();

  const dependency = await queryWorkspaceRoadmapDependencyById(
    env,
    workspace.id,
    dependencyId,
  );
  if (!dependency) {
    return context.json(
      {
        error: "Roadmap dependency was created but could not be read back.",
      },
      503,
    );
  }

  return context.json(
    {
      ok: true as const,
      dependency,
    },
    201,
  );
});

app.openapi(workspaceRoadmapDeleteDependencyRoute, async (context) => {
  const env = getBindings(context);
  const { workspaceSlug, dependencyId } = context.req.valid("param");

  if (!env.DB) {
    return context.json(
      {
        error: "D1 binding is required for roadmap mutations.",
      },
      503,
    );
  }

  const workspace = await queryWorkspaceSummaryBySlug(env, workspaceSlug);
  if (!workspace) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" was not found.`,
      },
      404,
    );
  }

  const { access } = await resolveWorkspaceRouteAccess(context, env, workspace);
  if (!access.viewer.authenticated) {
    return context.json(
      {
        error: "Authentication is required.",
      },
      401,
    );
  }

  if (!hasWorkspaceCapability(access.viewer, "roadmap.write")) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" requires roadmap.write capability for this mutation.`,
      },
      403,
    );
  }

  const dependency = await queryWorkspaceRoadmapDependencyById(
    env,
    workspace.id,
    dependencyId,
  );
  if (!dependency) {
    return context.json(
      {
        error: `Roadmap dependency "${dependencyId}" was not found in workspace "${workspaceSlug}".`,
      },
      404,
    );
  }

  await env.DB.prepare("DELETE FROM roadmap_dependencies WHERE id = ?")
    .bind(dependencyId)
    .run();

  return context.json(
    {
      ok: true as const,
      deletedDependencyId: dependencyId,
    },
    200,
  );
});

app.openapi(workspaceStudyPublishRoute, async (context) => {
  const env = getBindings(context);
  const { workspaceSlug, studySlug } = context.req.valid("param");

  if (!env.DB) {
    return context.json(
      {
        error: "Study publishing requires a configured D1 binding.",
      },
      503,
    );
  }

  const workspace = await queryWorkspaceSummaryBySlug(env, workspaceSlug);
  if (!workspace) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" was not found.`,
      },
      404,
    );
  }

  const { access } = await resolveWorkspaceRouteAccess(context, env, workspace);
  if (!access.viewer.authenticated) {
    return context.json(
      {
        error: "Authentication is required.",
      },
      401,
    );
  }

  if (!hasWorkspaceCapability(access.viewer, "study.publish")) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" requires study.publish capability for this mutation.`,
      },
      403,
    );
  }

  const body = studyPublishSchema.parse(
    context.req.header("content-type")?.includes("application/json")
      ? await context.req.json()
      : {},
  );

  const study = await queryWorkspaceStudyBySlug(env, workspace.id, studySlug);
  if (!study) {
    return context.json(
      {
        error: `Study "${studySlug}" was not found in workspace "${workspaceSlug}".`,
      },
      404,
    );
  }

  if (study.status === "archived") {
    return context.json(
      {
        error:
          "Archived studies cannot be published. Restore the study to draft first.",
      },
      409,
    );
  }

  const publicationId = `pub_${crypto.randomUUID()}`;
  const nextVersion = study.latestVersion + 1;
  const publishedAt = new Date().toISOString();
  const protocolSnapshot = JSON.stringify({
    ...parseJsonObject(study.protocolJson),
    publishedVersion: nextVersion,
    publishedAt,
  });

  await env.DB.prepare(
    `INSERT INTO study_publications (
      id,
      study_id,
      version,
      changelog,
      protocol_snapshot_json,
      published_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      publicationId,
      study.id,
      nextVersion,
      body.changelog ?? null,
      protocolSnapshot,
      publishedAt,
    )
    .run();

  await env.DB.prepare(
    `UPDATE studies
    SET status = 'published',
        updated_at = ?
    WHERE id = ? AND workspace_id = ?`,
  )
    .bind(publishedAt, study.id, workspace.id)
    .run();

  const updatedStudy = await queryWorkspaceStudyBySlug(
    env,
    workspace.id,
    studySlug,
  );
  if (!updatedStudy) {
    return context.json(
      {
        error: "Study was published but could not be read back.",
      },
      503,
    );
  }

  return context.json(
    {
      ok: true as const,
      study: updatedStudy,
      publication: {
        id: publicationId,
        studyId: study.id,
        version: nextVersion,
        changelog: body.changelog ?? null,
        publishedAt,
      },
    },
    201,
  );
});

app.openapi(workspaceStudyCreateOpportunityRoute, async (context) => {
  const env = getBindings(context);
  const { workspaceSlug, studySlug } = context.req.valid("param");

  if (!env.DB) {
    return context.json(
      {
        error: "Opportunity mutations require a configured D1 binding.",
      },
      503,
    );
  }

  const workspace = await queryWorkspaceSummaryBySlug(env, workspaceSlug);
  if (!workspace) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" was not found.`,
      },
      404,
    );
  }

  const { access } = await resolveWorkspaceRouteAccess(context, env, workspace);
  if (!access.viewer.authenticated) {
    return context.json({ error: "Authentication is required." }, 401);
  }

  if (!hasWorkspaceCapability(access.viewer, "opportunity.manage")) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" requires opportunity.manage capability for this mutation.`,
      },
      403,
    );
  }

  const study = await queryWorkspaceStudyBySlug(env, workspace.id, studySlug);
  if (!study) {
    return context.json(
      {
        error: `Study "${studySlug}" was not found in workspace "${workspaceSlug}".`,
      },
      404,
    );
  }

  const body = opportunityMutationSchema.parse(await context.req.json());
  if (!body.targetKind) {
    return context.json(
      {
        error: "Opportunity creation requires a targetKind.",
      },
      400,
    );
  }

  const opportunityId = `opp_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO participation_opportunities (
      id,
      study_id,
      target_kind,
      status,
      eligibility_json,
      instructions_md,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      opportunityId,
      study.id,
      body.targetKind,
      body.status ?? "open",
      JSON.stringify(body.eligibility ?? {}),
      body.instructionsMd ?? null,
      now,
      now,
    )
    .run();

  const opportunity = await queryWorkspaceOpportunityById(
    env,
    workspace.id,
    study.id,
    opportunityId,
  );
  if (!opportunity) {
    return context.json(
      {
        error: "Opportunity was created but could not be read back.",
      },
      503,
    );
  }

  return context.json(
    {
      ok: true as const,
      opportunity,
    },
    201,
  );
});

app.openapi(workspaceStudyUpdateOpportunityRoute, async (context) => {
  const env = getBindings(context);
  const { workspaceSlug, studySlug, opportunityId } =
    context.req.valid("param");

  if (!env.DB) {
    return context.json(
      {
        error: "Opportunity mutations require a configured D1 binding.",
      },
      503,
    );
  }

  const workspace = await queryWorkspaceSummaryBySlug(env, workspaceSlug);
  if (!workspace) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" was not found.`,
      },
      404,
    );
  }

  const { access } = await resolveWorkspaceRouteAccess(context, env, workspace);
  if (!access.viewer.authenticated) {
    return context.json({ error: "Authentication is required." }, 401);
  }

  if (!hasWorkspaceCapability(access.viewer, "opportunity.manage")) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" requires opportunity.manage capability for this mutation.`,
      },
      403,
    );
  }

  const study = await queryWorkspaceStudyBySlug(env, workspace.id, studySlug);
  if (!study) {
    return context.json(
      {
        error: `Study "${studySlug}" was not found in workspace "${workspaceSlug}".`,
      },
      404,
    );
  }

  const existingOpportunity = await queryWorkspaceOpportunityById(
    env,
    workspace.id,
    study.id,
    opportunityId,
  );
  if (!existingOpportunity) {
    return context.json(
      {
        error: `Opportunity "${opportunityId}" was not found for study "${studySlug}".`,
      },
      404,
    );
  }

  const body = opportunityMutationSchema.parse(await context.req.json());
  if (
    body.targetKind === undefined &&
    body.status === undefined &&
    body.instructionsMd === undefined &&
    body.eligibility === undefined
  ) {
    return context.json(
      {
        error: "At least one opportunity field must be provided for update.",
      },
      400,
    );
  }

  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE participation_opportunities
    SET target_kind = ?,
        status = ?,
        eligibility_json = CASE
          WHEN ? = 1 THEN ?
          ELSE eligibility_json
        END,
        instructions_md = ?,
        updated_at = ?
    WHERE id = ? AND study_id = ?`,
  )
    .bind(
      body.targetKind ?? existingOpportunity.targetKind,
      body.status ?? existingOpportunity.status,
      body.eligibility !== undefined ? 1 : 0,
      JSON.stringify(body.eligibility ?? {}),
      body.instructionsMd ?? existingOpportunity.instructionsMd ?? null,
      now,
      opportunityId,
      study.id,
    )
    .run();

  const opportunity = await queryWorkspaceOpportunityById(
    env,
    workspace.id,
    study.id,
    opportunityId,
  );
  if (!opportunity) {
    return context.json(
      {
        error: "Opportunity was updated but could not be read back.",
      },
      503,
    );
  }

  return context.json(
    {
      ok: true as const,
      opportunity,
    },
    200,
  );
});

app.openapi(workspaceStudyRunsRoute, async (context) => {
  const env = getBindings(context);
  const { workspaceSlug, studySlug } = context.req.valid("param");

  if (!env.DB) {
    return context.json(
      {
        error: "Study runs require a configured D1 binding.",
      },
      503,
    );
  }

  const workspace = await queryWorkspaceSummaryBySlug(env, workspaceSlug);
  if (!workspace) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" was not found.`,
      },
      404,
    );
  }

  const { access } = await resolveWorkspaceRouteAccess(context, env, workspace);
  if (!access.viewer.authenticated) {
    return context.json({ error: "Authentication is required." }, 401);
  }

  if (!hasWorkspaceCapability(access.viewer, "study.read")) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" requires study.read capability for this route.`,
      },
      403,
    );
  }

  const study = await queryWorkspaceStudyBySlug(env, workspace.id, studySlug);
  if (!study) {
    return context.json(
      {
        error: `Study "${studySlug}" was not found in workspace "${workspaceSlug}".`,
      },
      404,
    );
  }

  const runs = await queryWorkspaceStudyRuns(env, workspace.id, study.id);

  return context.json(
    {
      generatedAt: new Date().toISOString(),
      workspace,
      access,
      study,
      runs,
    },
    200,
  );
});

app.openapi(workspaceStudyIngestRunRoute, async (context) => {
  const env = getBindings(context);
  const { workspaceSlug, studySlug } = context.req.valid("param");

  if (!env.DB) {
    return context.json(
      {
        error: "Study run ingestion requires a configured D1 binding.",
      },
      503,
    );
  }

  const workspace = await queryWorkspaceSummaryBySlug(env, workspaceSlug);
  if (!workspace) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" was not found.`,
      },
      404,
    );
  }

  const { actor, access } = await resolveWorkspaceRouteAccess(
    context,
    env,
    workspace,
  );
  if (!access.viewer.authenticated) {
    return context.json({ error: "Authentication is required." }, 401);
  }

  if (!hasWorkspaceCapability(access.viewer, "result.write")) {
    return context.json(
      {
        error: `Workspace "${workspaceSlug}" requires result.write capability for this mutation.`,
      },
      403,
    );
  }

  const study = await queryWorkspaceStudyBySlug(env, workspace.id, studySlug);
  if (!study) {
    return context.json(
      {
        error: `Study "${studySlug}" was not found in workspace "${workspaceSlug}".`,
      },
      404,
    );
  }

  const body = studyRunIngestionSchema.parse(
    context.req.header("content-type")?.includes("application/json")
      ? await context.req.json()
      : {},
  );
  const runId = `run_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  const completedAt =
    body.completedAt === undefined
      ? body.status === "completed" || body.status === "failed"
        ? createdAt
        : null
      : body.completedAt;

  await env.DB.prepare(
    `INSERT INTO study_runs (
      id,
      workspace_id,
      project_id,
      study_id,
      actor_identity_id,
      participant_kind,
      status,
      event_count,
      summary_json,
      created_at,
      completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      runId,
      workspace.id,
      study.projectId,
      study.id,
      actor.authenticated ? (actor.workspaceIdentity?.id ?? null) : null,
      actor.authenticated ? actor.actorKind : "human",
      body.status,
      body.eventCount ?? 0,
      JSON.stringify(body.summary ?? {}),
      createdAt,
      completedAt,
    )
    .run();

  const createdRun = await queryWorkspaceStudyRunById(
    env,
    workspace.id,
    study.id,
    runId,
  );
  if (!createdRun) {
    return context.json(
      {
        error: "Study run was created but could not be read back.",
      },
      503,
    );
  }

  return context.json(
    {
      ok: true as const,
      run: createdRun,
    },
    201,
  );
});

app.openapi(studiesRoute, async (context) => {
  const env = getBindings(context);

  if (!env.DB) {
    return context.json(
      {
        studies: [],
        source: "bootstrap",
        warning: "D1 binding not configured yet.",
      },
      200,
    );
  }

  const rows = await env.DB.prepare(
    "SELECT id, slug, title, summary, status, research_type AS researchType, created_at AS createdAt FROM studies ORDER BY created_at DESC LIMIT 25",
  ).all<{
    id: string;
    slug: string;
    title: string;
    summary: string;
    status: StudyStatus;
    researchType: string;
    createdAt: string;
  }>();

  return context.json(
    {
      studies: rows.results,
    },
    200,
  );
});

app.openapi(opportunitiesRoute, async (context) => {
  const env = getBindings(context);

  if (!env.DB) {
    return context.json(
      {
        opportunities: [],
        source: "bootstrap",
        warning: "D1 binding not configured yet.",
      },
      200,
    );
  }

  const rows = await env.DB.prepare(
    "SELECT id, study_id AS studyId, target_kind AS targetKind, status, created_at AS createdAt FROM participation_opportunities ORDER BY created_at DESC LIMIT 25",
  ).all<{
    id: string;
    studyId: string;
    targetKind: string;
    status: OpportunityStatus;
    createdAt: string;
  }>();

  return context.json(
    {
      opportunities: rows.results,
    },
    200,
  );
});

export default app;
