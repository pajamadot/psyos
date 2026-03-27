import { expect, test } from "@playwright/test";

function buildUserEmail(prefix: string) {
  const timestamp = Date.now();
  return `${prefix}-${timestamp}@psyos.local`;
}

async function requestPreviewLink(
  page: import("@playwright/test").Page,
  email: string,
  displayName: string,
) {
  await page.getByTestId("auth-email-input").fill(email);
  await page.getByTestId("auth-display-name-input").fill(displayName);
  await page.getByTestId("auth-request-link-button").click();
  await expect(page.getByTestId("auth-preview-link")).toBeVisible();
  return page.getByTestId("auth-preview-link");
}

async function completePreviewLogin(
  page: import("@playwright/test").Page,
  email: string,
  displayName: string,
) {
  const previewLink = await requestPreviewLink(page, email, displayName);
  await previewLink.click();
  await expect(page).toHaveURL(/\/workspaces\/psyos-lab\/settings$/);
  await expect(page.getByTestId("auth-user-state")).toHaveText("authenticated");
  await expect(page.getByTestId("auth-user-email")).toHaveText(email);
}

test.describe("workspace auth UX", () => {
  test("requests a preview magic link and signs the operator in", async ({
    page,
  }) => {
    const email = buildUserEmail("preview-login");

    await page.goto("/workspaces/psyos-lab/settings");

    await expect(page.getByTestId("auth-request-link-button")).toBeVisible();
    await expect(page.getByTestId("auth-anon-empty-state")).toBeVisible();

    await completePreviewLogin(page, email, "Preview Operator");

    await expect(page.getByTestId("auth-session-row")).toHaveCount(1);
    await expect(
      page.locator('[data-testid="auth-session-row"][data-current="true"]'),
    ).toHaveCount(1);
    await expect(page.getByTestId("auth-activity-row")).toHaveCount(3);
    await expect(
      page
        .getByTestId("auth-activity-type")
        .filter({ hasText: "Session created" }),
    ).toBeVisible();
  });

  test("shows multi-session management, remote revoke, and sign-out", async ({
    browser,
    page,
  }) => {
    const email = buildUserEmail("session-management");

    await page.goto("/workspaces/psyos-lab/settings");
    await completePreviewLogin(page, email, "Session Owner");

    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();

    try {
      await secondPage.goto("/workspaces/psyos-lab/settings");
      await completePreviewLogin(secondPage, email, "Session Owner");

      await page.reload();
      await expect(page.getByTestId("auth-session-row")).toHaveCount(2);
      await expect(page.getByTestId("auth-revoke-session-button")).toHaveCount(
        1,
      );

      await page.getByTestId("auth-revoke-session-button").click();
      await expect(page.getByTestId("auth-status-message")).toHaveText(
        "Session revoked.",
      );
      await expect(page.getByTestId("auth-session-row")).toHaveCount(1);

      await secondPage.reload();
      await expect(
        secondPage.getByTestId("auth-anon-empty-state"),
      ).toBeVisible();
      await expect(
        secondPage.getByTestId("auth-request-link-button"),
      ).toBeVisible();

      await page.getByTestId("auth-sign-out-button").click();
      await expect(page.getByTestId("auth-status-message")).toHaveText(
        "Signed out.",
      );
      await expect(page.getByTestId("auth-anon-empty-state")).toBeVisible();
    } finally {
      await secondContext.close();
    }
  });

  test("drives study publish, opportunity, and run ingestion from the workspace surface", async ({
    page,
  }) => {
    const email = buildUserEmail("workspace-surface");
    const studySlug = "reaction-time-baseline";
    const versionLocator = page.getByTestId(`study-version-${studySlug}`);
    const runRows = page.getByTestId(`study-run-row-${studySlug}`);

    await page.goto("/workspaces/psyos-lab/settings");
    await completePreviewLogin(page, email, "Workspace Operator");

    await page.goto("/workspaces/psyos-lab");
    await expect(page.getByTestId("study-control-surface")).toBeVisible();
    await expect(page.getByTestId("study-viewer-state")).toHaveText(
      "authenticated",
    );
    await expect(page.getByTestId("study-viewer-role")).toContainText(
      "researcher",
    );
    await expect(page.getByText("study / publish")).toBeVisible();
    await expect(page.getByText("opportunity / manage")).toBeVisible();
    await expect(page.getByText("result / write")).toBeVisible();

    const beforeVersion = Number.parseInt(
      ((await versionLocator.textContent()) ?? "0").replace(/\D/g, ""),
      10,
    );

    await page
      .getByTestId(`study-publish-changelog-${studySlug}`)
      .fill("Playwright dogfood publish of the workspace control surface.");
    await page.getByTestId(`study-publish-button-${studySlug}`).click();
    await expect(
      page.getByText("Study published and latest version advanced."),
    ).toBeVisible();
    await expect(versionLocator).toHaveText(`v${beforeVersion + 1}`);

    await page
      .getByTestId(`study-create-opportunity-instructions-${studySlug}`)
      .fill(
        "Complete the refreshed publish and confirm the timing trace still matches expected cadence.",
      );
    await page
      .getByTestId(`study-create-opportunity-button-${studySlug}`)
      .click();
    await expect(page.getByText("Opportunity created.")).toBeVisible();
    await expect(
      page.getByText("Created an opportunity for Reaction Time Baseline."),
    ).toBeVisible();

    const beforeRunCount = await runRows.count();

    await page.getByTestId(`study-run-event-count-${studySlug}`).fill("37");
    await page.getByTestId(`study-run-summary-${studySlug}`).fill(
      JSON.stringify(
        {
          source: "playwright",
          latency_ms: 241,
          artifact: "control-surface",
        },
        null,
        2,
      ),
    );
    await page.getByTestId(`study-ingest-run-button-${studySlug}`).click();
    await expect(page.getByText("Run ingested.")).toBeVisible();
    await expect(runRows).toHaveCount(beforeRunCount + 1);
  });
});
