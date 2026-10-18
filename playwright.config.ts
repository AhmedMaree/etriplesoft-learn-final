import { defineConfig } from "@playwright/test";
import { chromiumExecutable, nextDevCommand } from "./playwright.shared";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3010";
const appPort = new URL(baseURL).port || "3010";

export default defineConfig({
  testDir: "tests",
  // Needs its own proxy server: run with playwright.phase09-loading.config.ts.
  testIgnore: ["phase09-loading.spec.ts"],
  fullyParallel: true,
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 1448, height: 1086 },
    launchOptions: { executablePath: chromiumExecutable() },
  },
  webServer: {
    command: nextDevCommand(appPort),
    url: baseURL,
    reuseExistingServer: true,
    env: { NEXT_PUBLIC_SHOW_DEMO_FEATURES: "true" },
  },
  reporter: "list",
});
