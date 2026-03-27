import { z } from "zod";

export const actorKindSchema = z.enum(["human", "agent"]);
export const studyStatusSchema = z.enum(["draft", "published", "archived"]);
export const opportunityTargetKindSchema = z.enum(["human", "agent", "mixed"]);
export const opportunityStatusSchema = z.enum(["open", "paused", "closed"]);
export const enrollmentStatusSchema = z.enum([
  "requested",
  "accepted",
  "rejected",
  "completed",
]);
export const apiKeyStatusSchema = z.enum(["active", "revoked"]);
export const userStatusSchema = z.enum(["active", "invited", "disabled"]);
export const workspaceMembershipRoleSchema = z.enum([
  "owner",
  "admin",
  "researcher",
  "viewer",
]);
export const workspaceMembershipStatusSchema = z.enum([
  "active",
  "invited",
  "suspended",
]);
export const workspaceVisibilitySchema = z.enum(["public", "private"]);
export const authMethodSchema = z.enum(["session", "api_key"]);
export const workspaceCapabilitySchema = z.enum([
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
]);
export const routeAccessModeSchema = z.enum([
  "public_read",
  "workspace_member",
]);
export const authProviderStateSchema = z.enum([
  "enabled",
  "planned",
  "disabled",
]);
export const roadmapItemStatusSchema = z.enum([
  "backlog",
  "ready",
  "in_progress",
  "blocked",
  "done",
]);
export const roadmapItemKindSchema = z.enum([
  "infrastructure",
  "platform",
  "product",
  "operations",
  "governance",
]);
export const experimentNodeTypeSchema = z.enum([
  "procedure",
  "block",
  "sequence",
  "trial",
  "stimulus",
  "response_capture",
  "branch",
  "loop",
  "survey_question",
  "instruction",
  "feedback",
  "replay_marker",
]);
export const assetKindSchema = z.enum([
  "stimulus",
  "artifact",
  "log",
  "bundle",
  "replay",
]);

export const workspaceSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  visibility: workspaceVisibilitySchema,
  createdAt: z.string().min(1),
});

export const projectSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  projectType: z.string().min(1),
  createdAt: z.string().min(1),
});

export const identitySchema = z.object({
  id: z.string().min(1),
  kind: actorKindSchema,
  workspaceId: z.string().min(1).optional(),
  handle: z.string().min(1),
  displayName: z.string().min(1),
  bio: z.string().nullable().optional(),
  createdAt: z.string().min(1),
});

export const studySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: studyStatusSchema,
  researchType: z.string().min(1),
  leadIdentityId: z.string().min(1),
  createdAt: z.string().min(1),
});

export const participationOpportunitySchema = z.object({
  id: z.string().min(1),
  studyId: z.string().min(1),
  targetKind: opportunityTargetKindSchema,
  status: opportunityStatusSchema,
  createdAt: z.string().min(1),
});

export const studyRunStatusSchema = z.enum([
  "started",
  "completed",
  "failed",
  "abandoned",
]);

export const studyRunSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  projectSlug: z.string().min(1),
  studyId: z.string().min(1),
  studySlug: z.string().min(1),
  actorIdentityId: z.string().min(1).nullable().optional(),
  actorHandle: z.string().nullable().optional(),
  participantKind: actorKindSchema,
  status: studyRunStatusSchema,
  eventCount: z.number().int().nonnegative(),
  summary: z.record(z.string(), z.unknown()),
  createdAt: z.string().min(1),
  completedAt: z.string().nullable().optional(),
});

export const apiKeySchema = z.object({
  id: z.string().min(1),
  identityId: z.string().min(1),
  label: z.string().min(1),
  prefix: z.string().min(1),
  status: apiKeyStatusSchema,
  createdAt: z.string().min(1),
});

export const roadmapItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: roadmapItemStatusSchema,
  kind: roadmapItemKindSchema,
  summary: z.string().min(1),
});

