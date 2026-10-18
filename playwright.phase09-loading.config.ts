import { defineConfig } from "@playwright/test";
import { chromiumExecutable } from "./playwright.shared";

const baseURL = "http://127.0.0.1:3012";

export default defineConfig({
  testDir: "tests",
  testMatch: "phase09-loading.spec.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 320, height: 900 },
    launchOptions: { executablePath: chromiumExecutable() },
  },
  webServer: {
    command: "node tests/support/phase09-loading-app.mjs",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  reporter: "list",
});
