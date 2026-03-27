import { serve } from "@hono/node-server";

import app from "./index";
import { buildTestDatabase } from "./test-helpers";

const host = process.env.PSYOS_E2E_API_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.PSYOS_E2E_API_PORT ?? "8788", 10);
const webUrl = process.env.PSYOS_E2E_WEB_URL ?? "http://127.0.0.1:3100";
const apiUrl = `http://${host}:${port}`;
const database = buildTestDatabase();

const env = {
  APP_NAME: "psyos-api-e2e",
  APP_VERSION: "0.1.0-e2e",
  DEPLOY_ENVIRONMENT: "development",
  DEPLOYED_VIA: "playwright",
  GIT_COMMIT: "local-e2e",
  PUBLIC_API_URL: apiUrl,
  PUBLIC_WEB_URL: webUrl,
  AUTH_EMAIL_PROVIDER: "preview",
  AUTH_SESSION_TTL_DAYS: "30",
  DB: database,
};

const server = serve({
  fetch: (request) => app.fetch(request, env),
  hostname: host,
  port,
});

const shutdown = () => {
  database.close();
  server.close();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`PsyOS auth E2E API listening on ${apiUrl}`);
