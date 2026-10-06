import { defineConfig } from "@playwright/test";
import fs from "node:fs";
const bundled =
  "C:/Users/Ahmed/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  workers: 1,
  use: {
  baseURL: "http://127.0.0.1:3010",
    viewport: { width: 1448, height: 1086 },
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (fs.existsSync(bundled) ? bundled : undefined),
    },
  },
  webServer: {
    command: "npm.cmd run dev",
    url: "http://127.0.0.1:3010",
    reuseExistingServer: true,
  },
  reporter: "list",
});
