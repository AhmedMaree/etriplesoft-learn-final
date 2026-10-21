import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import type { Database } from "../src/types/database";
import { completeAdminMfa, enrollTestAdminTotp } from "./support/admin-mfa";

// Admin analytics screens in both locales at the eight required widths, the learner search, and the
// denied state for a learner. Creates users, so it only runs against the disposable local Supabase.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(url !== "http://127.0.0.1:54321" || !key || !secret, "Disposable local Supabase only.");

const widths = [320, 375, 430, 768, 1024, 1280, 1440, 1920];
const shots = path.join("test-results", "admin-analytics");
const run = randomUUID().slice(0, 8);
const password = `Aa1-${randomUUID()}!`;
const emailOf = (label: string) => `analytics-${label}-${run}@example.test`;
const ids: Record<string, string> = {};
let adminSecret = "";
const sql = (query: string) =>
  execFileSync(
    "docker",
    ["exec", "supabase_db_etriplesoft-learn-local", "psql", "-X", "-A", "-t", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", query],
    { encoding: "utf8" },
  ).trim();

// Returns "" when the page fits; content inside a scroll container (such as a table wrapper) may be wider.
async function overflow(page: Page) {
  return page.evaluate(() => {
    if (document.documentElement.scrollWidth <= window.innerWidth + 1) return "";
    const scrolls = (el: Element) => {
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        if (["auto", "scroll", "hidden"].includes(getComputedStyle(node).overflowX)) return true;
      }
      return false;
    };
    return [...document.querySelectorAll("body *")]
      .filter((el) => !scrolls(el) && el.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${(el as HTMLElement).className}`)
      .join(" | ") || `scrollWidth=${document.documentElement.scrollWidth}`;
  });
}

async function login(page: Page, locale: "en" | "ar", label: string) {
  await page.goto(`/${locale}/login`);
  await page.locator('input[name="email"]').fill(emailOf(label));
  await page.locator('input[name="password"]').fill(password);
  await page.locator("form.auth-fields button[type=submit]").click();
  await expect(page).not.toHaveURL(/\/login/);
  if (label === "admin" && adminSecret) await completeAdminMfa(page, locale, adminSecret);
}

test.describe("admin analytics", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    fs.mkdirSync(shots, { recursive: true });
    const service: SupabaseClient<Database> = createClient<Database>(url!, secret!, { auth: { autoRefreshToken: false, persistSession: false } });
    for (const label of ["admin", "learner"]) {
      const { data, error } = await service.auth.admin.createUser({
        email: emailOf(label),
        password,
        email_confirm: true,
        user_metadata: { display_name: `Analytics ${label}` },
      });
      if (error || !data.user) throw new Error(`createUser ${label} failed: ${error?.message}`);
      ids[label] = data.user.id;
    }
    const { error } = await service.from("user_roles").insert({ user_id: ids.admin, role: "admin", granted_by: ids.admin });
    if (error) throw new Error(`grant admin failed: ${error.message}`);
    const profile = await service.from("learner_profiles").insert({
      user_id: ids.learner,
      learner_type: "student",
      university: `Analytics QA University ${run}`,
      faculty: "Engineering",
    });
    if (profile.error) throw new Error(`learner profile failed: ${profile.error.message}`);
    // A local stack may run with the documented MFA dev switch off (learning_private.admin_security).
    const mfaRequired = sql("SELECT coalesce((SELECT mfa_required FROM learning_private.admin_security), true)") === "t";
    if (mfaRequired) adminSecret = await enrollTestAdminTotp(url!, key!, emailOf("admin"), password);
  });

  // Leave no extra active administrator behind: other database tests count them.
  test.afterAll(() => {
    if (ids.admin) sql(`UPDATE public.user_roles SET revoked_at = now(), revoked_by = user_id WHERE user_id = '${ids.admin}' AND revoked_at IS NULL`);
  });

  for (const locale of ["en", "ar"] as const) {
    test(`analytics pages fit at all eight widths (${locale})`, async ({ page }) => {
      test.setTimeout(300_000);
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(`${page.url()}: ${message.text()}`);
      });
      page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
      await login(page, locale, "admin");

      // A course detail page is included when the local catalog has a published course.
      await page.goto(`/${locale}/admin/analytics/courses`);
      const courseLink = page.locator('a[href*="/admin/analytics/courses/"]').first();
      const courseHref = (await courseLink.count()) ? await courseLink.getAttribute("href") : null;
      const routes = [
        "admin/analytics?range=30",
        "admin/analytics?range=365",
        "admin/analytics/courses?range=30",
        "admin/analytics/learners",
        "admin/institutions",
        "admin/institutions?kind=company",
        ...(courseHref ? [courseHref.replace(/^\/(en|ar)\//, "")] : []),
      ];

      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of routes) {
          await page.goto(`/${locale}/${route}`);
          // Let hydration finish first: the screenshot hides the text caret by styling inputs.
          await page.waitForLoadState("networkidle");
          await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
          await expect(page.locator(".admin-page-header h1")).toBeVisible();
          await expect(page.locator(".admin-denied")).toHaveCount(0);
          expect(await overflow(page), `${route} overflows at ${width}`).toBe("");
          const name = route.replace(/[/?=]+/g, "-").replace(/-[0-9a-f-]{36}/, "-course");
          await page.screenshot({ path: path.join(shots, `${locale}-${name}-${width}.png`), fullPage: true });
        }
      }
      expect(errors, "console errors").toEqual([]);
    });
  }

  test("the learner roster searches and filters", async ({ page }) => {
    await login(page, "en", "admin");
    await page.goto("/en/admin/analytics/learners");
    await page.getByRole("searchbox").fill(emailOf("learner"));
    await page.getByRole("button", { name: "Search" }).click();
    const row = page.locator("tbody tr");
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("Analytics QA University");
    await expect(row).toContainText("No course access");
    // Staff never appear in the roster.
    await page.goto(`/en/admin/analytics/learners?q=${encodeURIComponent(emailOf("admin"))}`);
    await expect(page.locator("tbody tr")).toHaveCount(0);
    // The segment filter keeps the search.
    await page.goto(`/en/admin/analytics/learners?q=${encodeURIComponent(emailOf("learner"))}`);
    await page.getByRole("navigation", { name: "Filter by access" }).getByRole("link", { name: "Paid" }).click();
    await expect(page).toHaveURL(/segment=paid/);
    await expect(page).toHaveURL(/q=/);
    await expect(page.locator("tbody tr")).toHaveCount(0);
  });

  test("a typed university name can be linked to a known institution", async ({ page }) => {
    await login(page, "en", "admin");
    await page.goto("/en/admin/institutions");
    const row = page.locator("tbody tr", { hasText: `Analytics QA University ${run}` });
    await expect(row).toHaveCount(1);
    await row.getByRole("combobox").selectOption({ label: "Cairo University" });
    await row.getByRole("button", { name: "Link" }).click();
    await expect(page.locator("tbody tr", { hasText: `Analytics QA University ${run}` })).toHaveCount(0);
    await page.goto(`/en/admin/analytics/learners?q=${encodeURIComponent(emailOf("learner"))}`);
    await expect(page.locator("tbody tr")).toContainText("Cairo University");
  });

  test("a learner gets the denied state and no figures", async ({ page }) => {
    await login(page, "en", "learner");
    await page.goto("/en/admin/analytics");
    await expect(page.locator(".admin-denied")).toBeVisible();
    await expect(page.locator(".admin-kpi")).toHaveCount(0);
  });
});
