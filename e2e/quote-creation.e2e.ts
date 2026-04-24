import { test, expect } from "@playwright/test";
import { getCreds, login } from "./helpers/auth";

/**
 * "Quote creation" in this build maps to creating a draft rental reservation
 * (the closest thing to a quote in the current schema). The test:
 *   1. Ensures a customer exists
 *   2. Creates a draft reservation against that customer
 *   3. Verifies it appears in the Reservations list
 */
test.describe("Quote / reservation creation", () => {
  test.beforeEach(async ({ page }) => {
    const creds = getCreds("admin");
    test.skip(!creds, "Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to run this flow.");
    await login(page, creds!);
  });

  test("admin can create a customer and a draft reservation", async ({ page }) => {
    const stamp = Date.now();
    const customerName = `E2E Customer ${stamp}`;

    // --- Create customer ---
    await page.goto("/app/customers");
    await expect(page.getByRole("heading", { name: /customers/i })).toBeVisible();
    await page.getByRole("button", { name: /new customer/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^name$/i).fill(customerName);
    await dialog.getByLabel(/^email$/i).fill(`e2e+${stamp}@example.com`);
    await dialog.getByRole("button", { name: /save/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
    await expect(page.getByRole("cell", { name: customerName })).toBeVisible();

    // --- Create reservation ---
    await page.goto("/app/reservations");
    await expect(page.getByRole("heading", { name: /reservations/i })).toBeVisible();
    await page.getByRole("button", { name: /new reservation/i }).click();
    const resDialog = page.getByRole("dialog");

    // Customer select (Radix Select uses combobox role).
    await resDialog.getByRole("combobox").click();
    await page.getByRole("option", { name: customerName }).click();

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    await resDialog.getByLabel(/start date/i).fill(fmt(today));
    await resDialog.getByLabel(/end date/i).fill(fmt(tomorrow));
    await resDialog.getByLabel(/total amount/i).fill("250");
    await resDialog.getByLabel(/notes/i).fill(`E2E reservation ${stamp}`);

    await resDialog.getByRole("button", { name: /create/i }).click();
    await expect(resDialog).toBeHidden({ timeout: 10_000 });

    // Should appear in the list table.
    await expect(page.getByRole("cell", { name: customerName })).toBeVisible();
  });
});
