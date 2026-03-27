import {
  queryMembershipsForUser,
  queryWorkspaceIdentityForUser,
} from "./actors";
import { findValidSession, listActiveSessionsForUser } from "./sessions";
import type {
  ActorContext,
  AnonymousActorContext,
  Bindings,
  SessionActorContext,
} from "./types";

const buildAnonymousActorContext = (): AnonymousActorContext => ({
  authenticated: false,
  authMethod: null,
  actorKind: null,
  user: null,
  session: null,
  workspaceMemberships: [],
  currentWorkspaceMembership: null,
  workspaceIdentity: null,
});

type ResolveActorContextOptions = {
  sessionToken?: string | null;
  workspaceSlug?: string;
  userAgent?: string | null;
};

export const resolveActorContext = async (
  env: Bindings,
  options: ResolveActorContextOptions,
): Promise<ActorContext> => {
  const { sessionToken, workspaceSlug, userAgent } = options;

  if (!env.DB || !sessionToken) {
    return buildAnonymousActorContext();
  }

  const session = await findValidSession(env, sessionToken, userAgent);
  if (!session) {
    return buildAnonymousActorContext();
  }

  const workspaceMemberships = await queryMembershipsForUser(
    env,
    session.userId,
  );
  const currentWorkspaceMembership =
    workspaceSlug === undefined
      ? (workspaceMemberships[0] ?? null)
      : (workspaceMemberships.find(
          (membership) => membership.workspaceSlug === workspaceSlug,
        ) ?? null);
  const workspaceIdentity = currentWorkspaceMembership
    ? await queryWorkspaceIdentityForUser(
        env,
        currentWorkspaceMembership.workspaceId,
        session.userId,
      )
    : null;

  return {
    authenticated: true,
    authMethod: "session",
    actorKind: "human",
    session,
    user: {
      id: session.userId,
      handle: session.handle,
      displayName: session.displayName,
      primaryEmail: session.primaryEmail,
      avatarUrl: session.avatarUrl,
      status: session.status,
      createdAt: session.createdAt,
    },
    workspaceMemberships,
    currentWorkspaceMembership,
    workspaceIdentity,
  } satisfies SessionActorContext;
};

export const resolveAuthenticatedSessionActor = async (
  env: Bindings,
  options: ResolveActorContextOptions,
) => {
  const actor = await resolveActorContext(env, options);
  return actor.authenticated && actor.authMethod === "session" ? actor : null;
};

export const buildAuthSessionResponse = async (
  env: Bindings,
  sessionToken: string | null | undefined,
  workspaceSlug?: string,
  userAgent?: string | null,
) => {
  const actor = await resolveActorContext(env, {
    sessionToken,
    workspaceSlug,
    userAgent,
  });

  if (!actor.authenticated) {
    return {
      authenticated: false,
      user: null,
      workspaceMemberships: [],
      currentWorkspaceMembership: null,
      workspaceIdentity: null,
      expiresAt: null,
    };
  }

  return {
    authenticated: true,
    user: actor.user,
    workspaceMemberships: actor.workspaceMemberships,
    currentWorkspaceMembership: actor.currentWorkspaceMembership,
    workspaceIdentity: actor.workspaceIdentity,
    expiresAt: actor.session.expiresAt,
  };
};

export const buildAuthSessionInventoryResponse = async (
  env: Bindings,
  actor: SessionActorContext | null,
  sessionToken: string | null | undefined,
) => {
  if (!env.DB || !actor) {
    return {
      authenticated: false,
      sessions: [],
    };
  }

  return {
    authenticated: true,
    sessions: await listActiveSessionsForUser(env, actor.user.id, sessionToken),
  };
};
