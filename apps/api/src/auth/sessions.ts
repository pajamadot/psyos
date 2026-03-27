import { getSessionTtlDays, randomHex, sha256Hex } from "./shared";
import type { Bindings, SessionRecord } from "./types";

const parseTimestamp = (value: string | null | undefined) => {
  if (!value) return null;

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isExpired = (value: string | null | undefined) => {
  const timestamp = parseTimestamp(value);
  return timestamp === null ? true : timestamp <= Date.now();
};

export const findValidSession = async (
  env: Bindings,
  sessionToken: string,
  userAgent?: string | null,
) => {
  if (!env.DB) return null;

  const sessionTokenHash = await sha256Hex(sessionToken);
  const session = await env.DB.prepare(
    `SELECT
      s.id,
      s.user_id AS userId,
      s.expires_at AS expiresAt,
      s.last_seen_at AS lastSeenAt,
      s.user_agent AS userAgent,
      u.handle,
      u.display_name AS displayName,
      u.avatar_url AS avatarUrl,
      u.status,
      u.created_at AS createdAt,
      ue.email AS primaryEmail
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN user_emails ue ON ue.user_id = u.id AND ue.is_primary = 1
    WHERE s.session_token_hash = ?
      AND s.revoked_at IS NULL
    LIMIT 1`,
  )
    .bind(sessionTokenHash)
    .first<SessionRecord>();

  if (!session) return null;

  if (isExpired(session.expiresAt)) {
    await env.DB.prepare(
      `UPDATE user_sessions
      SET revoked_at = ?
      WHERE id = ?`,
    )
      .bind(new Date().toISOString(), session.id)
      .run();
    return null;
  }

  await env.DB.prepare(
    `UPDATE user_sessions
    SET last_seen_at = ?,
        user_agent = COALESCE(?, user_agent)
    WHERE id = ?`,
  )
    .bind(new Date().toISOString(), userAgent ?? null, session.id)
    .run();

  return {
    ...session,
    lastSeenAt: new Date().toISOString(),
    userAgent: userAgent ?? session.userAgent,
  };
};

export const listActiveSessionsForUser = async (
  env: Bindings,
  userId: string,
  currentSessionToken?: string | null,
) => {
  if (!env.DB) {
    return [];
  }

  const currentSessionHash = currentSessionToken
    ? await sha256Hex(currentSessionToken)
    : null;
  const rows = await env.DB.prepare(
    `SELECT
      id,
      session_token_hash AS sessionTokenHash,
      created_at AS createdAt,
      expires_at AS expiresAt,
      last_seen_at AS lastSeenAt,
      user_agent AS userAgent
    FROM user_sessions
    WHERE user_id = ?
      AND revoked_at IS NULL
      AND expires_at > ?
    ORDER BY created_at DESC`,
  )
    .bind(userId, new Date().toISOString())
    .all<{
      id: string;
      sessionTokenHash: string;
      createdAt: string;
      expiresAt: string;
      lastSeenAt: string | null;
      userAgent: string | null;
    }>();

  return rows.results.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    lastSeenAt: row.lastSeenAt,
    userAgent: row.userAgent,
    isCurrent:
      currentSessionHash !== null &&
      row.sessionTokenHash === currentSessionHash,
  }));
};

export const revokeSessionForUser = async (
  env: Bindings,
  userId: string,
  sessionId: string,
) => {
  if (!env.DB) {
    return null;
  }

  const record = await env.DB.prepare(
    `SELECT
      id,
      user_id AS userId,
      revoked_at AS revokedAt
    FROM user_sessions
    WHERE id = ?
      AND user_id = ?
    LIMIT 1`,
  )
    .bind(sessionId, userId)
    .first<{
      id: string;
      userId: string;
      revokedAt: string | null;
    }>();

  if (!record) {
    return null;
  }

  await env.DB.prepare(
    `UPDATE user_sessions
    SET revoked_at = COALESCE(revoked_at, ?)
    WHERE id = ?`,
  )
    .bind(new Date().toISOString(), sessionId)
    .run();

  return {
    id: record.id,
    alreadyRevoked: Boolean(record.revokedAt),
  };
};

export const createSession = async (
  env: Bindings,
  userId: string,
  userAgent?: string | null,
) => {
  if (!env.DB) return null;

  const sessionToken = randomHex(24);
  const sessionTokenHash = await sha256Hex(sessionToken);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + getSessionTtlDays(env) * 24 * 60 * 60 * 1000,
  );
  const sessionId = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO user_sessions (
      id,
      user_id,
      session_token_hash,
      expires_at,
      last_seen_at,
      user_agent,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      sessionId,
      userId,
      sessionTokenHash,
      expiresAt.toISOString(),
      now.toISOString(),
      userAgent ?? null,
      now.toISOString(),
    )
    .run();

  return {
    id: sessionId,
    sessionToken,
    expiresAt: expiresAt.toISOString(),
  };
};

export const clearSession = async (
  env: Bindings,
  sessionToken: string | null | undefined,
) => {
  if (!env.DB || !sessionToken) return;

  const sessionTokenHash = await sha256Hex(sessionToken);
  const session = await env.DB.prepare(
    `SELECT
      id,
      user_id AS userId
    FROM user_sessions
    WHERE session_token_hash = ?
    LIMIT 1`,
  )
    .bind(sessionTokenHash)
    .first<{
      id: string;
      userId: string;
    }>();

  await env.DB.prepare(
    `UPDATE user_sessions
    SET revoked_at = COALESCE(revoked_at, ?)
    WHERE session_token_hash = ?`,
  )
    .bind(new Date().toISOString(), sessionTokenHash)
    .run();

  return session;
};
