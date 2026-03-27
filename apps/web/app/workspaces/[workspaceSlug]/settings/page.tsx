import { WorkspaceAuthPanel } from "../../../../components/workspace-auth-panel";

export const dynamic = "force-dynamic";

type WorkspaceSettingsPageProps = {
  params: Promise<{
    workspaceSlug: string;
  }>;
};

export default async function WorkspaceSettingsPage({
  params,
}: WorkspaceSettingsPageProps) {
  const { workspaceSlug } = await params;

  return <WorkspaceAuthPanel workspaceSlug={workspaceSlug} />;
}
