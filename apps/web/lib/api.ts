import { cache } from "react";

import {
  type AssetManifest,
  type WorkspaceRoadmap,
  type WorkspaceSnapshot,
  assetManifestSchema,
  workspaceRoadmapSchema,
  workspaceSnapshotSchema,
} from "@psyos/contracts";

const apiBaseUrl =
  process.env.PSYOS_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "https://api.psyos.org";

type SchemaParser<T> = {
  parse(input: unknown): T;
};

async function fetchWithSchema<T>(
  path: string,
  schema: SchemaParser<T>,
): Promise<T | null> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${path} failed with status ${response.status}`);
  }

  return schema.parse(await response.json());
}

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export const getWorkspaceSnapshot = cache(async function getWorkspaceSnapshot(
  workspaceSlug: string,
): Promise<WorkspaceSnapshot | null> {
  return fetchWithSchema(
    `/api/v1/workspaces/${workspaceSlug}/snapshot`,
    workspaceSnapshotSchema,
  );
});

export const getWorkspaceRoadmap = cache(async function getWorkspaceRoadmap(
  workspaceSlug: string,
): Promise<WorkspaceRoadmap | null> {
  return fetchWithSchema(
    `/api/v1/workspaces/${workspaceSlug}/roadmap`,
    workspaceRoadmapSchema,
  );
});

export const getAssetManifest = cache(
  async function getAssetManifest(): Promise<AssetManifest | null> {
    return fetchWithSchema("/api/v1/asset-os/manifest", assetManifestSchema);
  },
);
