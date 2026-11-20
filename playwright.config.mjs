import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const hasSiteUrl = Boolean(process.env.SITE_TEST_URL);

export default defineConfig({
  testDir: "./tests",
  testMatch: "browser.spec.mjs",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: 2,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: process.env.SITE_TEST_URL ?? "http://127.0.0.1:4183",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: hasSiteUrl
    ? undefined
    : {
        command: "npm run preview",
        url: "http://127.0.0.1:4183/",
        reuseExistingServer: !isCi,
        timeout: 30_000,
      },
});
