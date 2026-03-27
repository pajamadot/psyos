INSERT OR IGNORE INTO workspaces (
  id,
  slug,
  name,
  description,
  visibility
) VALUES (
  'ws_psyos_lab',
  'psyos-lab',
  'PsyOS Lab',
  'Internal dogfood workspace for pressure-testing psychology studies, agent operations, roadmap control, and Asset OS manifests.',
  'public'
);

INSERT OR IGNORE INTO identities (
  id,
  workspace_id,
  kind,
  handle,
  display_name,
  bio,
  metadata_json
) VALUES
  (
    'id_psyos_human_operator',
    'ws_psyos_lab',
    'human',
    'psyos-human-operator',
    'PsyOS Human Operator',
    'Operates the first dogfood studies and reviews timing quality, participant ergonomics, and publication surfaces.',
    '{"role":"research_lead","tags":["dogfood","operator"]}'
  ),
  (
    'id_psyos_agent_operator',
    'ws_psyos_lab',
    'agent',
    'psyos-agent-lab',
    'PsyOS Agent Lab',
    'Workspace agent that authors protocols, checks telemetry, and pressure-tests API-native research workflows.',
    '{"role":"agent_researcher","tags":["dogfood","agent"]}'
  );

INSERT OR IGNORE INTO projects (
  id,
  workspace_id,
  slug,
  name,
  project_type,
  description
) VALUES
  (
    'proj_reaction_time_baseline',
    'ws_psyos_lab',
    'reaction-time-baseline',
    'Reaction Time Baseline',
    'study',
    'Simple reaction-time task used to dogfood timing, publication, and artifact capture.'
  ),
  (
    'proj_adaptive_nback',
    'ws_psyos_lab',
    'adaptive-nback',
    'Adaptive N-Back',
    'study',
    'A more complex working-memory task used to pressure-test branching, state, and replay-oriented telemetry.'
  );

INSERT OR IGNORE INTO studies (
  id,
  workspace_id,
  project_id,
  slug,
  title,
  summary,
  status,
  lead_identity_id,
  research_type,
  protocol_json
) VALUES
  (
    'study_reaction_time_baseline',
    'ws_psyos_lab',
    'proj_reaction_time_baseline',
    'reaction-time-baseline',
    'Reaction Time Baseline',
    'A keyboard reaction-time benchmark that measures baseline latency, timing jitter, and artifact integrity across human and agent runs.',
    'published',
    'id_psyos_human_operator',
    'reaction_time',
    '{"packageId":"reaction-time-baseline","estimatedDurationMinutes":4,"measures":["reaction_time_ms","miss_rate","timing_jitter_ms"],"outputs":["responses","timing_trace","artifact_bundle"],"nodes":[{"id":"intro","type":"instruction"},{"id":"fixation","type":"stimulus"},{"id":"trial-loop","type":"loop"},{"id":"capture","type":"response_capture"},{"id":"feedback","type":"feedback"},{"id":"replay","type":"replay_marker"}]}'
  ),
  (
    'study_adaptive_nback',
    'ws_psyos_lab',
    'proj_adaptive_nback',
    'adaptive-nback',
    'Adaptive N-Back',
    'A branching N-back task that adapts difficulty, tracks accuracy over time, and emits richer traces for analysis and replay.',
    'published',
    'id_psyos_agent_operator',
    'working_memory',
    '{"packageId":"adaptive-nback","estimatedDurationMinutes":9,"measures":["accuracy","reaction_time_ms","difficulty_level","block_dropoff"],"outputs":["responses","event_log","replay_trace","analysis_bundle"],"nodes":[{"id":"intro","type":"instruction"},{"id":"practice","type":"sequence"},{"id":"nback-block","type":"block"},{"id":"trial","type":"trial"},{"id":"stimulus","type":"stimulus"},{"id":"capture","type":"response_capture"},{"id":"branch","type":"branch"},{"id":"feedback","type":"feedback"},{"id":"replay","type":"replay_marker"}]}'
  );

INSERT OR IGNORE INTO study_publications (
  id,
  study_id,
  version,
  changelog,
  protocol_snapshot_json
) VALUES
  (
    'pub_reaction_time_v1',
    'study_reaction_time_baseline',
    1,
    'Initial dogfood publish for timing and artifact validation.',
    '{"publishedVersion":1,"packageId":"reaction-time-baseline"}'
  ),
  (
    'pub_adaptive_nback_v1',
    'study_adaptive_nback',
    1,
    'Initial dogfood publish for branching and replay validation.',
    '{"publishedVersion":1,"packageId":"adaptive-nback"}'
  );

INSERT OR IGNORE INTO participation_opportunities (
  id,
  study_id,
  target_kind,
  status,
  eligibility_json,
  instructions_md
) VALUES
  (
    'opp_reaction_time_mixed',
    'study_reaction_time_baseline',
    'mixed',
    'open',
    '{"requirements":["keyboard_input","stable_timer"],"notes":["Humans and agents both allowed"]}',
    'Complete the short baseline task and review whether the recorded timing trace matches the expected trial cadence.'
  ),
  (
    'opp_adaptive_nback_agent',
    'study_adaptive_nback',
    'agent',
    'open',
    '{"requirements":["workspace_api_key","json_output"],"notes":["Agent-only first pass to stress telemetry and branching"]}',
    'Run the adaptive N-back package, return a structured response log, and compare the emitted replay trace against the expected branch path.'
  );

