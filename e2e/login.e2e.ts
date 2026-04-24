import { test, expect } from "@playwright/test";
import { getCreds, login, expectAuthRedirect } from "./helpers/auth";

test.describe("Authentication & redirects", () => {
  test("unauthenticated user is redirected to /login from protected routes", async ({ page }) => {
    await expectAuthRedirect(page, "/app");
    await expectAuthRedirect(page, "/app/customers");
    await expectAuthRedirect(page, "/app/reservations");
  });

  test("login form rejects invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("not-a-user@example.com");
    await page.getByLabel(/password/i).first().fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Toast surfaces the error and we stay on /login.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/sign in failed/i)).toBeVisible({ timeout: 10_000 });
  });

  test("admin login lands on the dashboard (role redirect)", async ({ page }) => {
    const creds = getCreds("admin");
    test.skip(!creds, "Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to run this test.");
    await login(page, creds!);
    await expect(page).toHaveURL(/\/app(\/|$)/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("operator login lands on the dashboard", async ({ page }) => {
    const creds = getCreds("operator");
    test.skip(!creds, "Set E2E_OPERATOR_EMAIL / E2E_OPERATOR_PASSWORD to run this test.");
    await login(page, creds!);
    await expect(page).toHaveURL(/\/app(\/|$)/);
  });
});
