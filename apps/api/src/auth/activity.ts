import type { AuthEventType, Bindings } from "./types";

const parseJsonObject = (value: string | null | undefined) => {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const recordAuthEvent = async (
  env: Bindings,
  event: {
    userId?: string | null;
    workspaceId?: string | null;
    sessionId?: string | null;
    eventType: AuthEventType;
    userAgent?: string | null;
    requestId?: string | null;
    metadata?: Record<string, unknown>;
  },
) => {
  if (!env.DB) return;

  try {
    await env.DB.prepare(
      `INSERT INTO auth_events (
        id,
        user_id,
        workspace_id,
        session_id,
        event_type,
        user_agent,
        request_id,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        event.userId ?? null,
        event.workspaceId ?? null,
        event.sessionId ?? null,
        event.eventType,
        event.userAgent ?? null,
        event.requestId ?? null,
        JSON.stringify(event.metadata ?? {}),
        new Date().toISOString(),
      )
      .run();
  } catch {
    // Auth activity is additive. Missing tables must not break sign-in.
  }
};

export const listAuthActivityForUser = async (
  env: Bindings,
  userId: string,
  limit = 12,
) => {
  if (!env.DB) {
    return [];
  }

  try {
    const rows = await env.DB.prepare(
      `SELECT
        ae.id,
        ae.event_type AS eventType,
        ae.created_at AS createdAt,
        ae.session_id AS sessionId,
        ae.user_agent AS userAgent,
        ae.request_id AS requestId,
        ae.metadata_json AS metadataJson,
        w.slug AS workspaceSlug
      FROM auth_events ae
      LEFT JOIN workspaces w ON w.id = ae.workspace_id
      WHERE ae.user_id = ?
      ORDER BY ae.created_at DESC
      LIMIT ?`,
    )
      .bind(userId, limit)
      .all<{
        id: string;
        eventType: AuthEventType;
        createdAt: string;
        sessionId: string | null;
        userAgent: string | null;
        requestId: string | null;
        metadataJson: string | null;
        workspaceSlug: string | null;
      }>();

    return rows.results.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      createdAt: row.createdAt,
      workspaceSlug: row.workspaceSlug,
      sessionId: row.sessionId,
      userAgent: row.userAgent,
      requestId: row.requestId,
      metadata: parseJsonObject(row.metadataJson),
    }));
  } catch {
    return [];
  }
};
