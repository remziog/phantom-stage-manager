import { test, expect } from "@playwright/test";
import { getCreds, login } from "./helpers/auth";

const PAGES = [
  { path: "/app", heading: /dashboard|overview|welcome/i },
  { path: "/app/customers", heading: /customers/i },
  { path: "/app/reservations", heading: /reservations/i },
  { path: "/app/assets", heading: /assets|inventory/i },
  { path: "/app/invoices", heading: /invoices/i },
];

test.describe("Smoke: key pages render without console errors", () => {
  test.beforeEach(async ({ page }) => {
    const creds = getCreds("admin");
    test.skip(!creds, "Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to run smoke checks.");
    await login(page, creds!);
  });

  for (const { path, heading } of PAGES) {
    test(`renders ${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
      });

      await page.goto(path);
      // If module gating sent us back to /app, skip — that page isn't enabled for this account.
      if (!page.url().includes(path) && path !== "/app") {
        test.skip(true, `${path} is not enabled for this account.`);
      }

      await expect(page.getByRole("heading").first()).toBeVisible();
      await expect(page.getByRole("heading").first()).toHaveText(heading);

      // Filter noisy third-party warnings; fail on anything else.
      const meaningful = errors.filter(
        (e) => !/Failed to load resource|favicon|ResizeObserver|Download the React DevTools/i.test(e),
      );
      expect(meaningful, `Console errors on ${path}:\n${meaningful.join("\n")}`).toHaveLength(0);
    });
  }
});
