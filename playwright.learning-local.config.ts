import { defineConfig } from "@playwright/test";
import { chromiumExecutable, nextDevCommand } from "./playwright.shared";
const baseURL = "http://127.0.0.1:3016";
if (
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321" ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
)
  throw new Error(
    "Use local-only Supabase credentials for learning verification.",
  );
export default defineConfig({
  testDir: "tests",
  testMatch: ["learning-flow.spec.ts", "assessment-flow.spec.ts", "i18n-messages.spec.ts", "messages-flow.spec.ts", "placement-flow.spec.ts", "admin-analytics.spec.ts", "organizations-flow.spec.ts"],
  workers: 1,
  use: {
    baseURL,
    launchOptions: { executablePath: chromiumExecutable() },
  },
  webServer: {
    command: nextDevCommand(3016),
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_DIST_DIR: "tmp/learning-flow-next",
      MUX_ALLOWED_ORIGINS: baseURL,
      AUTH_SITE_URL: baseURL,
      KASHIER_CHECKOUT_ENABLED: "false",
    },
  },
  reporter: "list",
});
