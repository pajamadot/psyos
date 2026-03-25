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

export const platformPrinciples = [
  "Research protocols must be explicit enough for agents to reason about them.",
  "Public study pages should resolve to the latest published state without hiding internal version history.",
  "Human and agent identities should be first-class, but never conflated silently.",
  "Workspace and project plans should be visible as DAG and kanban state.",
  "API-key-first automation should be available from the start.",
  "Self-hosting must be documented as a product capability.",
] as const;

export type ActorKind = z.infer<typeof actorKindSchema>;
export type StudyStatus = z.infer<typeof studyStatusSchema>;
export type OpportunityStatus = z.infer<typeof opportunityStatusSchema>;
export type ExperimentNodeType = z.infer<typeof experimentNodeTypeSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Identity = z.infer<typeof identitySchema>;
export type Study = z.infer<typeof studySchema>;
export type ParticipationOpportunity = z.infer<
  typeof participationOpportunitySchema
>;
export type ApiKey = z.infer<typeof apiKeySchema>;
export type RoadmapItem = z.infer<typeof roadmapItemSchema>;
export type AssetRecord = z.infer<typeof assetRecordSchema>;
