export type D1StatementResult<T> = Promise<{ results: T[] }>;

export type D1PreparedStatement = {
  all<T = Record<string, unknown>>(): D1StatementResult<T>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
};

export type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatement;
};

export type Bindings = {
  APP_NAME?: string;
  APP_VERSION?: string;
  DEPLOY_ENVIRONMENT?: string;
  DEPLOYED_VIA?: string;
  GIT_COMMIT?: string;
  PUBLIC_API_URL?: string;
  PUBLIC_WEB_URL?: string;
  AUTH_COOKIE_DOMAIN?: string;
  AUTH_EMAIL_PROVIDER?: string;
  AUTH_EMAIL_FROM?: string;
  AUTH_GITHUB_CLIENT_ID?: string;
  AUTH_GOOGLE_CLIENT_ID?: string;
  AUTH_RESEND_API_KEY?: string;
  AUTH_SESSION_TTL_DAYS?: string;
  MAILPIT_HTTP_URL?: string;
  DB?: D1DatabaseLike;
};

export type Variables = {
  requestId: string;
};

export type AuthEventType =
  | "magic_link_requested"
  | "magic_link_failed"
  | "magic_link_consumed"
  | "session_created"
  | "session_revoked";

export type AuthUserRecord = {
  id: string;
  handle: string | null;
  displayName: string;
  avatarUrl: string | null;
  status: "active" | "invited" | "disabled";
  createdAt: string;
  primaryEmail: string;
};

export type ProvisionedUserRecord = AuthUserRecord & {
  normalizedEmail: string;
};

export type SessionRecord = AuthUserRecord & {
  id: string;
  userId: string;
  expiresAt: string;
  lastSeenAt: string | null;
  userAgent: string | null;
};

export type WorkspaceRecord = {
  id: string;
  slug: string;
  name: string;
  visibility: "public" | "private";
};

export type WorkspaceMembershipRecord = {
  id: string;
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  role: "owner" | "admin" | "researcher" | "viewer";
  status: "active" | "invited" | "suspended";
  createdAt: string;
};

export type WorkspaceIdentityRecord = {
  id: string;
  workspaceId: string;
  handle: string;
  displayName: string;
  createdAt: string;
};

export type AuthMethod = "session" | "api_key";

export type WorkspaceCapability =
  | "workspace.read"
  | "workspace.manage"
  | "roadmap.read"
  | "roadmap.write"
  | "asset.read"
  | "asset.write"
  | "study.read"
  | "study.publish"
  | "opportunity.read"
  | "opportunity.manage"
  | "result.write";

export type WorkspaceViewer = {
  authenticated: boolean;
  actorKind: "human" | "agent" | null;
  authMethod: AuthMethod | null;
  workspaceRole: WorkspaceMembershipRecord["role"] | null;
  workspaceIdentityHandle: string | null;
  capabilities: WorkspaceCapability[];
};

export type WorkspaceAccess = {
  mode: "public_read" | "workspace_member";
  viewer: WorkspaceViewer;
};

export type AnonymousActorContext = {
  authenticated: false;
  authMethod: null;
  actorKind: null;
  user: null;
  session: null;
  workspaceMemberships: [];
  currentWorkspaceMembership: null;
  workspaceIdentity: null;
};

export type SessionActorContext = {
  authenticated: true;
  authMethod: "session";
  actorKind: "human";
  user: AuthUserRecord;
  session: SessionRecord;
  workspaceMemberships: WorkspaceMembershipRecord[];
  currentWorkspaceMembership: WorkspaceMembershipRecord | null;
  workspaceIdentity: WorkspaceIdentityRecord | null;
};

export type ActorContext = AnonymousActorContext | SessionActorContext;