export const assetRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  projectId: z.string().min(1).nullable().optional(),
  kind: assetKindSchema,
  contentHash: z.string().min(1),
  mediaType: z.string().min(1),
  createdAt: z.string().min(1),
});

export const assetManifestEntrySchema = assetRecordSchema.extend({
  storageKey: z.string().min(1),
  byteSize: z.number().int().nonnegative().nullable().optional(),
  ownerIdentityId: z.string().min(1).nullable().optional(),
  workspaceSlug: z.string().min(1),
  projectSlug: z.string().nullable().optional(),
  studySlug: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  tags: z.array(z.string()),
});

export const assetManifestSchema = z.object({
  generatedAt: z.string().min(1),
  assets: z.array(assetManifestEntrySchema),
  source: z.string().optional(),
  warning: z.string().optional(),
});

export const workspaceSummarySchema = workspaceSchema.extend({
  projectCount: z.number().int().nonnegative(),
  studyCount: z.number().int().nonnegative(),
  identityCount: z.number().int().nonnegative(),
  openOpportunityCount: z.number().int().nonnegative(),
});

export const workspaceViewerSchema = z.object({
  authenticated: z.boolean(),
  actorKind: actorKindSchema.nullable(),
  authMethod: authMethodSchema.nullable(),
  workspaceRole: workspaceMembershipRoleSchema.nullable(),
  workspaceIdentityHandle: z.string().nullable().optional(),
  capabilities: z.array(workspaceCapabilitySchema),
});

export const workspaceAccessSchema = z.object({
  mode: routeAccessModeSchema,
  viewer: workspaceViewerSchema,
});

export const projectSummarySchema = projectSchema.extend({
  workspaceSlug: z.string().min(1),
  studySlug: z.string().nullable().optional(),
  studyTitle: z.string().nullable().optional(),
  studyStatus: studyStatusSchema.nullable().optional(),
  latestVersion: z.number().int().nonnegative(),
  openOpportunityCount: z.number().int().nonnegative(),
});

export const workspaceRoadmapColumnSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  projectId: z.string().min(1).nullable().optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  position: z.number().int().nonnegative(),
  description: z.string().nullable().optional(),
});

export const workspaceRoadmapItemSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  projectId: z.string().min(1).nullable().optional(),
  projectSlug: z.string().nullable().optional(),
  columnId: z.string().min(1),
  columnSlug: z.string().min(1),
  columnTitle: z.string().min(1),
  assigneeIdentityId: z.string().nullable().optional(),
  assigneeHandle: z.string().nullable().optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  kind: roadmapItemKindSchema,
  status: roadmapItemStatusSchema,
  studySlug: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const workspaceRoadmapDependencySchema = z.object({
  id: z.string().min(1),
  fromItemId: z.string().min(1),
  toItemId: z.string().min(1),
  createdAt: z.string().min(1),
});

export const opportunitySummarySchema = participationOpportunitySchema.extend({
  studySlug: z.string().min(1),
  studyTitle: z.string().min(1),
  instructionsMd: z.string().nullable().optional(),
});

export const dogfoodStudySchema = studySchema.extend({
  projectSlug: z.string().min(1),
  projectName: z.string().min(1),
  leadHandle: z.string().min(1),
  latestVersion: z.number().int().nonnegative(),
  estimatedDurationMinutes: z.number().int().positive().nullable().optional(),
  packageId: z.string().nullable().optional(),
  nodeTypes: z.array(z.string()),
  measures: z.array(z.string()),
  outputs: z.array(z.string()),
  targetKinds: z.array(opportunityTargetKindSchema),
  openOpportunityCount: z.number().int().nonnegative(),
});

export const roadmapStatusSummarySchema = z.object({
  backlog: z.number().int().nonnegative(),
  ready: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  done: z.number().int().nonnegative(),
});

