import { defineConfig } from "@playwright/test";
import fs from "node:fs";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3010";
const appPort = new URL(baseURL).port || "3010";
const bundled =
  "C:/Users/Ahmed/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  workers: 1,
  use: {
  baseURL,
    viewport: { width: 1448, height: 1086 },
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (fs.existsSync(bundled) ? bundled : undefined),
    },
  },
  webServer: {
    command: `npm.cmd exec -- next dev --hostname 127.0.0.1 --port ${appPort}`,
    url: baseURL,
    reuseExistingServer: true,
  },
  reporter: "list",
});
