import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import type { Database } from "../src/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(
  url !== "http://127.0.0.1:54321" || !key || !secret,
  "Disposable local Supabase only.",
);
const run = randomUUID();
const password = `Aa1-${randomUUID()}!`;
const emails = {
  quiz: `placement-quiz-${run}@example.test`,
  skip: `placement-skip-${run}@example.test`,
  arabic: `placement-ar-${run}@example.test`,
  next: `placement-next-${run}@example.test`,
  enrolled: `placement-enrolled-${run}@example.test`,
};
const ids: Record<string, string> = {};
const sql = (query: string) =>
  execFileSync(
    "docker",
    ["exec", "supabase_db_etriplesoft-learn-local", "psql", "-X", "-A", "-t", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", query],
    { encoding: "utf8" },
  ).trim();

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const service = createClient<Database>(url!, secret!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const [name, email] of Object.entries(emails)) {
    const { data } = await service.auth.admin.createUser({ email, password, email_confirm: true });
    if (!data.user) throw new Error("Local test users could not be created.");
    ids[name] = data.user.id;
  }
  // A learner already taking a course is not redirected.
  const learner = createClient<Database>(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
  await learner.auth.signInWithPassword({ email: emails.enrolled, password });
  const courseId = sql("SELECT id FROM public.courses WHERE slug='crash-course-odoo-erp'");
  const { error } = await learner.rpc("learner_grant_free_enrollment", { p_course_id: courseId });
  if (error) throw new Error(`Enrollment fixture failed: ${error.code}`);
});

async function login(page: Page, email: string, locale = "en", next?: string) {
  await page.goto(`/${locale}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.locator("input[name=email]").fill(email);
  await page.locator("input[name=password]").fill(password);
  await page.locator("form.auth-fields button[type=submit]").click();
  await page.waitForURL((current) => !current.pathname.endsWith("/login"));
}

const question = (page: Page, prompt: RegExp) => page.getByRole("group", { name: prompt });

test("a new learner takes the level check and sees recommendations", async ({ page }) => {
  await login(page, emails.quiz);
  await expect(page).toHaveURL(/\/en\/placement$/);
  await expect(page.getByRole("heading", { level: 2, name: "What brings you here?" })).toBeVisible();

  await page.getByRole("radio", { name: "I build or customize Odoo (developer)" }).check();
  // The developer role pre-selects the technical area.
  await expect(page.getByRole("checkbox", { name: /Developing and administering Odoo/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Using and implementing Odoo/ })).not.toBeChecked();
  await page.getByRole("radio", { name: "Regularly" }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { level: 2, name: "Quick skill check" })).toBeFocused();
  await expect(page.getByRole("group", { name: /Question/ })).toHaveCount(4);
  await page.getByRole("button", { name: "See my results" }).click();
  await expect(page.locator(".pl-error")).toContainText("Answer every question");

  await question(page, /print\(len/).getByRole("radio", { name: "3", exact: true }).check();
  await question(page, /declares its name/).getByRole("radio", { name: "__manifest__.py" }).check();
  await question(page, /persistent Odoo model/).getByRole("radio", { name: "models.TransientModel" }).check();
  await question(page, /res\.partner/).getByRole("radio", { name: /_inherit/ }).check();
  await page.getByRole("button", { name: "See my results" }).click();

  await expect(page.getByRole("heading", { level: 2, name: "Your starting point" })).toBeVisible();
  await expect(page.getByText("3 of 4 correct")).toBeVisible();
  await expect(page.locator(".pl-level")).toHaveText("Intermediate");

  await page.getByRole("link", { name: "See my recommended courses" }).click();
  await expect(page).toHaveURL(/\/en\/overview$/);
  const section = page.getByRole("region", { name: "Recommended for you" });
  await expect(section).toBeVisible();
  await expect(section.getByRole("list", { name: "Your level" })).toContainText("Intermediate");
  const first = section.locator(".ov-card").first();
  await expect(first.locator(".ov-start")).toHaveText("Start here");
  await expect(first.getByRole("heading", { level: 3 })).toHaveText("Odoo System Admin");
  await expect(first.locator(".ov-reason")).toHaveText("Matches your Intermediate level in Developing and administering Odoo");
  expect(sql(`SELECT count(*) FROM public.course_recommendation_events WHERE user_id='${ids.quiz}' AND event='shown'`)).not.toBe("0");

  await first.getByRole("heading", { level: 3 }).getByRole("link").click();
  await expect(page).toHaveURL(/\/en\/courses/);
  await expect
    .poll(() => sql(`SELECT count(*) FROM public.course_recommendation_events WHERE user_id='${ids.quiz}' AND event='clicked'`))
    .toBe("1");
});

test("changing goals keeps the measured level", async ({ page }) => {
  await login(page, emails.quiz);
  await expect(page).toHaveURL(/\/en\/overview$/);
  await page.getByRole("link", { name: "Change goals" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Change your goals" })).toBeVisible();
  await page.getByRole("checkbox", { name: /Using and implementing Odoo/ }).check();
  await page.getByRole("button", { name: "Save goals" }).click();
  await expect(page).toHaveURL(/\/en\/overview$/);
  const levels = page.getByRole("list", { name: "Your level" });
  await expect(levels).toContainText("Developing and administering OdooIntermediate");
  await expect(levels).toContainText("Using and implementing OdooBeginner");
});

test("skipping goes to the overview and is not asked again", async ({ page }) => {
  await login(page, emails.skip);
  await expect(page).toHaveURL(/\/en\/placement$/);
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page).toHaveURL(/\/en\/overview$/);
  await expect(page.getByRole("region", { name: "Find your level" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Available courses" })).toBeVisible();
  await page.goto("/en/overview");
  await expect(page).toHaveURL(/\/en\/overview$/);
});

test("Arabic learners with no Odoo experience skip the questions", async ({ page }) => {
  await login(page, emails.arabic, "ar");
  await expect(page).toHaveURL(/\/ar\/placement$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("radio", { name: "أستكشف Odoo لأول مرة" }).check();
  await page.getByRole("radio", { name: "لم أستخدمه" }).check();
  await expect(page.getByText("بما أنك جديد على Odoo")).toBeVisible();
  await page.getByRole("button", { name: "اعرض نتائجي" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "نقطة انطلاقك" })).toBeVisible();
  await expect(page.locator(".pl-results li")).toHaveCount(2);
  await page.getByRole("link", { name: "اعرض الدورات المقترحة لي" }).click();
  await expect(page.getByRole("region", { name: "مقترحة لك" })).toBeVisible();
});

test("signing in to continue somewhere else is never interrupted", async ({ page }) => {
  await login(page, emails.next, "en", "/en/courses");
  await expect(page).toHaveURL(/\/en\/courses/);
});

test("learners already taking a course see the prompt instead of the redirect", async ({ page }) => {
  await login(page, emails.enrolled);
  await expect(page).toHaveURL(/\/en\/overview$/);
  await expect(page.getByRole("region", { name: "Find your level" })).toBeVisible();
  await page.getByRole("link", { name: "Start level check" }).click();
  await expect(page).toHaveURL(/\/en\/placement$/);
});
