import { defineConfig, devices } from "@playwright/test";

const webPort = 3100;
const apiPort = 8788;
const webUrl = `http://127.0.0.1:${webPort}`;
const apiUrl = `http://127.0.0.1:${apiPort}`;

export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html"], ["list"]] : "list",
  use: {
    baseURL: webUrl,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @psyos/api dev:e2e",
      url: `${apiUrl}/healthz`,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        PSYOS_E2E_API_HOST: "127.0.0.1",
        PSYOS_E2E_API_PORT: String(apiPort),
        PSYOS_E2E_WEB_URL: webUrl,
      },
    },
    {
      command: "pnpm --filter @psyos/web serve:e2e",
      url: `${webUrl}/workspaces/psyos-lab/settings`,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        PSYOS_API_URL: apiUrl,
        NEXT_PUBLIC_API_URL: apiUrl,
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
