import { createLovableConfig } from "lovable-agent-playwright-config/config";

const PORT = Number(process.env.E2E_PORT ?? 4173);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default createLovableConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }], ["junit", { outputFile: "playwright-report/junit.xml" }]]
    : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Skip starting a webServer when an external base URL is supplied
  // (e.g. running against the deployed Lovable preview).
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run preview -- --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      },
});
