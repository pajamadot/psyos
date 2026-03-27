"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  type AuthActivityFeed,
  type AuthConfig,
  type AuthSession,
  type AuthSessionInventory,
  type AuthSessionRevokeResponse,
  authActivityFeedSchema,
  authConfigSchema,
  authEmailConsumeResponseSchema,
  authEmailRequestResponseSchema,
  authSessionInventorySchema,
  authSessionRevokeResponseSchema,
  authSessionSchema,
} from "@psyos/contracts";

type WorkspaceAuthPanelProps = {
  workspaceSlug: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.psyos.org";

async function parseResponse<T>(
  response: Response,
  parser: { parse(input: unknown): T },
) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return parser.parse(payload);
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "unknown";

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatAuthEventLabel(eventType: string) {
  switch (eventType) {
    case "magic_link_requested":
      return "Magic link requested";
    case "magic_link_failed":
      return "Magic link failed";
    case "magic_link_consumed":
      return "Magic link consumed";
    case "session_created":
      return "Session created";
    case "session_revoked":
      return "Session revoked";
    default:
      return eventType;
  }
}

export function WorkspaceAuthPanel({ workspaceSlug }: WorkspaceAuthPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionInventory, setSessionInventory] =
    useState<AuthSessionInventory | null>(null);
  const [activityFeed, setActivityFeed] = useState<AuthActivityFeed | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [consumedToken, setConsumedToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const authToken = searchParams?.get("auth_token") ?? null;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const configResponse = await fetch(`${apiBaseUrl}/api/v1/auth/config`, {
          cache: "no-store",
          credentials: "include",
        });

        const nextConfig = await parseResponse(
          configResponse,
          authConfigSchema,
        );

        if (cancelled) return;
        setConfig(nextConfig);

        if (authToken && authToken !== consumedToken) {
          return;
        }

        const sessionResponse = await fetch(
          `${apiBaseUrl}/api/v1/auth/session?workspaceSlug=${encodeURIComponent(workspaceSlug)}`,
          {
            cache: "no-store",
            credentials: "include",
          },
        );
        const nextSession = await parseResponse(
          sessionResponse,
          authSessionSchema,
        );

        if (cancelled) return;
        setSession(nextSession);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load auth status.",
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [authToken, consumedToken, workspaceSlug]);

  useEffect(() => {
    if (!authToken || authToken === consumedToken) {
      return;
    }

    setConsumedToken(authToken);
    setError(null);
    setStatus("Consuming magic link...");

    startTransition(() => {
      void fetch(`${apiBaseUrl}/api/v1/auth/email/consume-link`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          token: authToken,
          workspaceSlug,
        }),
      })
        .then((response) =>
          parseResponse(response, authEmailConsumeResponseSchema),
        )
        .then((payload) => {
          setPreviewUrl(null);
          setSession(payload.session);
          setStatus("Signed in. The workspace session is now active.");
          router.replace(`/workspaces/${workspaceSlug}/settings`);
        })
        .catch((consumeError) => {
          setError(
            consumeError instanceof Error
              ? consumeError.message
              : "Unable to consume the login link.",
          );
          setStatus(null);
        });
    });
  }, [authToken, consumedToken, router, workspaceSlug]);

  useEffect(() => {
    if (!session?.authenticated) {
      setSessionInventory(null);
      setActivityFeed(null);
      return;
    }

    let cancelled = false;

    const loadAuthControlPlane = async () => {
      try {
        const [sessionsResponse, activityResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/auth/sessions`, {
            cache: "no-store",
            credentials: "include",
          }),
          fetch(`${apiBaseUrl}/api/v1/auth/activity?limit=12`, {
            cache: "no-store",
            credentials: "include",
          }),
        ]);

        const nextInventory = await parseResponse(
          sessionsResponse,
          authSessionInventorySchema,
        );
        const nextActivity = await parseResponse(
          activityResponse,
          authActivityFeedSchema,
        );

        if (cancelled) return;
        setSessionInventory(nextInventory);
        setActivityFeed(nextActivity);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load auth control-plane data.",
        );
      }
    };

    void loadAuthControlPlane();

    return () => {
      cancelled = true;
    };
  }, [session?.authenticated]);

  const handleRequestLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus("Requesting sign-in link...");
    setPreviewUrl(null);

    startTransition(() => {
      void fetch(`${apiBaseUrl}/api/v1/auth/email/request-link`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          displayName: displayName || undefined,
          workspaceSlug,
        }),
      })
        .then((response) =>
          parseResponse(response, authEmailRequestResponseSchema),
        )
        .then((payload) => {
          setStatus(payload.message);
          setPreviewUrl(payload.delivery.previewUrl ?? null);
        })
        .catch((requestError) => {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to request a sign-in link.",
          );
          setStatus(null);
        });
    });
  };

  const handleSignOut = async () => {
    setError(null);
    setStatus("Signing out...");

    startTransition(() => {
      void fetch(`${apiBaseUrl}/api/v1/auth/sign-out`, {
        method: "POST",
        credentials: "include",
      })
        .then((response) =>
          parseResponse(response, { parse: (input) => input }),
        )
        .then(() => {
          setSession({
            authenticated: false,
            user: null,
            workspaceMemberships: [],
            currentWorkspaceMembership: null,
            workspaceIdentity: null,
            expiresAt: null,
          });
          setSessionInventory(null);
          setActivityFeed(null);
          setStatus("Signed out.");
          setPreviewUrl(null);
        })
        .catch((signOutError) => {
          setError(
            signOutError instanceof Error
              ? signOutError.message
              : "Unable to sign out.",
          );
          setStatus(null);
        });
    });
  };

  const handleRevokeSession = async (sessionId: string) => {
    setError(null);
    setStatus("Revoking session...");

    startTransition(() => {
      void fetch(`${apiBaseUrl}/api/v1/auth/sessions/revoke`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
        }),
      })
        .then((response) =>
          parseResponse<AuthSessionRevokeResponse>(
            response,
            authSessionRevokeResponseSchema,
          ),
        )
        .then(async (payload) => {
          setSessionInventory(payload.inventory);

          if (payload.currentSessionCleared) {
            setSession({
              authenticated: false,
              user: null,
              workspaceMemberships: [],
              currentWorkspaceMembership: null,
              workspaceIdentity: null,
              expiresAt: null,
            });
            setActivityFeed(null);
            setStatus("Current session revoked. This browser is signed out.");
            return;
          }

          const activityResponse = await fetch(
            `${apiBaseUrl}/api/v1/auth/activity?limit=12`,
            {
              cache: "no-store",
              credentials: "include",
            },
          );
          const nextActivity = await parseResponse(
            activityResponse,
            authActivityFeedSchema,
          );

          setActivityFeed(nextActivity);
          setStatus("Session revoked.");
        })
        .catch((revokeError) => {
          setError(
            revokeError instanceof Error
              ? revokeError.message
              : "Unable to revoke the selected session.",
          );
          setStatus(null);
        });
    });
  };

  const currentMembership = session?.currentWorkspaceMembership;

  return (
    <div className="workspace-page">
      <section className="workspace-hero workspace-hero-compact">
        <div className="workspace-hero-main">
          <p className="eyebrow">PsyOS / Auth And Identity</p>
          <h1>Real user auth, agent keys, one workspace control plane.</h1>
          <p className="workspace-lede">
            Humans authenticate into the product with email magic links now.
            OAuth is modeled and exposed in config, while agents stay on
            workspace-scoped API keys. This panel is bound to
            <code> {workspaceSlug} </code>.
          </p>
          <div className="workspace-cta-row">
            <a
              className="primary-cta"
              href={`${apiBaseUrl}/api/v1/auth/config`}
            >
              Auth Config API
            </a>
            <a
              className="secondary-cta"
              href={`${apiBaseUrl}/api/v1/auth/session?workspaceSlug=${workspaceSlug}`}
            >
              Session API
            </a>
            <Link
              className="secondary-cta"
              href={`/workspaces/${workspaceSlug}`}
            >
              Back to workspace
            </Link>
          </div>
        </div>

        <aside className="workspace-command-panel">
          <p className="panel-kicker">Live Auth State</p>
          <ul className="status-list">
            <li>
              <span>Signed in</span>
              <strong>{session?.authenticated ? "yes" : "no"}</strong>
            </li>
            <li>
              <span>Cookie</span>
              <strong>{config?.sessionCookieName ?? "loading"}</strong>
            </li>
            <li>
              <span>Email provider</span>
              <strong>{config?.emailProvider ?? "loading"}</strong>
            </li>
            <li>
              <span>Current role</span>
              <strong>{currentMembership?.role ?? "none"}</strong>
            </li>
            <li>
              <span>Research identity</span>
              <strong>{session?.workspaceIdentity?.handle ?? "unbound"}</strong>
            </li>
          </ul>
        </aside>
      </section>

      <section className="workspace-grid auth-grid">
        <article className="workspace-panel">
          <p className="panel-kicker">Magic Link</p>
          <h2>Dogfood the first working human login loop.</h2>
          <form className="auth-form" onSubmit={handleRequestLink}>
            <label className="auth-field">
              <span>Email</span>
              <input
                autoComplete="email"
                data-testid="auth-email-input"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@psyos.org"
                required
                type="email"
                value={email}
              />
            </label>
            <label className="auth-field">
              <span>Display name</span>
              <input
                autoComplete="name"
                data-testid="auth-display-name-input"
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Research Operator"
                type="text"
                value={displayName}
              />
            </label>
            <div className="auth-actions">
              <button
                className="primary-cta auth-button"
                data-testid="auth-request-link-button"
                disabled={isPending}
                type="submit"
              >
                {isPending ? "Working..." : "Email me a sign-in link"}
              </button>
              {session?.authenticated ? (
                <button
                  className="secondary-cta auth-button"
                  data-testid="auth-sign-out-button"
                  disabled={isPending}
                  onClick={handleSignOut}
                  type="button"
                >
                  Sign out
                </button>
              ) : null}
            </div>
          </form>

          {status ? (
            <p className="auth-response" data-testid="auth-status-message">
              {status}
            </p>
          ) : null}
          {error ? (
            <p
              className="auth-response auth-response-error"
              data-testid="auth-error-message"
            >
              {error}
            </p>
          ) : null}
          {previewUrl ? (
            <p className="auth-response" data-testid="auth-preview-container">
              Preview mode is active. Open{" "}
              <a
                data-testid="auth-preview-link"
                href={previewUrl}
                rel="noreferrer"
              >
                the login link
              </a>
              .
            </p>
          ) : null}
        </article>

        <article className="workspace-panel">
          <p className="panel-kicker">Session</p>
          <h2>Current browser session and workspace binding.</h2>
          {session?.authenticated && session.user ? (
            <div className="auth-user-card">
              <div>
                <span className="status-chip" data-testid="auth-user-state">
                  authenticated
                </span>
                <h3>{session.user.displayName}</h3>
                <p data-testid="auth-user-email">{session.user.primaryEmail}</p>
              </div>
              <ul className="plain-list">
                <li>User handle: {session.user.handle ?? "pending"}</li>
                <li>Workspace role: {currentMembership?.role ?? "none"}</li>
                <li>
                  Research identity:{" "}
                  {session.workspaceIdentity?.handle ?? "not projected yet"}
                </li>
                <li>Session expiry: {session.expiresAt ?? "unknown"}</li>
              </ul>
            </div>
          ) : (
            <p className="workspace-lede" data-testid="auth-anon-empty-state">
              No active browser session. Request a magic link and then follow it
              from the email to bind this browser to the workspace.
            </p>
          )}
        </article>

        <article className="workspace-panel">
          <p className="panel-kicker">Providers</p>
          <h2>OAuth stays in the model; email works today.</h2>
          <div className="auth-provider-grid">
            {config?.providers.map((provider) => (
              <div className="auth-provider-card" key={provider.id}>
                <div className="card-topline">
                  <span className="status-chip">{provider.state}</span>
                  <span className="project-chip">{provider.actorKind}</span>
                </div>
                <h3>{provider.label}</h3>
                <p>{provider.strategy}</p>
              </div>
            )) ?? (
              <p className="workspace-lede">
                Loading provider configuration...
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="workspace-grid auth-grid">
        <article className="workspace-panel">
          <p className="panel-kicker">Memberships</p>
          <h2>Users and research identities stay separate.</h2>
          <ul className="plain-list">
            {session?.workspaceMemberships.length ? (
              session.workspaceMemberships.map((membership) => (
                <li key={membership.id}>
                  {membership.workspaceName} / {membership.role} /{" "}
                  {membership.status}
                </li>
              ))
            ) : (
              <li>No workspace memberships yet.</li>
            )}
          </ul>
        </article>

        <article className="workspace-panel">
          <p className="panel-kicker">Sessions</p>
          <h2>See every live browser session and revoke remote devices.</h2>
          {sessionInventory?.sessions.length ? (
            <div className="auth-session-list">
              {sessionInventory.sessions.map((managedSession) => (
                <div
                  className="auth-session-row"
                  data-current={managedSession.isCurrent ? "true" : "false"}
                  data-testid="auth-session-row"
                  key={managedSession.id}
                >
                  <div className="card-topline">
                    <span
                      className="status-chip"
                      data-testid="auth-session-state"
                    >
                      {managedSession.isCurrent ? "current" : "active"}
                    </span>
                    <span
                      className="project-chip"
                      data-testid="auth-session-agent"
                    >
                      {managedSession.userAgent ?? "unknown client"}
                    </span>
                  </div>
                  <div className="auth-session-meta">
                    <span>
                      Created {formatTimestamp(managedSession.createdAt)}
                    </span>
                    <span>
                      Last seen {formatTimestamp(managedSession.lastSeenAt)}
                    </span>
                    <span>
                      Expires {formatTimestamp(managedSession.expiresAt)}
                    </span>
                  </div>
                  {!managedSession.isCurrent ? (
                    <button
                      className="secondary-cta auth-button auth-inline-button"
                      data-testid="auth-revoke-session-button"
                      disabled={isPending}
                      onClick={() => handleRevokeSession(managedSession.id)}
                      type="button"
                    >
                      Revoke session
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p
              className="workspace-lede auth-empty-state"
              data-testid="auth-session-empty-state"
            >
              No live browser sessions beyond this page.
            </p>
          )}
        </article>

        <article className="workspace-panel">
          <p className="panel-kicker">Activity</p>
          <h2>Recent authentication events stay visible to the operator.</h2>
          {activityFeed?.events.length ? (
            <div className="auth-activity-list">
              {activityFeed.events.map((event) => (
                <div
                  className="auth-activity-row"
                  data-testid="auth-activity-row"
                  key={event.id}
                >
                  <div className="card-topline">
                    <span
                      className="status-chip"
                      data-testid="auth-activity-type"
                    >
                      {formatAuthEventLabel(event.eventType)}
                    </span>
                    <span
                      className="project-chip"
                      data-testid="auth-activity-workspace"
                    >
                      {event.workspaceSlug ?? "global"}
                    </span>
                  </div>
                  <div className="auth-activity-meta">
                    <span>{formatTimestamp(event.createdAt)}</span>
                    <span>{event.userAgent ?? "unknown client"}</span>
                    {typeof event.metadata.reason === "string" ? (
                      <span>{event.metadata.reason}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p
              className="workspace-lede auth-empty-state"
              data-testid="auth-activity-empty-state"
            >
              Auth activity appears here after the first successful sign-in.
            </p>
          )}
        </article>
      </section>

      <section className="workspace-grid auth-grid">
        <article className="workspace-panel">
          <p className="panel-kicker">Email And Test Path</p>
          <h2>Hosted email stays cheap, integration stays deterministic.</h2>
          <ul className="plain-list">
            <li>Resend is the hosted provider path.</li>
            <li>Mailpit is the local and integration inbox harness.</li>
            <li>
              Preview mode exists for local dogfooding when no mail provider is
              configured.
            </li>
            <li>
              Agents stay on API keys. Human sessions stay browser-bound and
              explicit.
            </li>
          </ul>
        </article>

        <article className="workspace-panel">
          <p className="panel-kicker">Specs</p>
          <h2>Keep the operator contract visible.</h2>
          <ul className="plain-list">
            <li>
              <a
                href="https://github.com/pajamadot/psyos/blob/main/docs/auth-system.md"
                rel="noreferrer"
                target="_blank"
              >
                Auth system spec
              </a>
            </li>
            <li>
              <a
                href="https://github.com/pajamadot/psyos/blob/main/docs/environment-contract.md"
                rel="noreferrer"
                target="_blank"
              >
                Environment contract
              </a>
            </li>
            <li>
              <a href={`${apiBaseUrl}/api/v1/maintenance/system`}>
                Maintenance system
              </a>
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
