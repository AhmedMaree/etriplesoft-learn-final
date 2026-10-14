import { defineConfig } from "@playwright/test";
import fs from "node:fs";
const baseURL = "http://127.0.0.1:3016";
if (
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321" ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
)
  throw new Error(
    "Use local-only Supabase credentials for learning verification.",
  );
const executable =
  "C:/Users/Ahmed/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";
export default defineConfig({
  testDir: "tests",
  testMatch: ["learning-flow.spec.ts", "assessment-flow.spec.ts", "i18n-messages.spec.ts"],
  workers: 1,
  use: {
    baseURL,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (fs.existsSync(executable) ? executable : undefined),
    },
  },
  webServer: {
    command: "npm.cmd exec -- next dev --hostname 127.0.0.1 --port 3016",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_DIST_DIR: "tmp/learning-flow-next",
      MUX_ALLOWED_ORIGINS: baseURL,
      AUTH_SITE_URL: baseURL,
    },
  },
  reporter: "list",
});