export const dogfoodOverviewSchema = z.object({
  generatedAt: z.string().min(1),
  workspace: workspaceSummarySchema.nullable(),
  access: workspaceAccessSchema,
  projects: z.array(projectSummarySchema),
  studies: z.array(dogfoodStudySchema),
  opportunities: z.array(opportunitySummarySchema),
  assets: z.array(assetManifestEntrySchema),
  roadmap: roadmapStatusSummarySchema,
  source: z.string().optional(),
  warning: z.string().optional(),
});

export const workspaceSnapshotSchema = dogfoodOverviewSchema;

export const workspaceRoadmapSchema = z.object({
  generatedAt: z.string().min(1),
  workspace: workspaceSummarySchema.nullable(),
  access: workspaceAccessSchema,
  columns: z.array(workspaceRoadmapColumnSchema),
  items: z.array(workspaceRoadmapItemSchema),
  dependencies: z.array(workspaceRoadmapDependencySchema),
  summary: roadmapStatusSummarySchema,
  source: z.string().optional(),
  warning: z.string().optional(),
});

export const workspaceAssetManifestSchema = z.object({
  generatedAt: z.string().min(1),
  workspace: workspaceSummarySchema.nullable(),
  access: workspaceAccessSchema,
  assets: z.array(assetManifestEntrySchema),
  source: z.string().optional(),
  warning: z.string().optional(),
});

export const studyPublicationRecordSchema = z.object({
  id: z.string().min(1),
  studyId: z.string().min(1),
  version: z.number().int().positive(),
  changelog: z.string().nullable().optional(),
  publishedAt: z.string().min(1),
});

export const studyPublishSchema = z.object({
  changelog: z.string().min(1).max(4000).optional(),
});

export const studyPublishResponseSchema = z.object({
  ok: z.literal(true),
  study: dogfoodStudySchema,
  publication: studyPublicationRecordSchema,
});

export const opportunityMutationSchema = z.object({
  targetKind: opportunityTargetKindSchema.optional(),
  status: opportunityStatusSchema.optional(),
  instructionsMd: z.string().min(1).max(6000).nullable().optional(),
  eligibility: z.record(z.string(), z.unknown()).optional(),
});

export const opportunityMutationResponseSchema = z.object({
  ok: z.literal(true),
  opportunity: opportunitySummarySchema,
});

export const studyRunIngestionSchema = z.object({
  status: studyRunStatusSchema.default("completed"),
  eventCount: z.number().int().nonnegative().optional(),
  summary: z.record(z.string(), z.unknown()).optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export const studyRunMutationResponseSchema = z.object({
  ok: z.literal(true),
  run: studyRunSchema,
});

export const studyRunsResponseSchema = z.object({
  generatedAt: z.string().min(1),
  workspace: workspaceSummarySchema.nullable(),
  access: workspaceAccessSchema,
  study: dogfoodStudySchema.nullable(),
  runs: z.array(studyRunSchema),
  source: z.string().optional(),
  warning: z.string().optional(),
});

export const authProviderSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  actorKind: z.union([actorKindSchema, z.literal("mixed")]),
  state: authProviderStateSchema,
  strategy: z.string().min(1),
});

export const authConfigSchema = z.object({
  sessionCookieName: z.string().min(1),
  cookieDomain: z.string().nullable().optional(),
  emailProvider: z.string().min(1),
  integrationEmailHarness: z.string().min(1),
  providers: z.array(authProviderSchema),
});

export const authUserSchema = z.object({
  id: z.string().min(1),
  handle: z.string().nullable().optional(),
  displayName: z.string().min(1),
  primaryEmail: z.string().email(),
  avatarUrl: z.string().url().nullable().optional(),
  status: userStatusSchema,
  createdAt: z.string().min(1),
});

export const authWorkspaceMembershipSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  workspaceSlug: z.string().min(1),
  workspaceName: z.string().min(1),
  role: workspaceMembershipRoleSchema,
  status: workspaceMembershipStatusSchema,
  createdAt: z.string().min(1),
});

