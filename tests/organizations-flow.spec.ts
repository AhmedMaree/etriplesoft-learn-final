import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";
import type { Database } from "../src/types/database";
import { completeAdminMfa, enrollTestAdminTotp } from "./support/admin-mfa";

// B2B end to end: an admin creates an organization and invites its manager, the manager invites a member,
// the admin grants seats, the manager assigns a course and opens checkout for more seats. Then the
// organization screens are checked in both locales at the eight required widths. Local Supabase only.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(url !== "http://127.0.0.1:54321" || !key || !secret, "Disposable local Supabase only.");

const widths = [320, 375, 430, 768, 1024, 1280, 1440, 1920];
const shots = path.join("test-results", "organizations");
const run = randomUUID().slice(0, 8);
const password = `Aa1-${randomUUID()}!`;
const emailOf = (label: string) => `org-${label}-${run}@example.test`;
const orgName = `QA Org ${run}`;
const ids: Record<string, string> = {};
let adminSecret = "";
let orgId = "";
let course: { id: string; title: string } | null = null;
const sql = (query: string) =>
  execFileSync(
    "docker",
    ["exec", "supabase_db_etriplesoft-learn-local", "psql", "-X", "-A", "-t", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", query],
    { encoding: "utf8" },
  ).trim();

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

async function login(page: Page, label: string, locale: "en" | "ar" = "en") {
  await page.goto(`/${locale}/login`);
  await page.locator('input[name="email"]').fill(emailOf(label));
  await page.locator('input[name="password"]').fill(password);
  await page.locator("form.auth-fields button[type=submit]").click();
  await expect(page).not.toHaveURL(/\/login/);
  if (label === "admin" && adminSecret) await completeAdminMfa(page, locale, adminSecret);
}

async function newPage(browser: Browser) {
  const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  return context.newPage();
}

// Creates invitation(s) on the current invitations tab and returns the first link.
async function invite(page: Page, email: string, role: "member" | "manager") {
  await page.getByLabel("Email addresses").fill(email);
  await page.getByLabel("Role").selectOption(role);
  await page.getByRole("button", { name: "Create invitations" }).click();
  const link = page.getByLabel("Invitation link", { exact: true }).first();
  await expect(link).toBeVisible();
  return link.inputValue();
}

test.describe("organizations", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    fs.mkdirSync(shots, { recursive: true });
    const service: SupabaseClient<Database> = createClient<Database>(url!, secret!, { auth: { autoRefreshToken: false, persistSession: false } });
    for (const label of ["admin", "manager", "member"]) {
      const { data, error } = await service.auth.admin.createUser({
        email: emailOf(label),
        password,
        email_confirm: true,
        user_metadata: { display_name: `Org ${label}` },
      });
      if (error || !data.user) throw new Error(`createUser ${label} failed: ${error?.message}`);
      ids[label] = data.user.id;
    }
    const { error } = await service.from("user_roles").insert({ user_id: ids.admin, role: "admin", granted_by: ids.admin });
    if (error) throw new Error(`grant admin failed: ${error.message}`);
    const mfaRequired = sql("SELECT coalesce((SELECT mfa_required FROM learning_private.admin_security), true)") === "t";
    if (mfaRequired) adminSecret = await enrollTestAdminTotp(url!, key!, emailOf("admin"), password);
    // A published paid course with an English title, for seat grants and purchases.
    const row = sql(
      "SELECT c.id || '|' || t.title FROM public.courses c JOIN public.course_translations t ON t.course_id = c.id AND t.locale = 'en' AND t.publication_status = 'published' WHERE c.status = 'published' AND c.price_minor > 0 ORDER BY c.created_at LIMIT 1",
    );
    if (row) {
      const [id, ...title] = row.split("|");
      course = { id, title: title.join("|") };
    }
  });

  test.afterAll(() => {
    if (ids.admin) sql(`UPDATE public.user_roles SET revoked_at = now(), revoked_by = user_id WHERE user_id = '${ids.admin}' AND revoked_at IS NULL`);
  });

  test("an admin creates an organization and its manager joins through the invitation", async ({ page, browser }) => {
    await login(page, "admin");
    await page.goto("/en/admin/organizations");
    await page.getByLabel("Name").fill(orgName);
    await page.getByLabel("Type").selectOption("company");
    await page.getByRole("button", { name: "Create organization" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/organizations\/[0-9a-f-]{36}\?tab=invitations/);
    orgId = page.url().match(/organizations\/([0-9a-f-]{36})/)![1];
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(orgName);
    const link = await invite(page, emailOf("manager"), "manager");
    expect(link).toMatch(/\/en\/join\?code=[A-Za-z0-9_-]{32}$/);

    // The invitation link survives sign-in and is accepted by the invited account.
    const manager = await newPage(browser);
    await manager.goto(link);
    await expect(manager).toHaveURL(/\/login\?next=/);
    await manager.locator('input[name="email"]').fill(emailOf("manager"));
    await manager.locator('input[name="password"]').fill(password);
    await manager.locator("form.auth-fields button[type=submit]").click();
    await expect(manager).toHaveURL(/\/en\/join\?code=/);
    await expect(manager.getByRole("heading", { name: `Join ${orgName}` })).toBeVisible();
    await manager.getByRole("button", { name: /Accept invitation/ }).click();
    await expect(manager).toHaveURL(new RegExp(`/en/organization\\?org=${orgId}`));
    await expect(manager.getByRole("navigation", { name: "Organization sections" })).toBeVisible();
    await expect(manager.locator(".sidebar-admin-link", { hasText: "Organization" })).toBeVisible();

    // A forwarded link does not work for someone else.
    const other = await newPage(browser);
    await login(other, "member");
    await other.goto(link);
    await expect(other.getByRole("heading", { name: "This invitation is not available" })).toBeVisible();
    await other.context().close();
    await manager.context().close();
  });

  test("the manager invites a member and the admin grants seats", async ({ page, browser }) => {
    await login(page, "manager");
    await page.goto(`/en/organization?org=${orgId}&tab=invitations`);
    const link = await invite(page, emailOf("member"), "member");
    await expect(page.locator("tbody tr", { hasText: emailOf("member") })).toBeVisible();

    const member = await newPage(browser);
    await login(member, "member");
    await member.goto(link);
    await expect(member.getByText(/managers can see your progress/)).toBeVisible();
    await member.getByRole("button", { name: /Accept invitation/ }).click();
    await expect(member).toHaveURL(/\/en\/organization/);
    await expect(member.getByText(/Courses your organization assigns you/)).toBeVisible();
    // Members cannot open management.
    await member.goto(`/en/organization?org=${orgId}&tab=members`);
    await expect(member.locator(".admin-table")).toHaveCount(0);
    await member.context().close();

    test.skip(!course, "No published paid course in the local catalog.");
    const admin = await newPage(browser);
    await login(admin, "admin");
    await admin.goto(`/en/admin/organizations/${orgId}`);
    await admin.locator("#org-grant-course").selectOption(course!.id);
    await admin.locator("#org-grant-seats").fill("2");
    await admin.getByRole("button", { name: "Grant seats" }).click();
    await expect(admin.getByText("Seats granted.")).toBeVisible();
    await admin.context().close();
  });

  test("the manager assigns a seat, sees the member's progress and opens checkout for more seats", async ({ page }) => {
    test.skip(!course, "No published paid course in the local catalog.");
    await login(page, "manager");
    await page.goto(`/en/organization?org=${orgId}&tab=members`);
    await page.locator("#org-assign-course").selectOption(course!.id);
    await page.getByRole("checkbox", { name: new RegExp(emailOf("member")) }).check();
    await page.getByRole("button", { name: "Assign seats" }).click();
    await expect(page.getByText("Seats assigned.")).toBeVisible();

    await page.getByRole("link", { name: /Org member/ }).click();
    await expect(page).toHaveURL(new RegExp(`/en/organization/members/${ids.member}\\?org=${orgId}`));
    await expect(page.locator("tbody tr", { hasText: course!.title })).toContainText("In progress");

    await page.goto(`/en/organization?org=${orgId}&tab=buy`);
    await page.locator("#org-buy-course").selectOption(course!.id);
    await page.locator("#org-buy-seats").fill("3");
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await expect(page).toHaveURL(/\/en\/payment\?order=[0-9a-f-]{36}&step=checkout/);
    await expect(page.getByText(`${course!.title} × 3 seats`).first()).toBeVisible();
  });

  for (const locale of ["en", "ar"] as const) {
    test(`organization screens fit at all eight widths (${locale})`, async ({ page, browser }) => {
      test.setTimeout(300_000);
      const errors: string[] = [];
      const watch = (target: Page) => {
        target.on("console", (message) => message.type() === "error" && errors.push(`${target.url()}: ${message.text()}`));
        target.on("pageerror", (error) => errors.push(`${target.url()}: ${error.message}`));
      };
      watch(page);
      await login(page, "manager", locale);
      const admin = await newPage(browser);
      watch(admin);
      await login(admin, "admin", locale);
      const routes: [Page, string][] = [
        [page, `organization?org=${orgId}`],
        [page, `organization?org=${orgId}&tab=members`],
        [page, `organization?org=${orgId}&tab=invitations`],
        [page, `organization?org=${orgId}&tab=buy`],
        [page, `organization/members/${ids.member}?org=${orgId}`],
        [admin, "admin/organizations"],
        [admin, `admin/organizations/${orgId}`],
        [admin, `admin/organizations/${orgId}?tab=members`],
      ];
      for (const width of widths) {
        for (const [target, route] of routes) {
          await target.setViewportSize({ width, height: 900 });
          await target.goto(`/${locale}/${route}`);
          await target.waitForLoadState("networkidle");
          await expect(target.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
          await expect(target.locator(".admin-denied")).toHaveCount(0);
          expect(await overflow(target), `${route} overflows at ${width}`).toBe("");
          const name = route.replace(/[0-9a-f-]{36}/g, "id").replace(/[/?=&]+/g, "-");
          await target.screenshot({ path: path.join(shots, `${locale}-${name}-${width}.png`), fullPage: true });
        }
      }
      expect(errors, "console errors").toEqual([]);
      await admin.context().close();
    });
  }
});
