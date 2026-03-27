CREATE TABLE IF NOT EXISTS auth_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  workspace_id TEXT,
  session_id TEXT,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'magic_link_requested',
      'magic_link_failed',
      'magic_link_consumed',
      'session_created',
      'session_revoked'
    )
  ),
  user_agent TEXT,
  request_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (session_id) REFERENCES user_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_created_at
  ON auth_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_events_session
  ON auth_events(session_id);

CREATE INDEX IF NOT EXISTS idx_auth_events_workspace
  ON auth_events(workspace_id, created_at DESC);