export const authWorkspaceIdentitySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  handle: z.string().min(1),
  displayName: z.string().min(1),
  createdAt: z.string().min(1),
});

export const authSessionSchema = z.object({
  authenticated: z.boolean(),
  user: authUserSchema.nullable(),
  workspaceMemberships: z.array(authWorkspaceMembershipSchema),
  currentWorkspaceMembership: authWorkspaceMembershipSchema.nullable(),
  workspaceIdentity: authWorkspaceIdentitySchema.nullable(),
  expiresAt: z.string().nullable().optional(),
});

export const authManagedSessionSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  expiresAt: z.string().min(1),
  lastSeenAt: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  isCurrent: z.boolean(),
});

export const authSessionInventorySchema = z.object({
  authenticated: z.boolean(),
  sessions: z.array(authManagedSessionSchema),
});

export const authSessionRevokeSchema = z.object({
  sessionId: z.string().min(1),
});

export const authSessionRevokeResponseSchema = z.object({
  ok: z.literal(true),
  revokedSessionId: z.string().min(1),
  currentSessionCleared: z.boolean(),
  inventory: authSessionInventorySchema,
});

export const authActivityEventTypeSchema = z.enum([
  "magic_link_requested",
  "magic_link_failed",
  "magic_link_consumed",
  "session_created",
  "session_revoked",
]);

export const authActivityRecordSchema = z.object({
  id: z.string().min(1),
  eventType: authActivityEventTypeSchema,
  createdAt: z.string().min(1),
  workspaceSlug: z.string().nullable().optional(),
  sessionId: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  requestId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()),
});

export const authActivityFeedSchema = z.object({
  authenticated: z.boolean(),
  events: z.array(authActivityRecordSchema),
});

export const authEmailRequestSchema = z.object({
  email: z.string().email(),
  workspaceSlug: z.string().min(1).optional(),
  displayName: z.string().min(1).max(120).optional(),
});

export const authEmailRequestResponseSchema = z.object({
  ok: z.literal(true),
  message: z.string().min(1),
  workspaceSlug: z.string().nullable().optional(),
  expiresAt: z.string().min(1),
  delivery: z.object({
    channel: z.string().min(1),
    status: z.enum(["sent", "preview"]),
    messageId: z.string().nullable().optional(),
    previewUrl: z.string().url().nullable().optional(),
  }),
});

export const authEmailConsumeSchema = z.object({
  token: z.string().min(32),
  workspaceSlug: z.string().min(1).optional(),
});

export const authEmailConsumeResponseSchema = z.object({
  ok: z.literal(true),
  session: authSessionSchema,
});

export const platformPrinciples = [
  "Research protocols must be explicit enough for agents to reason about them.",
  "The workspace should become the canonical research container, while one project maps to one study for now.",
  "Public study pages should resolve to the latest published state without hiding internal version history.",
  "Human and agent identities should be first-class, but never conflated silently.",
  "Workspace and project plans should be visible as DAG and kanban state.",
  "API-key-first automation should be available from the start.",
  "The system should expose runtime metadata, operating guides, and gaps instead of relying on hidden repo lore.",
  "PsyOS should optimize for controllability, observability, and feedback density as an agent-facing control system.",
  "No feature work should start before a GitHub issue exists with the correct color-coded labels.",
  "The platform should improve through real study work, not isolated demos.",
  "Self-improvement should be signal-driven, strategy-bounded, and recorded as auditable evolution events.",
  "Self-hosting must be documented as a product capability.",
] as const;

export type ActorKind = z.infer<typeof actorKindSchema>;
export type StudyStatus = z.infer<typeof studyStatusSchema>;
export type OpportunityStatus = z.infer<typeof opportunityStatusSchema>;
export type ExperimentNodeType = z.infer<typeof experimentNodeTypeSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type WorkspaceSummary = z.infer<typeof workspaceSummarySchema>;
export type WorkspaceViewer = z.infer<typeof workspaceViewerSchema>;
export type WorkspaceAccess = z.infer<typeof workspaceAccessSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type WorkspaceRoadmapColumn = z.infer<
  typeof workspaceRoadmapColumnSchema
