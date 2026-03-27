import type {
  ActorContext,
  WorkspaceAccess,
  WorkspaceCapability,
  WorkspaceMembershipRecord,
  WorkspaceRecord,
  WorkspaceViewer,
} from "./types";

const workspaceRoleCapabilities: Record<
  WorkspaceMembershipRecord["role"],
  WorkspaceCapability[]
> = {
  owner: [
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
  admin: [
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
  researcher: [
    "workspace.read",
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
  viewer: [
    "workspace.read",
    "roadmap.read",
    "asset.read",
    "study.read",
    "opportunity.read",
  ],
};

const buildAnonymousViewer = (): WorkspaceViewer => ({
  authenticated: false,
  actorKind: null,
  authMethod: null,
  workspaceRole: null,
  workspaceIdentityHandle: null,
  capabilities: [],
});

const resolveWorkspaceMembership = (
  actor: ActorContext,
  workspaceSlug: string,
) => {
  if (!actor.authenticated) {
    return null;
  }

  return (
    actor.workspaceMemberships.find(
      (membership) =>
        membership.workspaceSlug === workspaceSlug &&
        membership.status === "active",
    ) ?? null
  );
};

export const buildWorkspaceViewer = (
  actor: ActorContext,
  workspaceSlug: string,
): WorkspaceViewer => {
  if (!actor.authenticated) {
    return buildAnonymousViewer();
  }

  const membership = resolveWorkspaceMembership(actor, workspaceSlug);
  const capabilities = membership
    ? [...workspaceRoleCapabilities[membership.role]]
    : [];
  const identityMatchesWorkspace =
    membership &&
    actor.workspaceIdentity?.workspaceId === membership.workspaceId;

  return {
    authenticated: true,
    actorKind: actor.actorKind,
    authMethod: actor.authMethod,
    workspaceRole: membership?.role ?? null,
    workspaceIdentityHandle: identityMatchesWorkspace
      ? (actor.workspaceIdentity?.handle ?? null)
      : null,
    capabilities,
  };
};

export const buildWorkspaceAccess = (
  actor: ActorContext,
  workspace: Pick<WorkspaceRecord, "slug" | "visibility">,
): WorkspaceAccess => ({
  mode: workspace.visibility === "public" ? "public_read" : "workspace_member",
  viewer: buildWorkspaceViewer(actor, workspace.slug),
});

export const hasWorkspaceCapability = (
  viewer: WorkspaceViewer,
  capability: WorkspaceCapability,
) => viewer.capabilities.includes(capability);

export const canReadWorkspace = (
  actor: ActorContext,
  workspace: Pick<WorkspaceRecord, "slug" | "visibility">,
) => {
  if (workspace.visibility === "public") {
    return true;
  }

  return hasWorkspaceCapability(
    buildWorkspaceViewer(actor, workspace.slug),
    "workspace.read",
  );
};
