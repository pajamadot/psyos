"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type WorkspaceSidebarProps = {
  workspaceName: string;
  workspaceSlug: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
  external?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function buildNav(workspaceSlug: string): NavGroup[] {
  const base = `/workspaces/${workspaceSlug}`;

  return [
    {
      label: "Workspace",
      items: [
        { href: `${base}`, label: "Overview", icon: "OV" },
        { href: `${base}#roadmap`, label: "Roadmap", icon: "DG" },
        { href: `${base}#studies`, label: "Studies", icon: "ST" },
        { href: `${base}#assets`, label: "Assets", icon: "AS" },
      ],
    },
    {
      label: "System",
      items: [
        { href: `${base}/settings`, label: "Auth", icon: "ID" },
        {
          href: "https://api.psyos.org/api/v1/docs",
          label: "OpenAPI",
          icon: "API",
          external: true,
        },
        {
          href: "https://api.psyos.org/api/v1/maintenance/system",
          label: "System",
          icon: "SYS",
          external: true,
        },
      ],
    },
  ];
}

function isActive(pathname: string | null, href: string) {
  if (href.startsWith("http")) {
    return false;
  }

  const normalized = href.split("#")[0];
  return pathname === normalized;
}

export function WorkspaceSidebar({
  workspaceName,
  workspaceSlug,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const navGroups = buildNav(workspaceSlug);

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-header">
        <p className="sidebar-label">PsyOS</p>
        <h1>{workspaceName}</h1>
        <p className="sidebar-slug">{workspaceSlug}</p>
      </div>

      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <section className="sidebar-group" key={group.label}>
            <p className="sidebar-group-label">{group.label}</p>
            <div className="sidebar-group-links">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const className = `sidebar-link${active ? " is-active" : ""}`;

                if (item.external) {
                  return (
                    <a
                      className={className}
                      href={item.href}
                      key={item.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="sidebar-link-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </a>
                  );
                }

                return (
                  <Link className={className} href={item.href} key={item.href}>
                    <span className="sidebar-link-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p className="sidebar-footer-title">Human auth</p>
        <p>
          OAuth plus email sign-in for users. Workspace-scoped API keys for
          agents.
        </p>
      </div>
    </aside>
  );
}