>;
export type WorkspaceRoadmapItem = z.infer<typeof workspaceRoadmapItemSchema>;
export type WorkspaceRoadmapDependency = z.infer<
  typeof workspaceRoadmapDependencySchema
>;
export type Identity = z.infer<typeof identitySchema>;
export type Study = z.infer<typeof studySchema>;
export type DogfoodStudy = z.infer<typeof dogfoodStudySchema>;
export type ParticipationOpportunity = z.infer<
  typeof participationOpportunitySchema
>;
export type StudyRunStatus = z.infer<typeof studyRunStatusSchema>;
export type StudyRun = z.infer<typeof studyRunSchema>;
export type OpportunitySummary = z.infer<typeof opportunitySummarySchema>;
export type StudyPublicationRecord = z.infer<
  typeof studyPublicationRecordSchema
>;
export type ApiKey = z.infer<typeof apiKeySchema>;
export type RoadmapItem = z.infer<typeof roadmapItemSchema>;
export type AssetRecord = z.infer<typeof assetRecordSchema>;
export type AssetManifestEntry = z.infer<typeof assetManifestEntrySchema>;
export type AssetManifest = z.infer<typeof assetManifestSchema>;
export type RoadmapStatusSummary = z.infer<typeof roadmapStatusSummarySchema>;
export type DogfoodOverview = z.infer<typeof dogfoodOverviewSchema>;
export type WorkspaceSnapshot = z.infer<typeof workspaceSnapshotSchema>;
export type WorkspaceRoadmap = z.infer<typeof workspaceRoadmapSchema>;
export type WorkspaceAssetManifest = z.infer<
  typeof workspaceAssetManifestSchema
>;
export type AuthProvider = z.infer<typeof authProviderSchema>;
export type AuthConfig = z.infer<typeof authConfigSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthWorkspaceMembership = z.infer<
  typeof authWorkspaceMembershipSchema
>;
export type AuthWorkspaceIdentity = z.infer<typeof authWorkspaceIdentitySchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type AuthManagedSession = z.infer<typeof authManagedSessionSchema>;
export type AuthSessionInventory = z.infer<typeof authSessionInventorySchema>;
export type StudyPublish = z.infer<typeof studyPublishSchema>;
export type StudyPublishResponse = z.infer<typeof studyPublishResponseSchema>;
export type OpportunityMutation = z.infer<typeof opportunityMutationSchema>;
export type OpportunityMutationResponse = z.infer<
  typeof opportunityMutationResponseSchema
>;
export type StudyRunIngestion = z.infer<typeof studyRunIngestionSchema>;
export type StudyRunMutationResponse = z.infer<
  typeof studyRunMutationResponseSchema
>;
export type StudyRunsResponse = z.infer<typeof studyRunsResponseSchema>;
export type AuthEmailRequest = z.infer<typeof authEmailRequestSchema>;
export type AuthEmailRequestResponse = z.infer<
  typeof authEmailRequestResponseSchema
>;
export type AuthEmailConsume = z.infer<typeof authEmailConsumeSchema>;
export type AuthEmailConsumeResponse = z.infer<
  typeof authEmailConsumeResponseSchema
>;
export type AuthSessionRevoke = z.infer<typeof authSessionRevokeSchema>;
export type AuthSessionRevokeResponse = z.infer<
  typeof authSessionRevokeResponseSchema
>;
export type AuthActivityEventType = z.infer<typeof authActivityEventTypeSchema>;
export type AuthActivityRecord = z.infer<typeof authActivityRecordSchema>;
export type AuthActivityFeed = z.infer<typeof authActivityFeedSchema>;
