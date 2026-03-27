"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  type DogfoodStudy,
  type OpportunityMutation,
  type OpportunitySummary,
  type StudyRun,
  type StudyRunIngestion,
  type WorkspaceSnapshot,
  opportunityMutationResponseSchema,
  studyPublishResponseSchema,
  studyRunMutationResponseSchema,
  studyRunsResponseSchema,
  workspaceSnapshotSchema,
} from "@psyos/contracts";

import { fetchBrowserApi, parseApiResponse } from "../lib/browser-api";

type WorkspaceStudyControlSurfaceProps = {
  apiBaseUrl: string;
  initialSnapshot: WorkspaceSnapshot;
  workspaceSlug: string;
};

type OpportunityEditorProps = {
  opportunity: OpportunitySummary;
  onSave: (
    opportunityId: string,
    mutation: OpportunityMutation,
  ) => Promise<OpportunitySummary>;
};

type StudyControlCardProps = {
  apiBaseUrl: string;
  opportunities: OpportunitySummary[];
  onCreateOpportunity: (
    studySlug: string,
    mutation: OpportunityMutation,
  ) => Promise<OpportunitySummary>;
  onIngestRun: (
    studySlug: string,
    input: StudyRunIngestion,
  ) => Promise<StudyRun>;
  onPublish: (studySlug: string, changelog: string) => Promise<void>;
  onUpdateOpportunity: (
    studySlug: string,
    opportunityId: string,
    mutation: OpportunityMutation,
  ) => Promise<OpportunitySummary>;
  runs: StudyRun[];
  study: DogfoodStudy;
  viewer: WorkspaceSnapshot["access"]["viewer"];
  workspaceSlug: string;
};

const TARGET_KIND_OPTIONS = [
  { value: "human", label: "Human" },
  { value: "agent", label: "Agent" },
  { value: "mixed", label: "Mixed" },
] as const;

const OPPORTUNITY_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "paused", label: "Paused" },
  { value: "closed", label: "Closed" },
] as const;

const RUN_STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "started", label: "Started" },
  { value: "failed", label: "Failed" },
  { value: "abandoned", label: "Abandoned" },
] as const;

