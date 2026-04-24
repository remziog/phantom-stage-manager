import { expect, type Page } from "@playwright/test";

export type TestRole = "admin" | "operator" | "viewer";

export interface TestCredentials {
  email: string;
  password: string;
}

/**
 * Resolve credentials for a role from environment variables. Tests that need a
 * specific role should call `requireCreds(role)` and skip if missing — this
 * keeps the suite runnable locally without all secrets configured.
 */
export function getCreds(role: TestRole): TestCredentials | null {
  const upper = role.toUpperCase();
  const email = process.env[`E2E_${upper}_EMAIL`] ?? process.env.E2E_TEST_EMAIL;
  const password = process.env[`E2E_${upper}_PASSWORD`] ?? process.env.E2E_TEST_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export async function login(page: Page, creds: TestCredentials): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).first().fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Land somewhere inside the app shell after login.
  await page.waitForURL(/\/(app|onboarding|create-company)(\/|$)/, { timeout: 20_000 });
}

export async function expectAuthRedirect(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page).toHaveURL(/\/login(\?|$)/);
}
