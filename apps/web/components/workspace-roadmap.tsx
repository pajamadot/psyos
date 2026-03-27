"use client";

import { useState } from "react";

import type { WorkspaceRoadmap } from "@psyos/contracts";

import { RoadmapDag } from "./roadmap-dag";

type WorkspaceRoadmapProps = {
  roadmap: WorkspaceRoadmap;
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  ready: "Ready",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

function sortItems(
  items: WorkspaceRoadmap["items"],
  columns: WorkspaceRoadmap["columns"],
) {
  const columnOrder = new Map(
    columns.map((column) => [column.id, column.position]),
  );

  return [...items].sort((left, right) => {
    const leftColumn = columnOrder.get(left.columnId) ?? 0;
    const rightColumn = columnOrder.get(right.columnId) ?? 0;

    if (leftColumn !== rightColumn) {
      return leftColumn - rightColumn;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function WorkspaceRoadmapPanel({ roadmap }: WorkspaceRoadmapProps) {
  const [view, setView] = useState<"board" | "dag">("board");
  const orderedColumns = [...roadmap.columns].sort(
    (left, right) => left.position - right.position,
  );
  const orderedItems = sortItems(roadmap.items, orderedColumns);

  return (
    <section className="workspace-panel" id="roadmap">
      <div className="workspace-panel-header">
        <div>
          <p className="panel-kicker">Workspace Roadmap</p>
          <h2>Board and dependency graph from the live control plane.</h2>
        </div>
        <div
          className="view-toggle"
          role="tablist"
          aria-label="Roadmap view mode"
        >
          {(["board", "dag"] as const).map((option) => (
            <button
              aria-pressed={view === option}
              className={view === option ? "is-active" : undefined}
              key={option}
              onClick={() => setView(option)}
              type="button"
            >
              {option === "board" ? "Board" : "DAG"}
            </button>
          ))}
        </div>
      </div>

      <div className="roadmap-summary-strip">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <article className="roadmap-summary-pill" key={status}>
            <span>{label}</span>
            <strong>
              {status === "backlog"
                ? roadmap.summary.backlog
                : status === "ready"
                  ? roadmap.summary.ready
                  : status === "in_progress"
                    ? roadmap.summary.inProgress
                    : status === "blocked"
                      ? roadmap.summary.blocked
                      : roadmap.summary.done}
            </strong>
          </article>
        ))}
      </div>

      {view === "dag" ? (
        <RoadmapDag roadmap={roadmap} />
      ) : (
        <div className="board-scroll">
          <div className="roadmap-board">
            {orderedColumns.map((column) => {
              const items = orderedItems.filter(
                (item) => item.columnId === column.id,
              );

              return (
                <article className="roadmap-column" key={column.id}>
                  <div className="roadmap-column-header">
                    <div>
                      <p className="roadmap-column-kicker">{column.slug}</p>
                      <h3>{column.title}</h3>
                    </div>
                    <span>{items.length}</span>
                  </div>
                  <p className="roadmap-column-description">
                    {column.description}
                  </p>

                  <div className="roadmap-column-body">
                    {items.map((item) => (
                      <article
                        className={`roadmap-card is-${item.status}`}
                        key={item.id}
                      >
                        <div className="roadmap-card-topline">
                          <span>{item.kind}</span>
                          <span>
                            {STATUS_LABELS[item.status] ?? item.status}
                          </span>
                        </div>
                        <h4>{item.title}</h4>
                        <p>{item.summary}</p>
                        <div className="roadmap-card-meta">
                          <span>{item.projectSlug ?? "workspace"}</span>
                          <span>{item.studySlug ?? "general"}</span>
                          <span>{item.assigneeHandle ?? "unassigned"}</span>
                        </div>
                      </article>
                    ))}

                    {items.length === 0 ? (
                      <div className="roadmap-empty-card">No items</div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
