import { deriveDisplayName, getHandleSeed, normalizeEmail } from "./shared";
import type {
  Bindings,
  ProvisionedUserRecord,
  WorkspaceIdentityRecord,
  WorkspaceMembershipRecord,
  WorkspaceRecord,
} from "./types";

type WorkspaceAccessDeps = {
  getWorkspaceBySlug: (
    env: Bindings,
    workspaceSlug: string,
  ) => Promise<WorkspaceRecord | null>;
  getWorkspaceMembershipCount: (
    env: Bindings,
    workspaceId: string,
  ) => Promise<number>;
};

const reserveUniqueHandle = async (
  env: Bindings,
  table: "users" | "identities",
  baseHandle: string,
) => {
  const fallbackBase = getHandleSeed(baseHandle);
  let handle = fallbackBase;
  let suffix = 1;

  while (env.DB) {
    const existing = await env.DB.prepare(
      `SELECT id
      FROM ${table}
      WHERE handle = ?
      LIMIT 1`,
    )
      .bind(handle)
      .first<{ id: string }>();

    if (!existing) {
      return handle;
    }

    suffix += 1;
    handle = `${fallbackBase}-${suffix}`;
  }

  return handle;
};

export const ensureUserForEmail = async (
  env: Bindings,
  email: string,
  displayName?: string,
) => {
  if (!env.DB) return null;

  const normalizedEmail = normalizeEmail(email);
  const existing = await env.DB.prepare(
    `SELECT
      u.id,
      u.handle,
      u.display_name AS displayName,
      u.avatar_url AS avatarUrl,
      u.status,
      u.created_at AS createdAt,
      ue.email AS primaryEmail,
      ue.normalized_email AS normalizedEmail
    FROM user_emails ue
    JOIN users u ON u.id = ue.user_id
    WHERE ue.normalized_email = ?
    LIMIT 1`,
  )
    .bind(normalizedEmail)
    .first<ProvisionedUserRecord>();

  if (existing) {
    return existing;
  }

  const userId = crypto.randomUUID();
  const userHandle = await reserveUniqueHandle(
    env,
    "users",
    normalizedEmail.split("@")[0] ?? "researcher",
  );
  const resolvedDisplayName = deriveDisplayName(normalizedEmail, displayName);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO users (
      id,
      handle,
      display_name,
      status,
      metadata_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, 'active', ?, ?, ?)`,
  )
    .bind(
      userId,
      userHandle,
      resolvedDisplayName,
      JSON.stringify({ source: "email_magic_link" }),
      now,
      now,
    )
    .run();

  await env.DB.prepare(
    `INSERT INTO user_emails (
      id,
      user_id,
      email,
      normalized_email,
      is_primary,
      is_verified,
      created_at
    ) VALUES (?, ?, ?, ?, 1, 0, ?)`,
  )
    .bind(crypto.randomUUID(), userId, normalizedEmail, normalizedEmail, now)
    .run();

  return {
    id: userId,
    handle: userHandle,
    displayName: resolvedDisplayName,
    avatarUrl: null,
    status: "active",
    createdAt: now,
    primaryEmail: normalizedEmail,
    normalizedEmail,
  };
};

export const queryMembershipsForUser = async (
  env: Bindings,
  userId: string,
) => {
  if (!env.DB) return [];

  const rows = await env.DB.prepare(
    `SELECT
      wm.id,
      wm.workspace_id AS workspaceId,
      w.slug AS workspaceSlug,
      w.name AS workspaceName,
      wm.role,
      wm.status,
      wm.created_at AS createdAt
    FROM workspace_memberships wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = ?
    ORDER BY wm.created_at ASC`,
  )
    .bind(userId)
    .all<WorkspaceMembershipRecord>();

  return rows.results.map((row) => ({ ...row }));
};

export const queryWorkspaceIdentityForUser = async (
  env: Bindings,
  workspaceId: string,
  userId: string,
) => {
  if (!env.DB) return null;

  return env.DB.prepare(
    `SELECT
      id,
      workspace_id AS workspaceId,
      handle,
      display_name AS displayName,
      created_at AS createdAt
    FROM identities
    WHERE workspace_id = ?
      AND kind = 'human'
      AND json_extract(metadata_json, '$.userId') = ?
    LIMIT 1`,
  )
    .bind(workspaceId, userId)
    .first<WorkspaceIdentityRecord>();
};

export const ensureWorkspaceMembershipAndIdentity = async (
  env: Bindings,
  user: {
    id: string;
    handle: string | null;
    displayName: string;
    primaryEmail: string;
  },
  workspaceSlug: string,
  deps: WorkspaceAccessDeps,
) => {
  if (!env.DB) return null;

  const workspace = await deps.getWorkspaceBySlug(env, workspaceSlug);
  if (!workspace) return null;

  let membership = await env.DB.prepare(
    `SELECT
      wm.id,
      wm.workspace_id AS workspaceId,
      w.slug AS workspaceSlug,
      w.name AS workspaceName,
      wm.role,
      wm.status,
      wm.created_at AS createdAt
    FROM workspace_memberships wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.workspace_id = ?
      AND wm.user_id = ?
    LIMIT 1`,
  )
    .bind(workspace.id, user.id)
    .first<WorkspaceMembershipRecord>();

  if (!membership) {
    const role =
      (await deps.getWorkspaceMembershipCount(env, workspace.id)) === 0
        ? "owner"
        : "researcher";
    const now = new Date().toISOString();
    const membershipId = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO workspace_memberships (
        id,
        workspace_id,
        user_id,
        role,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'active', ?, ?)`,
    )
      .bind(membershipId, workspace.id, user.id, role, now, now)
      .run();

    membership = {
      id: membershipId,
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      workspaceName: workspace.name,
      role,
      status: "active",
      createdAt: now,
    };
  }

  let identity = await queryWorkspaceIdentityForUser(
    env,
    workspace.id,
    user.id,
  );
  if (!identity) {
    const now = new Date().toISOString();
    const identityHandle = await reserveUniqueHandle(
      env,
      "identities",
      `${workspace.slug}-${user.handle ?? user.primaryEmail.split("@")[0] ?? "human"}`,
    );

    await env.DB.prepare(
      `INSERT INTO identities (
        id,
        workspace_id,
        kind,
        handle,
        display_name,
        bio,
        metadata_json,
        created_at,
        updated_at
      ) VALUES (?, ?, 'human', ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        workspace.id,
        identityHandle,
        user.displayName,
        null,
        JSON.stringify({
          userId: user.id,
          source: "workspace_membership_bootstrap",
        }),
        now,
        now,
      )
      .run();

    identity = await queryWorkspaceIdentityForUser(env, workspace.id, user.id);
  }

  return {
    membership,
    identity,
  };
};
