import { defineConfig } from "@playwright/test";
import fs from "node:fs";

const baseURL = "http://127.0.0.1:3012";
const bundled =
  "C:/Users/Ahmed/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";

export default defineConfig({
  testDir: "tests",
  testMatch: "phase09-loading.spec.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 320, height: 900 },
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (fs.existsSync(bundled) ? bundled : undefined),
    },
  },
  webServer: {
    command: "node tests/support/phase09-loading-app.mjs",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  reporter: "list",
});
