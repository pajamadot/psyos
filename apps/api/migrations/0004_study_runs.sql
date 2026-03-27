CREATE TABLE IF NOT EXISTS study_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  study_id TEXT NOT NULL,
  actor_identity_id TEXT,
  participant_kind TEXT NOT NULL CHECK (participant_kind IN ('human', 'agent')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'abandoned')),
  event_count INTEGER NOT NULL DEFAULT 0,
  summary_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (study_id) REFERENCES studies(id),
  FOREIGN KEY (actor_identity_id) REFERENCES identities(id)
);

CREATE INDEX IF NOT EXISTS idx_study_runs_workspace ON study_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_study_runs_study ON study_runs(study_id);