function capabilityLabel(value: string) {
  return value.replace(/\./g, " / ");
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "unknown";

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatRunSummary(summary: Record<string, unknown>) {
  const keys = Object.keys(summary);
  if (keys.length === 0) {
    return "No summary payload";
  }

  return keys
    .slice(0, 3)
    .map((key) => {
      const value = summary[key];
      if (typeof value === "string" || typeof value === "number") {
        return `${key}: ${value}`;
      }

      if (typeof value === "boolean") {
        return `${key}: ${value ? "true" : "false"}`;
      }

      return `${key}: structured`;
    })
    .join(" / ");
}

function OpportunityEditor({ opportunity, onSave }: OpportunityEditorProps) {
  const [targetKind, setTargetKind] = useState(opportunity.targetKind);
  const [status, setStatus] = useState(opportunity.status);
  const [instructionsMd, setInstructionsMd] = useState(
    opportunity.instructionsMd ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTargetKind(opportunity.targetKind);
    setStatus(opportunity.status);
    setInstructionsMd(opportunity.instructionsMd ?? "");
  }, [opportunity.instructionsMd, opportunity.status, opportunity.targetKind]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      await onSave(opportunity.id, {
        targetKind,
        status,
        instructionsMd: instructionsMd.trim() ? instructionsMd.trim() : null,
      });
      setMessage("Opportunity updated.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update the opportunity.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article className="study-control-record">
      <div className="card-topline">
        <span className="status-chip">{status}</span>
        <span className="project-chip">{targetKind}</span>
      </div>
      <h4>{opportunity.studyTitle}</h4>
      <p>{opportunity.instructionsMd ?? "Instructions not published yet."}</p>

      <form className="study-control-form" onSubmit={handleSubmit}>
        <label className="study-control-field">
          <span>Target kind</span>
          <select
            onChange={(event) =>
              setTargetKind(event.target.value as typeof targetKind)
            }
            value={targetKind}
          >
            {TARGET_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="study-control-field">
          <span>Status</span>
          <select
            onChange={(event) => setStatus(event.target.value as typeof status)}
            value={status}
          >
            {OPPORTUNITY_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="study-control-field">
          <span>Instructions</span>
          <textarea
            onChange={(event) => setInstructionsMd(event.target.value)}
            rows={4}
            value={instructionsMd}
          />
        </label>

        <div className="study-control-actions">
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : "Update opportunity"}
          </button>
          <span className="study-control-meta">
            Created {formatTimestamp(opportunity.createdAt)}
          </span>
        </div>

        {message ? <p className="study-control-status">{message}</p> : null}
        {error ? <p className="study-control-error">{error}</p> : null}
      </form>
    </article>
  );
}

function StudyControlCard({
  apiBaseUrl,
  opportunities,
  onCreateOpportunity,
  onIngestRun,
  onPublish,
  onUpdateOpportunity,
  runs,
  study,
  viewer,
  workspaceSlug,
}: StudyControlCardProps) {
  const canPublish = viewer.capabilities.includes("study.publish");
  const canManageOpportunities =
    viewer.capabilities.includes("opportunity.manage");
  const canReadRuns = viewer.capabilities.includes("study.read");
  const canWriteRuns = viewer.capabilities.includes("result.write");
  const [publishChangelog, setPublishChangelog] = useState("");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [newOpportunityTargetKind, setNewOpportunityTargetKind] = useState<
    "human" | "agent" | "mixed"
  >("mixed");
  const [newOpportunityStatus, setNewOpportunityStatus] = useState<
    "open" | "paused" | "closed"
  >("open");
  const [newOpportunityInstructions, setNewOpportunityInstructions] =
    useState("");
  const [opportunityError, setOpportunityError] = useState<string | null>(null);
  const [opportunityMessage, setOpportunityMessage] = useState<string | null>(
    null,
  );
  const [isCreatingOpportunity, setIsCreatingOpportunity] = useState(false);
  const [runStatus, setRunStatus] = useState<
    "completed" | "started" | "failed" | "abandoned"
  >("completed");
  const [runEventCount, setRunEventCount] = useState("24");
  const [runSummaryJson, setRunSummaryJson] = useState(
    JSON.stringify(
      {
        source: "workspace-ui",
        note: "Dogfood operator run",
      },
      null,
      2,
    ),
  );
  const [runError, setRunError] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [isIngestingRun, setIsIngestingRun] = useState(false);

  const handlePublish = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPublishError(null);
    setPublishMessage(null);
    setIsPublishing(true);

    try {
      await onPublish(study.slug, publishChangelog.trim());
      setPublishMessage("Study published and latest version advanced.");
      setPublishChangelog("");
    } catch (submitError) {
      setPublishError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to publish the study.",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCreateOpportunity = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setOpportunityError(null);
    setOpportunityMessage(null);
    setIsCreatingOpportunity(true);

    try {
      await onCreateOpportunity(study.slug, {
        targetKind: newOpportunityTargetKind,
        status: newOpportunityStatus,
        instructionsMd: newOpportunityInstructions.trim()
          ? newOpportunityInstructions.trim()
          : null,
      });
      setOpportunityMessage("Opportunity created.");
      setNewOpportunityInstructions("");
      setNewOpportunityStatus("open");
      setNewOpportunityTargetKind("mixed");
    } catch (submitError) {
      setOpportunityError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create the opportunity.",
      );
    } finally {
      setIsCreatingOpportunity(false);
    }
  };

  const handleIngestRun = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRunError(null);
    setRunMessage(null);
    setIsIngestingRun(true);

    try {
      const parsedSummary = JSON.parse(runSummaryJson) as unknown;
      if (
        !parsedSummary ||
        Array.isArray(parsedSummary) ||
        typeof parsedSummary !== "object"
      ) {
        throw new Error("Summary JSON must be an object.");
      }

      await onIngestRun(study.slug, {
        status: runStatus,
        eventCount: Math.max(0, Number.parseInt(runEventCount, 10) || 0),
        summary: parsedSummary as Record<string, unknown>,
      });
      setRunMessage("Run ingested.");
    } catch (submitError) {
      setRunError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to ingest the run.",
      );
    } finally {
      setIsIngestingRun(false);
    }
  };

  return (
    <article
      className="study-card study-card-shell"
      data-testid={`study-control-card-${study.slug}`}
    >
      <div className="card-topline">
        <span className="status-chip">{study.status}</span>
        <span className="project-chip">{study.projectSlug}</span>
      </div>
      <h3>{study.title}</h3>
      <p>{study.summary}</p>
      <ul className="metric-list">
        <li>
          <span>Lead</span>
          <strong>{study.leadHandle}</strong>
        </li>
        <li>
          <span>Duration</span>
          <strong>
            {study.estimatedDurationMinutes
              ? `${study.estimatedDurationMinutes} min`
              : "TBD"}
          </strong>
        </li>
        <li>
          <span>Package</span>
          <strong>{study.packageId ?? "unpackaged"}</strong>
        </li>
        <li>
          <span>Version</span>
          <strong data-testid={`study-version-${study.slug}`}>
            v{study.latestVersion}
          </strong>
        </li>
      </ul>
      <div className="token-row">
        {study.nodeTypes.map((nodeType) => (
          <span key={`${study.id}-${nodeType}`}>{nodeType}</span>
        ))}
      </div>
      <div className="token-row muted-row">
        {study.outputs.map((output) => (
          <span key={`${study.id}-${output}`}>{output}</span>
        ))}
      </div>

      <div className="study-control-grid">
        <section className="study-control-block">
          <div className="study-control-heading">
            <div>
              <p className="panel-kicker">Publish</p>
              <h4>Advance latest public version</h4>
            </div>
            <a
              className="study-control-link"
              href={`${apiBaseUrl}/api/v1/workspaces/${workspaceSlug}/studies/${study.slug}/publish`}
            >
              API
            </a>
          </div>

          {canPublish ? (
            <form className="study-control-form" onSubmit={handlePublish}>
              <label className="study-control-field">
                <span>Changelog</span>
                <textarea
                  data-testid={`study-publish-changelog-${study.slug}`}
                  onChange={(event) => setPublishChangelog(event.target.value)}
                  placeholder="Summarize what changed in this publish."
                  rows={4}
                  value={publishChangelog}
                />
              </label>
              <div className="study-control-actions">
                <button
                  data-testid={`study-publish-button-${study.slug}`}
                  disabled={isPublishing}
                  type="submit"
                >
                  {isPublishing ? "Publishing..." : "Publish study"}
                </button>
              </div>
              {publishMessage ? (
                <p className="study-control-status">{publishMessage}</p>
              ) : null}
              {publishError ? (
                <p className="study-control-error">{publishError}</p>
              ) : null}
            </form>
          ) : (
            <p className="study-control-empty">
              Sign in with a workspace role that has <code>study.publish</code>{" "}
              to advance public versions.
            </p>
          )}
        </section>

        <section className="study-control-block">
          <div className="study-control-heading">
            <div>
              <p className="panel-kicker">Opportunities</p>
              <h4>Manage recruitment and participation calls</h4>
            </div>
            <span className="study-control-meta">
              {opportunities.length} total
            </span>
          </div>

          {canManageOpportunities ? (
            <form
              className="study-control-form"
              onSubmit={handleCreateOpportunity}
            >
              <div className="study-control-field-row">
                <label className="study-control-field">
                  <span>Target kind</span>
                  <select
                    onChange={(event) =>
                      setNewOpportunityTargetKind(
                        event.target.value as typeof newOpportunityTargetKind,
                      )
                    }
                    value={newOpportunityTargetKind}
                  >
                    {TARGET_KIND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="study-control-field">
                  <span>Status</span>
                  <select
                    onChange={(event) =>
                      setNewOpportunityStatus(
                        event.target.value as typeof newOpportunityStatus,
                      )
                    }
                    value={newOpportunityStatus}
                  >
                    {OPPORTUNITY_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="study-control-field">
                <span>Instructions</span>
                <textarea
                  data-testid={`study-create-opportunity-instructions-${study.slug}`}
                  onChange={(event) =>
                    setNewOpportunityInstructions(event.target.value)
                  }
                  placeholder="How should humans or agents participate?"
                  rows={4}
                  value={newOpportunityInstructions}
                />
              </label>
              <div className="study-control-actions">
                <button
                  data-testid={`study-create-opportunity-button-${study.slug}`}
                  disabled={isCreatingOpportunity}
                  type="submit"
                >
                  {isCreatingOpportunity ? "Creating..." : "Create opportunity"}
                </button>
              </div>
              {opportunityMessage ? (
                <p className="study-control-status">{opportunityMessage}</p>
              ) : null}
              {opportunityError ? (
                <p className="study-control-error">{opportunityError}</p>
              ) : null}
            </form>
          ) : (
            <p className="study-control-empty">
              Recruitment editing requires <code>opportunity.manage</code>.
            </p>
          )}

          <div className="study-control-list">
            {opportunities.length === 0 ? (
              <p className="study-control-empty">No opportunities yet.</p>
            ) : (
              opportunities.map((opportunity) =>
                canManageOpportunities ? (
                  <OpportunityEditor
                    key={opportunity.id}
                    onSave={(opportunityId, mutation) =>
                      onUpdateOpportunity(study.slug, opportunityId, mutation)
                    }
                    opportunity={opportunity}
                  />
                ) : (
                  <article
                    className="study-control-record"
                    key={opportunity.id}
                  >
                    <div className="card-topline">
                      <span className="status-chip">{opportunity.status}</span>
                      <span className="project-chip">
                        {opportunity.targetKind}
                      </span>
                    </div>
                    <h4>{opportunity.studyTitle}</h4>
                    <p>
                      {opportunity.instructionsMd ??
                        "Instructions not published yet."}
                    </p>
                  </article>
                ),
              )
            )}
          </div>
        </section>

        <section className="study-control-block">
          <div className="study-control-heading">
            <div>
              <p className="panel-kicker">Runs</p>
              <h4>Ingest dogfood runs and inspect recent telemetry</h4>
            </div>
            <span className="study-control-meta">{runs.length} recorded</span>
          </div>

          {canWriteRuns ? (
            <form className="study-control-form" onSubmit={handleIngestRun}>
              <div className="study-control-field-row">
                <label className="study-control-field">
                  <span>Status</span>
                  <select
                    onChange={(event) =>
                      setRunStatus(event.target.value as typeof runStatus)
                    }
                    value={runStatus}
                  >
                    {RUN_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="study-control-field">
                  <span>Event count</span>
                  <input
                    data-testid={`study-run-event-count-${study.slug}`}
                    inputMode="numeric"
                    min={0}
                    onChange={(event) => setRunEventCount(event.target.value)}
                    type="number"
                    value={runEventCount}
                  />
                </label>
              </div>
              <label className="study-control-field">
                <span>Summary JSON</span>
                <textarea
                  data-testid={`study-run-summary-${study.slug}`}
                  onChange={(event) => setRunSummaryJson(event.target.value)}
                  rows={6}
                  value={runSummaryJson}
                />
              </label>
              <div className="study-control-actions">
                <button
                  data-testid={`study-ingest-run-button-${study.slug}`}
                  disabled={isIngestingRun}
                  type="submit"
                >
                  {isIngestingRun ? "Ingesting..." : "Ingest run"}
                </button>
              </div>
              {runMessage ? (
                <p className="study-control-status">{runMessage}</p>
              ) : null}
              {runError ? (
                <p className="study-control-error">{runError}</p>
              ) : null}
            </form>
          ) : (
            <p className="study-control-empty">
              Result ingestion requires <code>result.write</code>.
            </p>
          )}

          {canReadRuns ? (
            <div
              className="study-control-list"
              data-testid={`study-runs-${study.slug}`}
            >
              {runs.length === 0 ? (
                <p className="study-control-empty">No runs recorded yet.</p>
              ) : (
                runs.map((run) => (
                  <article
                    className="study-control-record"
                    data-testid={`study-run-row-${study.slug}`}
                    key={run.id}
                  >
                    <div className="card-topline">
                      <span className="status-chip">{run.status}</span>
                      <span className="project-chip">
                        {run.participantKind}
                      </span>
                    </div>
                    <h4>{run.actorHandle ?? "workspace participant"}</h4>
                    <p>{formatRunSummary(run.summary)}</p>
                    <div className="token-row muted-row">
                      <span>{run.eventCount} events</span>
                      <span>{run.projectSlug}</span>
                      <span>{formatTimestamp(run.createdAt)}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : null}
        </section>
      </div>
    </article>
  );
}

export function WorkspaceStudyControlSurface({
  apiBaseUrl,
  initialSnapshot,
  workspaceSlug,
}: WorkspaceStudyControlSurfaceProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [runsByStudy, setRunsByStudy] = useState<Record<string, StudyRun[]>>(
    {},
  );
  const [surfaceError, setSurfaceError] = useState<string | null>(null);
  const [surfaceStatus, setSurfaceStatus] = useState<string | null>(null);
  const [isRefreshingSnapshot, setIsRefreshingSnapshot] = useState(false);

  const viewer = snapshot.access.viewer;
  const openOpportunities = snapshot.opportunities.filter(
    (opportunity) => opportunity.status === "open",
  );

  const refreshSnapshot = async () => {
    const nextSnapshot = await fetchBrowserApi(
      `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/snapshot`,
      workspaceSnapshotSchema,
    );
    setSnapshot(nextSnapshot);
    return nextSnapshot;
  };

  const refreshRuns = async (nextSnapshot: WorkspaceSnapshot) => {
    const canReadRuns =
      nextSnapshot.access.viewer.authenticated &&
      nextSnapshot.access.viewer.capabilities.includes("study.read");

    if (!canReadRuns) {
      setRunsByStudy({});
      return;
    }

    const entries = await Promise.all(
      nextSnapshot.studies.map(async (study) => {
        const payload = await fetchBrowserApi(
          `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/studies/${encodeURIComponent(study.slug)}/runs`,
          studyRunsResponseSchema,
        );

        return [study.slug, payload.runs] as const;
      }),
    );

    setRunsByStudy(Object.fromEntries(entries));
  };

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      setIsRefreshingSnapshot(true);

      try {
        const nextSnapshot = await fetchBrowserApi(
          `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/snapshot`,
          workspaceSnapshotSchema,
        );
        if (cancelled) return;

        setSurfaceError(null);
        setSnapshot(nextSnapshot);

        const canReadRuns =
          nextSnapshot.access.viewer.authenticated &&
          nextSnapshot.access.viewer.capabilities.includes("study.read");

        if (!canReadRuns) {
          setRunsByStudy({});
          return;
        }

        const entries = await Promise.all(
          nextSnapshot.studies.map(async (study) => {
            const payload = await fetchBrowserApi(
              `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/studies/${encodeURIComponent(study.slug)}/runs`,
              studyRunsResponseSchema,
            );

            return [study.slug, payload.runs] as const;
          }),
        );

        if (cancelled) return;
        setRunsByStudy(Object.fromEntries(entries));
      } catch (refreshError) {
        if (cancelled) return;
        setSurfaceError(
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to refresh the workspace control plane.",
        );
      } finally {
        if (!cancelled) {
          setIsRefreshingSnapshot(false);
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [workspaceSlug]);

  const sendMutation = async <T,>(
    path: string,
    method: "POST" | "PATCH",
    parser: { parse(input: unknown): T },
    body: unknown,
  ) => {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    return parseApiResponse(response, parser);
  };

  const publishStudy = async (studySlug: string, changelog: string) => {
    setSurfaceError(null);
    const payload = await sendMutation(
      `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/studies/${encodeURIComponent(studySlug)}/publish`,
      "POST",
      studyPublishResponseSchema,
      {
        changelog: changelog || undefined,
      },
    );
    const nextSnapshot = await refreshSnapshot();
    await refreshRuns(nextSnapshot);
    setSurfaceStatus(
      `Published ${payload.study.title} as version ${payload.publication.version}.`,
    );
    router.refresh();
  };

  const createOpportunity = async (
    studySlug: string,
    mutation: OpportunityMutation,
  ) => {
    setSurfaceError(null);
    const payload = await sendMutation(
      `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/studies/${encodeURIComponent(studySlug)}/opportunities`,
      "POST",
      opportunityMutationResponseSchema,
      mutation,
    );
    const nextSnapshot = await refreshSnapshot();
    await refreshRuns(nextSnapshot);
    setSurfaceStatus(
      `Created an opportunity for ${payload.opportunity.studyTitle}.`,
    );
    router.refresh();
    return payload.opportunity;
  };

  const updateOpportunity = async (
    studySlug: string,
    opportunityId: string,
    mutation: OpportunityMutation,
  ) => {
    setSurfaceError(null);
    const payload = await sendMutation(
      `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/studies/${encodeURIComponent(studySlug)}/opportunities/${encodeURIComponent(opportunityId)}`,
      "PATCH",
      opportunityMutationResponseSchema,
      mutation,
    );
    const nextSnapshot = await refreshSnapshot();
    await refreshRuns(nextSnapshot);
    setSurfaceStatus(`Updated opportunity ${payload.opportunity.id}.`);
    router.refresh();
    return payload.opportunity;
  };

  const ingestRun = async (studySlug: string, input: StudyRunIngestion) => {
    setSurfaceError(null);
    const payload = await sendMutation(
      `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/studies/${encodeURIComponent(studySlug)}/runs`,
      "POST",
      studyRunMutationResponseSchema,
      input,
    );
    const nextSnapshot = await refreshSnapshot();
    await refreshRuns(nextSnapshot);
    setSurfaceStatus(`Ingested run ${payload.run.id} for ${studySlug}.`);
    router.refresh();
    return payload.run;
  };

  return (
    <div className="study-control-surface" data-testid="study-control-surface">
      <div className="study-surface-banner">
        <div>
          <p className="panel-kicker">Live viewer posture</p>
          <h3>
            Workspace auth, capabilities, and dogfood execution all meet here.
          </h3>
        </div>
        <div className="study-surface-meta">
          <span
            className={`viewer-state-chip ${viewer.authenticated ? "is-authenticated" : "is-anonymous"}`}
            data-testid="study-viewer-state"
          >
            {viewer.authenticated ? "authenticated" : "anonymous"}
          </span>
          <span className="study-control-meta" data-testid="study-viewer-role">
            {viewer.workspaceRole ?? "no workspace role"}
          </span>
          {isRefreshingSnapshot ? (
            <span className="study-control-meta">refreshing snapshot...</span>
          ) : null}
        </div>
      </div>

      <div className="capability-pill-row">
        {viewer.capabilities.length > 0 ? (
          viewer.capabilities.map((capability) => (
            <span className="capability-pill" key={capability}>
              {capabilityLabel(capability)}
            </span>
          ))
        ) : (
          <p className="study-control-empty">
            This browser is reading the public workspace surface only. Use{" "}
            <Link href={`/workspaces/${workspaceSlug}/settings`}>settings</Link>{" "}
            to sign in and unlock publish, opportunity, and result actions.
          </p>
        )}
      </div>

      {surfaceStatus ? (
        <p className="study-control-status" data-testid="study-surface-status">
          {surfaceStatus}
        </p>
      ) : null}
      {surfaceError ? (
        <p className="study-control-error">{surfaceError}</p>
      ) : null}

      <div className="opportunity-grid">
        {openOpportunities.map((opportunity) => (
          <article
            className="workspace-panel opportunity-card"
            key={opportunity.id}
          >
            <p className="panel-kicker">Open Call</p>
            <h3>{opportunity.studyTitle}</h3>
            <p>
              {opportunity.instructionsMd ?? "Instructions not published yet."}
            </p>
            <div className="token-row">
              <span>{opportunity.targetKind}</span>
              <span>{opportunity.status}</span>
              <span>{opportunity.studySlug}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="study-grid">
        {snapshot.studies.map((study) => (
          <StudyControlCard
            apiBaseUrl={apiBaseUrl}
            key={study.id}
            onCreateOpportunity={createOpportunity}
            onIngestRun={ingestRun}
            onPublish={publishStudy}
            onUpdateOpportunity={updateOpportunity}
            opportunities={snapshot.opportunities.filter(
              (opportunity) => opportunity.studySlug === study.slug,
            )}
            runs={runsByStudy[study.slug] ?? []}
            study={study}
            viewer={viewer}
            workspaceSlug={workspaceSlug}
          />
        ))}
      </div>
    </div>
  );
}
