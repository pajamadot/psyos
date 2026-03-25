CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, slug),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE IF NOT EXISTS identities (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('human', 'agent')),
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE IF NOT EXISTS identity_api_keys (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL,
  label TEXT NOT NULL,
  prefix TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  FOREIGN KEY (identity_id) REFERENCES identities(id)
);

CREATE TABLE IF NOT EXISTS studies (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  lead_identity_id TEXT NOT NULL,
  research_type TEXT NOT NULL,
  protocol_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (lead_identity_id) REFERENCES identities(id)
);

CREATE TABLE IF NOT EXISTS study_publications (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  changelog TEXT,
  protocol_snapshot_json TEXT NOT NULL,
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (study_id, version),
  FOREIGN KEY (study_id) REFERENCES studies(id)
);

CREATE TABLE IF NOT EXISTS participation_opportunities (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('human', 'agent', 'mixed')),
  status TEXT NOT NULL CHECK (status IN ('open', 'paused', 'closed')),
  eligibility_json TEXT,
  instructions_md TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (study_id) REFERENCES studies(id)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('requested', 'accepted', 'rejected', 'completed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opportunity_id) REFERENCES participation_opportunities(id),
  FOREIGN KEY (identity_id) REFERENCES identities(id)
);

CREATE TABLE IF NOT EXISTS roadmap_columns (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  UNIQUE (workspace_id, project_id, slug),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS roadmap_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT,
  column_id TEXT NOT NULL,
  assignee_identity_id TEXT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('backlog', 'ready', 'in_progress', 'blocked', 'done')),
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (column_id) REFERENCES roadmap_columns(id),
  FOREIGN KEY (assignee_identity_id) REFERENCES identities(id)
);

CREATE TABLE IF NOT EXISTS roadmap_dependencies (
  id TEXT PRIMARY KEY,
  from_item_id TEXT NOT NULL,
  to_item_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (from_item_id, to_item_id),
  FOREIGN KEY (from_item_id) REFERENCES roadmap_items(id),
  FOREIGN KEY (to_item_id) REFERENCES roadmap_items(id)
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT,
  owner_identity_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('stimulus', 'artifact', 'log', 'bundle', 'replay')),
  storage_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  media_type TEXT NOT NULL,
  byte_size INTEGER,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (owner_identity_id) REFERENCES identities(id)
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_identities_workspace ON identities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_identity ON identity_api_keys(identity_id);
CREATE INDEX IF NOT EXISTS idx_studies_workspace ON studies(workspace_id);
CREATE INDEX IF NOT EXISTS idx_studies_project ON studies(project_id);
CREATE INDEX IF NOT EXISTS idx_studies_status ON studies(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON participation_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_identity ON enrollments(identity_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_workspace ON roadmap_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_project ON roadmap_items(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_workspace ON assets(workspace_id);
