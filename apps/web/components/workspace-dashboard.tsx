import Link from "next/link";

import {
  type AssetManifest,
  type WorkspaceRoadmap,
  type WorkspaceSnapshot,
  platformPrinciples,
} from "@psyos/contracts";

import { WorkspaceRoadmapPanel } from "./workspace-roadmap";

type WorkspaceDashboardProps = {
  apiBaseUrl: string;
  assetManifest: AssetManifest | null;
  roadmap: WorkspaceRoadmap;
  snapshot: WorkspaceSnapshot;
  workspaceSlug: string;
};

function opportunityLabel(count: number) {
  return `${count} open opportunit${count === 1 ? "y" : "ies"}`;
}

export function WorkspaceDashboard({
  apiBaseUrl,
  assetManifest,
  roadmap,
  snapshot,
  workspaceSlug,
}: WorkspaceDashboardProps) {
  const workspace = snapshot.workspace;
  const openOpportunities = snapshot.opportunities.filter(
    (opportunity) => opportunity.status === "open",
  );
  const manifestEntries = snapshot.assets.slice(0, 8);
  const projectLinks = snapshot.projects.slice(0, 6);

  return (
    <div className="workspace-shell">
      <section className="workspace-hero">
        <div className="workspace-hero-main">
          <p className="eyebrow">PsyOS / Workspace Control Surface</p>
          <h1>{workspace?.name ?? workspaceSlug}</h1>
          <p className="workspace-lede">
            {workspace?.description ??
              "This workspace is not seeded yet, so the dashboard is showing fallback control surfaces."}
          </p>
          <div className="workspace-cta-row">
            <a
              className="primary-cta"
              href={`${apiBaseUrl}/api/v1/workspaces/${workspaceSlug}/snapshot`}
            >
              Workspace Snapshot API
            </a>
            <a
              className="secondary-cta"
              href={`${apiBaseUrl}/api/v1/workspaces/${workspaceSlug}/roadmap`}
            >
              Workspace Roadmap API
            </a>
            <a
              className="secondary-cta"
              href={`${apiBaseUrl}/api/v1/asset-os/manifest`}
            >
              Asset OS Manifest
            </a>
          </div>
          <nav aria-label="Workspace sections" className="workspace-nav">
            <a href="#overview">Overview</a>
            <a href="#roadmap">Roadmap</a>
            <a href="#studies">Studies</a>
            <a href="#assets">Assets</a>
          </nav>
        </div>

        <aside className="workspace-command-panel">
          <p className="panel-kicker">Live State</p>
          <ul className="status-list">
            <li>
              <span>Projects</span>
              <strong>{workspace?.projectCount ?? 0}</strong>
            </li>
            <li>
              <span>Studies</span>
              <strong>{workspace?.studyCount ?? 0}</strong>
            </li>
            <li>
              <span>Identities</span>
              <strong>{workspace?.identityCount ?? 0}</strong>
            </li>
            <li>
              <span>Roadmap Items</span>
              <strong>{roadmap.items.length}</strong>
            </li>
            <li>
              <span>Assets</span>
              <strong>{snapshot.assets.length}</strong>
            </li>
          </ul>
        </aside>
      </section>

      <section className="workspace-grid" id="overview">
        <article className="workspace-panel">
          <p className="panel-kicker">Workspace Snapshot</p>
          <h2>Published studies are already shaping the product.</h2>
          <ul className="metric-grid">
            <li>
              <span>Reaction loops</span>
              <strong>{snapshot.studies.length}</strong>
            </li>
            <li>
              <span>Open calls</span>
              <strong>{openOpportunities.length}</strong>
            </li>
            <li>
              <span>Manifest entries</span>
              <strong>{manifestEntries.length}</strong>
            </li>
            <li>
              <span>Ready work</span>
              <strong>{roadmap.summary.ready}</strong>
            </li>
          </ul>
        </article>

        <article className="workspace-panel">
          <p className="panel-kicker">Project Surface</p>
          <div className="project-token-list">
            {projectLinks.map((project) => (
              <div className="project-token" key={project.id}>
                <strong>{project.name}</strong>
                <span>
                  {project.slug} / v{project.latestVersion} /{" "}
                  {opportunityLabel(project.openOpportunityCount)}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="workspace-panel">
          <p className="panel-kicker">Operator Links</p>
          <ul className="plain-list">
            <li>
              <Link href="/">Root route</Link>
            </li>
            <li>
              <a href={`${apiBaseUrl}/api/v1/docs`}>Swagger UI</a>
            </li>
            <li>
              <a href={`${apiBaseUrl}/api/v1/maintenance/system`}>
                Maintenance System
              </a>
            </li>
            <li>
              <a href={`${apiBaseUrl}/api/v1/dogfood/overview`}>
                Dogfood overview alias
              </a>
            </li>
            <li>
              <Link href={`/workspaces/${workspaceSlug}/settings`}>
                Auth and identity
              </Link>
            </li>
          </ul>
        </article>
      </section>

      <WorkspaceRoadmapPanel roadmap={roadmap} />

      <section className="workspace-section" id="studies">
        <div className="workspace-section-header">
          <div>
            <p className="panel-kicker">Studies</p>
            <h2>Dogfood studies are the first real workload.</h2>
          </div>
          <p className="workspace-section-note">
            Code-first packages, live publish state, reusable participant
            identities.
          </p>
        </div>

        <div className="study-grid">
          {snapshot.studies.map((study) => (
            <article className="study-card" key={study.id}>
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
                  <strong>v{study.latestVersion}</strong>
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
            </article>
          ))}
        </div>

        <div className="opportunity-grid">
          {openOpportunities.map((opportunity) => (
            <article
              className="workspace-panel opportunity-card"
              key={opportunity.id}
            >
              <p className="panel-kicker">Open Call</p>
              <h3>{opportunity.studyTitle}</h3>
              <p>
                {opportunity.instructionsMd ??
                  "Instructions not published yet."}
              </p>
              <div className="token-row">
                <span>{opportunity.targetKind}</span>
                <span>{opportunity.status}</span>
                <span>{opportunity.studySlug}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-section asset-section" id="assets">
        <div className="workspace-section-header">
          <div>
            <p className="panel-kicker">Asset OS</p>
            <h2>
              Artifacts, bundles, and traces are visible from the workspace.
            </h2>
          </div>
          <p className="workspace-section-note">
            {assetManifest?.assets.length ?? 0} total manifest entries across
            the platform.
          </p>
        </div>

        <div className="asset-grid">
          <article className="workspace-panel">
            <p className="panel-kicker">Workspace Manifest Slice</p>
            <ul className="plain-list">
              {manifestEntries.map((asset) => (
                <li className="asset-row" key={asset.id}>
                  <div>
                    <strong>{asset.label ?? asset.storageKey}</strong>
                    <span>
                      {asset.kind} / {asset.role ?? "untyped"} /{" "}
                      {asset.studySlug ?? "workspace"}
                    </span>
                  </div>
                  <code>{asset.contentHash}</code>
                </li>
              ))}
            </ul>
          </article>

          <article className="workspace-panel">
            <p className="panel-kicker">Principles in Use</p>
            <ul className="plain-list">
              {platformPrinciples.slice(0, 6).map((principle) => (
                <li key={principle}>{principle}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
