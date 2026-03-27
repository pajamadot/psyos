"use client";

type SchemaParser<T> = {
  parse(input: unknown): T;
};

const browserApiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.psyos.org";

export function getBrowserApiBaseUrl() {
  return browserApiBaseUrl;
}

export async function parseApiResponse<T>(
  response: Response,
  parser: SchemaParser<T>,
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

export async function fetchBrowserApi<T>(
  path: string,
  parser: SchemaParser<T>,
  init?: RequestInit,
) {
  const target = path.startsWith("http") ? path : `${browserApiBaseUrl}${path}`;
  const response = await fetch(target, {
    cache: "no-store",
    credentials: "include",
    ...init,
  });

  return parseApiResponse(response, parser);
}
