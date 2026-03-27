import { notFound } from "next/navigation";

import { WorkspaceDashboard } from "../../../components/workspace-dashboard";
import {
  getApiBaseUrl,
  getAssetManifest,
  getWorkspaceRoadmap,
  getWorkspaceSnapshot,
} from "../../../lib/api";

export const dynamic = "force-dynamic";

type WorkspacePageProps = {
  params: Promise<{
    workspaceSlug: string;
  }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspaceSlug } = await params;
  const [snapshot, roadmap, assetManifest] = await Promise.all([
    getWorkspaceSnapshot(workspaceSlug),
    getWorkspaceRoadmap(workspaceSlug),
    getAssetManifest(),
  ]);

  if (!snapshot?.workspace || !roadmap) {
    notFound();
  }

  return (
    <WorkspaceDashboard
      apiBaseUrl={getApiBaseUrl()}
      assetManifest={assetManifest}
      roadmap={roadmap}
      snapshot={snapshot}
      workspaceSlug={workspaceSlug}
    />
  );
}
