import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  type OpportunityStatus,
  type StudyStatus,
  actorKindSchema,
  bootstrapGaps,
  bootstrapRoadmap,
  experimentNodeTypeSchema,
  metaProcess,
  operatingGuide,
  platformPrinciples,
  psyosDecisions,
  psyosNorthStar,
} from "@psyos/contracts";

type D1StatementResult<T> = Promise<{ results: T[] }>;

type D1PreparedStatement = {
  all<T = Record<string, unknown>>(): D1StatementResult<T>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  bind(...values: unknown[]): D1PreparedStatement;
};

type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatement;
};

type Bindings = {
  APP_NAME?: string;
  DB?: D1DatabaseLike;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();
const getBindings = (context: { env?: Bindings }): Bindings =>
  context.env ?? {};

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
    deployment: z.object({
      frontend: z.string().url(),
      backend: z.string().url(),
      model: z.string(),
    }),
    auth: z.object({
      agentAuth: z.string(),
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
      gaps: z.string(),
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
    gaps: z.array(z.string()),
  })
  .openapi("GapResponse");

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

const buildMaintenanceSystemResponse = () => ({
  name: "PsyOS API",
  version: "0.1.0",
  northStar: psyosNorthStar,
  deployment: {
    frontend: "https://psyos.org",
    backend: "https://api.psyos.org",
    model: "Hosted platform with self-deployment support",
  },
  auth: {
    agentAuth: "API keys",
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
    gaps: "/api/v1/maintenance/gaps",
  },
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

app.openapi(maintenanceSystemRoute, (context) => {
  return context.json(buildMaintenanceSystemResponse(), 200);
});

app.openapi(legacySystemRoute, (context) => {
  return context.json(buildMaintenanceSystemResponse(), 200);
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
      gaps: [...bootstrapGaps],
    },
    200,
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
