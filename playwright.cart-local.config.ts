import { defineConfig } from "@playwright/test";
import { chromiumExecutable, nextDevCommand } from "./playwright.shared";

// Signed-in cart checkout against Local Supabase only. Checkout is enabled so the cart can create
// orders; the suite never presses Pay, so no Kashier session is requested.
const baseURL = "http://127.0.0.1:3017";
if (
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321" ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
)
  throw new Error("Use local-only Supabase credentials for cart verification.");

export default defineConfig({
  testDir: "tests",
  testMatch: ["cart-checkout-local.spec.ts"],
  workers: 1,
  use: {
    baseURL,
    launchOptions: { executablePath: chromiumExecutable() },
  },
  webServer: {
    command: nextDevCommand(3017),
    url: `${baseURL}/en`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_DIST_DIR: "tmp/cart-local-next",
      AUTH_SITE_URL: baseURL,
      KASHIER_CHECKOUT_ENABLED: "true",
      KASHIER_MODE: "test",
      KASHIER_WEBHOOK_URL: "",
    },
  },
  reporter: "list",
});
