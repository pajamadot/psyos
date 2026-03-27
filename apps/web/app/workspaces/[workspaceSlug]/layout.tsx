import { notFound } from "next/navigation";

import { WorkspaceSidebar } from "../../../components/workspace-sidebar";
import { getWorkspaceSnapshot } from "../../../lib/api";

export const dynamic = "force-dynamic";

type WorkspaceLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    workspaceSlug: string;
  }>;
};

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { workspaceSlug } = await params;
  const snapshot = await getWorkspaceSnapshot(workspaceSlug);

  if (!snapshot?.workspace) {
    notFound();
  }

  return (
    <div className="dashboard-shell">
      <WorkspaceSidebar
        workspaceName={snapshot.workspace.name}
        workspaceSlug={snapshot.workspace.slug}
      />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
