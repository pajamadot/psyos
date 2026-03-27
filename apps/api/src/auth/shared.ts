import type { Bindings } from "./types";

export const authSessionCookieName = "psyos_session";
export const emailTokenTtlMinutes = 20;

const hexFromArrayBuffer = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");

export const sha256Hex = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  return hexFromArrayBuffer(await crypto.subtle.digest("SHA-256", bytes));
};

export const randomHex = (byteLength = 32) =>
  hexFromArrayBuffer(crypto.getRandomValues(new Uint8Array(byteLength)).buffer);

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const deriveDisplayName = (email: string, displayName?: string) => {
  if (displayName?.trim()) return displayName.trim();

  const local = email.split("@")[0] ?? "Researcher";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
};

const sanitizeHandle = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "researcher";

export const getHandleSeed = (value: string) => sanitizeHandle(value);

export const getAuthEmailProvider = (bindings: Bindings) => {
  if (bindings.AUTH_EMAIL_PROVIDER?.trim()) {
    return bindings.AUTH_EMAIL_PROVIDER.trim().toLowerCase();
  }

  return getDeployEnvironment(bindings) === "development"
    ? "preview"
    : "disabled";
};

export const getAuthCookieDomain = (bindings: Bindings) => {
  if (bindings.AUTH_COOKIE_DOMAIN?.trim()) {
    return bindings.AUTH_COOKIE_DOMAIN.trim();
  }

  try {
    const hostname = new URL(getPublicWebUrl(bindings)).hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
    ) {
      return undefined;
    }

    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return undefined;
  }
};

export const getSessionTtlDays = (bindings: Bindings) => {
  const parsed = Number.parseInt(bindings.AUTH_SESSION_TTL_DAYS ?? "30", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
};

export const getUserAgent = (context: {
  req: { header(name: string): string | undefined };
}) => {
  const userAgent = context.req.header("user-agent")?.trim();
  return userAgent ? userAgent.slice(0, 512) : null;
};

const getDeployEnvironment = (bindings: Bindings) =>
  bindings.DEPLOY_ENVIRONMENT ?? "production";

const getPublicWebUrl = (bindings: Bindings) =>
  bindings.PUBLIC_WEB_URL ?? "https://psyos.org";
