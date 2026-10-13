import { defineConfig } from "@playwright/test";
import fs from "node:fs";

const baseURL = "http://127.0.0.1:3015";
const bundled =
  "C:/Users/Ahmed/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";

if (!process.env.PHASE10_LOCAL_ANON_KEY) {
  throw new Error("Set PHASE10_LOCAL_ANON_KEY to a short-lived token for the local Supabase instance only.");
}

export default defineConfig({
  testDir: "tests",
  testMatch: "enrollment-authenticated-ui.spec.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 375, height: 1000 },
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (fs.existsSync(bundled) ? bundled : undefined),
    },
  },
  webServer: {
    command: "npm.cmd exec -- next dev --hostname 127.0.0.1 --port 3015",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_DIST_DIR: "tmp/phase10-authenticated-next",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.PHASE10_LOCAL_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  },
  reporter: "list",
});
