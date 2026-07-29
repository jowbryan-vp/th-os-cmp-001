import { defineConfig, devices } from "@playwright/test";

const publicBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  expect: {
    timeout: publicBaseURL ? 15_000 : 5_000,
  },
  use: {
    baseURL: publicBaseURL ?? "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: publicBaseURL ? undefined : {
    command: "node node_modules/vinext/dist/cli.js dev -p 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
