import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3002";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.spec.ts",
  timeout: 30_000,
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command: "powershell -ExecutionPolicy Bypass -File scripts/start-e2e.ps1",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