INSERT OR IGNORE INTO roadmap_columns (
  id,
  workspace_id,
  project_id,
  slug,
  title,
  position,
  description
) VALUES
  (
    'col_backlog',
    'ws_psyos_lab',
    NULL,
    'backlog',
    'Backlog',
    0,
    'Accepted work that is not active yet.'
  ),
  (
    'col_ready',
    'ws_psyos_lab',
    NULL,
    'ready',
    'Ready',
    1,
    'Clear enough to execute.'
  ),
  (
    'col_in_progress',
    'ws_psyos_lab',
    NULL,
    'in-progress',
    'In Progress',
    2,
    'Actively executing.'
  ),
  (
    'col_done',
    'ws_psyos_lab',
    NULL,
    'done',
    'Done',
    3,
    'Shipped and validated.'
  );

INSERT OR IGNORE INTO roadmap_items (
  id,
  workspace_id,
  project_id,
  column_id,
  assignee_identity_id,
  title,
  summary,
  kind,
  status,
  metadata_json
) VALUES
  (
    'item_rt_validate_timing',
    'ws_psyos_lab',
    'proj_reaction_time_baseline',
    'col_done',
    'id_psyos_human_operator',
    'Validate reaction-time timing trace',
    'Use the dogfood reaction-time task to confirm trial cadence and expected latency measurements.',
    'product',
    'done',
    '{"studySlug":"reaction-time-baseline"}'
  ),
  (
    'item_nback_trace_bundle',
    'ws_psyos_lab',
    'proj_adaptive_nback',
    'col_in_progress',
    'id_psyos_agent_operator',
    'Emit adaptive N-back replay bundle',
    'Make the N-back task produce a replay-oriented artifact bundle for review.',
    'platform',
    'in_progress',
    '{"studySlug":"adaptive-nback"}'
  ),
  (
    'item_asset_manifest_review',
    'ws_psyos_lab',
    NULL,
    'col_ready',
    'id_psyos_agent_operator',
    'Review Asset OS manifest quality',
    'Confirm every dogfood study artifact is addressable through the manifest surface.',
    'platform',
    'ready',
    '{"scope":"workspace"}'
  ),
  (
    'item_participant_market_policy',
    'ws_psyos_lab',
    NULL,
    'col_backlog',
    'id_psyos_human_operator',
    'Define participant matching policy',
    'Lock the first policy for how humans and agents discover open opportunities.',
    'governance',
    'backlog',
    '{"scope":"workspace"}'
  );

INSERT OR IGNORE INTO roadmap_dependencies (
  id,
  from_item_id,
  to_item_id
) VALUES
  (
    'dep_rt_to_asset_manifest',
    'item_rt_validate_timing',
    'item_asset_manifest_review'
  ),
  (
    'dep_nback_to_asset_manifest',
    'item_nback_trace_bundle',
    'item_asset_manifest_review'
  );

INSERT OR IGNORE INTO assets (
  id,
  workspace_id,
  project_id,
  owner_identity_id,
  kind,
  storage_key,
  content_hash,
  media_type,
  byte_size,
  metadata_json
) VALUES
  (
    'asset_rt_schedule',
    'ws_psyos_lab',
    'proj_reaction_time_baseline',
    'id_psyos_human_operator',
    'stimulus',
    'cas/stimulus/reaction-time-baseline/trial-schedule.json',
    'sha256:rt_schedule_v1',
    'application/json',
    1842,
    '{"label":"Reaction time trial schedule","role":"trial_schedule","studySlug":"reaction-time-baseline","tags":["dogfood","reaction-time","stimulus"]}'
  ),
  (
    'asset_rt_bundle',
    'ws_psyos_lab',
    'proj_reaction_time_baseline',
    'id_psyos_agent_operator',
    'bundle',
    'cas/bundle/reaction-time-baseline/package-v1.json',
    'sha256:rt_bundle_v1',
    'application/json',
    6120,
    '{"label":"Reaction time package bundle","role":"package_bundle","studySlug":"reaction-time-baseline","tags":["dogfood","bundle","published"]}'
  ),
  (
    'asset_rt_trace',
    'ws_psyos_lab',
    'proj_reaction_time_baseline',
    'id_psyos_human_operator',
    'log',
    'cas/log/reaction-time-baseline/sample-trace.ndjson',
    'sha256:rt_trace_sample_v1',
    'application/x-ndjson',
    2408,
    '{"label":"Reaction time sample timing trace","role":"timing_trace","studySlug":"reaction-time-baseline","tags":["dogfood","timing","trace"]}'
  ),
  (
    'asset_nback_bundle',
    'ws_psyos_lab',
    'proj_adaptive_nback',
    'id_psyos_agent_operator',
    'bundle',
    'cas/bundle/adaptive-nback/package-v1.json',
    'sha256:nback_bundle_v1',
    'application/json',
    9420,
    '{"label":"Adaptive N-back package bundle","role":"package_bundle","studySlug":"adaptive-nback","tags":["dogfood","bundle","nback"]}'
  ),
  (
    'asset_nback_replay',
    'ws_psyos_lab',
    'proj_adaptive_nback',
    'id_psyos_agent_operator',
    'replay',
    'cas/replay/adaptive-nback/sample-replay.json',
    'sha256:nback_replay_v1',
    'application/json',
    5312,
    '{"label":"Adaptive N-back replay trace","role":"replay_trace","studySlug":"adaptive-nback","tags":["dogfood","replay","nback"]}'
  ),
  (
    'asset_nback_analysis',
    'ws_psyos_lab',
    'proj_adaptive_nback',
    'id_psyos_agent_operator',
    'artifact',
    'cas/artifact/adaptive-nback/analysis-summary.json',
    'sha256:nback_analysis_v1',
    'application/json',
    3588,
    '{"label":"Adaptive N-back analysis summary","role":"analysis_output","studySlug":"adaptive-nback","tags":["dogfood","analysis","artifact"]}'
  );
