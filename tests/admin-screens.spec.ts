import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { completeAdminMfa, enrollTestAdminTotp, passAdminMfa } from "./support/admin-mfa";

// Phase 06 screen evidence: admin pages and the denied state in both locales at the eight
// required widths, plus keyboard/focus checks. Writes users and append-only audit rows that can
// never be deleted, so it only runs when PHASE06_LIVE=1 (use the disposable local Supabase).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const live = Boolean(url && publishableKey && serviceKey && process.env.PHASE06_LIVE === "1");

const widths = [320, 375, 430, 768, 1024, 1280, 1440, 1920];
const shots = path.join("test-results", "phase06");

// Returns "" when the page fits, otherwise what widens the document. Content inside an
// overflow:auto/scroll container (such as the table wrapper) is allowed to be wider.
async function overflowReport(page: Page) {
  return page.evaluate(() => {
    const limit = window.innerWidth + 1;
    const scroller = (el: Element) => {
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        const x = getComputedStyle(node).overflowX;
        if (x === "auto" || x === "scroll" || x === "hidden") return true;
      }
      return false;
    };
    if (document.documentElement.scrollWidth <= limit) return "";
    const offenders = [...document.querySelectorAll("body *")]
      .filter((el) => !scroller(el) && el.getBoundingClientRect().right > limit)
      .slice(0, 6)
      .map((el) => `${el.tagName.toLowerCase()}.${(el as HTMLElement).className} right=${Math.round(el.getBoundingClientRect().right)}`);
    const widest = [...document.querySelectorAll("body *")]
      .map((el) => ({ el, right: el.getBoundingClientRect().right }))
      .sort((x, y) => y.right - x.right)
      .slice(0, 4)
      .map(({ el, right }) => {
        const chain: string[] = [];
        for (let n: Element | null = el; n && n !== document.body && chain.length < 4; n = n.parentElement) chain.push(`${n.tagName.toLowerCase()}.${(n as HTMLElement).className}[ox=${getComputedStyle(n).overflowX},pos=${getComputedStyle(n).position}]`);
        return `${Math.round(right)}: ${chain.join(" < ")}`;
      });
    return `scrollWidth=${document.documentElement.scrollWidth} inner=${window.innerWidth} offenders: ${offenders.join(" | ") || "none outside scroll containers"} WIDEST: ${widest.join(" || ")}`;
  });
}

test.describe("admin screens", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!live, "Set PHASE06_LIVE=1 with the Supabase URL, publishable key and a process-only service-role key.");

  const runId = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  const password = `Aa1-${randomBytes(12).toString("base64url")}`;
  const emailOf = (label: string) => `codex-screens-${runId}-${label}@example.test`;
  const ids: Record<string, string> = {};
  let service: SupabaseClient<Database>;
  let adminSecret = "";

  async function login(page: Page, locale: "en" | "ar", label: string, { mfa = true } = {}) {
    await page.goto(`/${locale}/login`);
    await page.locator('input[name="email"]').fill(emailOf(label));
    await page.locator('input[name="password"]').fill(password);
    await page.locator("form.auth-fields button[type=submit]").click();
    await expect(page).not.toHaveURL(/\/login/);
    if (label === "admin" && mfa) await completeAdminMfa(page, locale, adminSecret);
  }

  test.beforeAll(async () => {
    fs.mkdirSync(shots, { recursive: true });
    service = createClient<Database>(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    for (const label of ["admin", "learner", "instructor"]) {
      const { data, error } = await service.auth.admin.createUser({ email: emailOf(label), password, email_confirm: true, user_metadata: { display_name: `Screens ${label}` } });
      if (error || !data.user) throw new Error(`createUser ${label} failed: ${error?.message}`);
      ids[label] = data.user.id;
    }
    // Bootstrap as the operator script does, plus one more grant so the tables have rows.
    for (const [label, role] of [["admin", "admin"], ["instructor", "instructor"]] as const) {
      const { error } = await service.from("user_roles").insert({ user_id: ids[label], role, granted_by: ids.admin });
      if (error) throw new Error(`grant ${label} failed: ${error.message}`);
    }
    adminSecret = await enrollTestAdminTotp(url!, publishableKey!, emailOf("admin"), password);
  });

  for (const locale of ["en", "ar"] as const) {
    test(`admin pages and the denied state fit at all eight widths (${locale})`, async ({ page }) => {
      test.setTimeout(240000);
      const dir = locale === "ar" ? "rtl" : "ltr";

      // The authentication-code screen comes first for a password-only admin session.
      await login(page, locale, "admin", { mfa: false });
      await page.goto(`/${locale}/admin`);
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.locator("#admin-mfa-title")).toBeVisible();
        expect(await overflowReport(page), `MFA screen overflows at ${width}`).toBe("");
        await page.screenshot({ path: path.join(shots, `${locale}-mfa-${width}.png`) });
      }
      await passAdminMfa(page, adminSecret);

      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of ["admin/roles", "admin/audit"]) {
          await page.goto(`/${locale}/${route}`);
          await page.waitForLoadState("networkidle");
          await expect(page.locator("html")).toHaveAttribute("dir", dir);
          await expect(page.getByRole("table").first()).toBeVisible();
          await page.screenshot({ path: path.join(shots, `${locale}-${route.replace("/", "-")}-${width}.png`), fullPage: true });
          expect(await overflowReport(page), `${route} overflows at ${width}`).toBe("");
        }
      }

      await page.context().clearCookies();
      await login(page, locale, "learner");
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${locale}/admin`);
        await expect(page.locator(".admin-denied")).toBeVisible();
        await expect(page.getByRole("table")).toHaveCount(0);
        expect(await overflowReport(page), `denied overflows at ${width}`).toBe("");
        await page.screenshot({ path: path.join(shots, `${locale}-denied-${width}.png`) });
      }
    });

    test(`the grant form is keyboard operable with named controls and visible focus (${locale})`, async ({ page }) => {
      await login(page, locale, "admin");
      await page.goto(`/${locale}/admin/roles`);

      // Every form control and button has an accessible name.
      for (const control of await page.locator("main form input:not([type=hidden]), main form select, main form button").all()) {
        const name = (await control.getAttribute("aria-label")) || (await control.innerText().catch(() => "")) || (await control.evaluate((el) => (el as HTMLInputElement).labels?.[0]?.textContent ?? "")) || "";
        expect(name.trim().length, "control needs an accessible name").toBeGreaterThan(0);
      }

      // Tab through the form: each stop needs a visible focus indicator.
      await page.locator('input[name="email"]').focus();
      const stops: string[] = [];
      for (let step = 0; step < 4; step += 1) {
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const s = getComputedStyle(el);
          return { name: el.getAttribute("name") || el.textContent?.trim() || el.tagName, visible: (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none" };
        });
        stops.push(info.name);
        expect(info.visible, `focus indicator on ${info.name}`).toBe(true);
        await page.keyboard.press("Tab");
      }
      expect(stops).toContain("email");
      expect(stops).toContain("role");

      // Keyboard-only submit of an unknown address yields a linked, announced error.
      await page.locator('input[name="email"]').fill(emailOf("nobody"));
      await page.keyboard.press("Enter");
      await expect(page.getByRole("alert").first()).toBeVisible();
    });
  }
});
