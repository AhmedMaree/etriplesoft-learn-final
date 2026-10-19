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
const learnerEmail = `msg-learner-${run}@example.test`;
const instructorEmail = `msg-instructor-${run}@example.test`;
const otherEmail = `msg-other-${run}@example.test`;
const slug = `messages-${run}`;
const subject = `Installing Odoo ${run.slice(0, 8)}`;
const sql = (query: string) =>
  execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_etriplesoft-learn-local",
      "psql",
      "-X",
      "-A",
      "-t",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      query,
    ],
    { encoding: "utf8" },
  ).trim();

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const service = createClient<Database>(url!, secret!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ids: Record<string, string> = {};
  for (const [name, email, displayName] of [
    ["learner", learnerEmail, "Mona Learner"],
    ["instructor", instructorEmail, "Omar Instructor"],
    ["other", otherEmail, "Other Learner"],
  ]) {
    const { data } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (!data.user) throw new Error("Local test users could not be created.");
    ids[name] = data.user.id;
  }
  // The course is created directly (no admin MFA fixture needed); the instructor holds the role and
  // the course link, which together make them staff for this course's conversations.
  sql(`
    INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('${ids.instructor}','instructor','${ids.instructor}');
    WITH c AS (INSERT INTO public.courses(slug,status,published_at,created_by,updated_by)
      VALUES('${slug}','published',now(),'${ids.instructor}','${ids.instructor}') RETURNING id)
    INSERT INTO public.course_translations(course_id,locale,title,summary,publication_status,published_at)
      SELECT id,l,CASE l WHEN 'en' THEN 'Messaging course' ELSE 'دورة المراسلة' END,'Local test','published',now()
      FROM c, unnest(ARRAY['en','ar']) l;
    INSERT INTO public.course_instructors(course_id,position,profile_id,display_name,assigned_by)
      SELECT id,1,'${ids.instructor}','Omar Instructor','${ids.instructor}' FROM public.courses WHERE slug='${slug}';
  `);
  const learner = createClient<Database>(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await learner.auth.signInWithPassword({ email: learnerEmail, password });
  const courseId = sql(`SELECT id FROM public.courses WHERE slug='${slug}'`);
  const { error } = await learner.rpc("learner_grant_free_enrollment", {
    p_course_id: courseId,
  });
  if (error) throw new Error(`Enrollment fixture failed: ${error.code}`);
});

async function login(page: Page, email: string, locale = "en") {
  await page.goto(`/${locale}/login`);
  await page.locator("input[name=email]").fill(email);
  await page.locator("input[name=password]").fill(password);
  await page.locator("form.auth-fields button[type=submit]").click();
  await page.waitForURL((current) => !current.pathname.endsWith("/login"));
}

test("learner starts a course conversation from the course link", async ({ page }) => {
  await login(page, learnerEmail);
  await page.goto(`/en/messages?new=${slug}`);
  const dialog = page.getByRole("dialog", { name: "New message" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /A course instructor/ })).toBeChecked();
  await expect(dialog.getByRole("combobox", { name: "Course" })).toHaveValue(/.+/);
  await expect(dialog.getByText("Answered by Omar Instructor")).toBeVisible();
  await dialog.getByLabel("Subject").fill(subject);
  await dialog.getByLabel("Message").fill("How do I install Odoo 18 on Windows?");
  await dialog.getByRole("button", { name: "Send" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { level: 2, name: subject })).toBeVisible();
  await expect(page.getByRole("log").getByText("How do I install Odoo 18 on Windows?")).toBeVisible();
  await expect(page).toHaveURL(/thread=[0-9a-f-]{36}/);
});

test("instructor sees it awaiting a reply and answers", async ({ page }) => {
  await login(page, instructorEmail);
  await page.goto("/en/messages");
  await expect(page.getByText("1 unread conversation")).toBeAttached();
  await page.getByRole("tab", { name: /Learner inbox/ }).click();
  const item = page.getByRole("button", { name: new RegExp(subject) });
  await expect(item).toContainText("Mona Learner");
  await expect(item).toContainText("Awaiting reply");
  await item.click();
  await expect(page.getByRole("log").getByText("Mona Learner")).toBeVisible();
  const reply = page.getByLabel("Your reply");
  await reply.fill("Download the Windows installer from odoo.com, then open http://localhost:8069.");
  await reply.press("Control+Enter");
  await expect(page.getByRole("log").getByText(/localhost:8069/)).toBeVisible();
  await expect(item).not.toContainText("Awaiting reply");
});

test("learner reads the staff reply and closes the conversation", async ({ page }) => {
  await login(page, learnerEmail);
  await page.goto("/en/messages");
  const item = page.getByRole("button", { name: new RegExp(subject) });
  await expect(item.getByLabel("1 unread")).toBeVisible();
  await item.click();
  const log = page.getByRole("log");
  await expect(log.getByText(/localhost:8069/)).toBeVisible();
  await expect(log.getByText("Staff")).toBeVisible();
  await expect(log.getByText("Seen")).toBeVisible();
  await expect(item.getByLabel("1 unread")).toHaveCount(0);
  await page.getByRole("button", { name: "Close conversation" }).click();
  await expect(page.getByText("This conversation is closed.")).toBeVisible();
  await expect(page.getByLabel("Your reply")).toHaveCount(0);
  await page.getByRole("button", { name: "Closed", exact: true }).click();
  await expect(item).toBeVisible();
});

test("Arabic inbox renders right-to-left", async ({ page }) => {
  await login(page, learnerEmail, "ar");
  await page.goto("/ar/messages");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "المحادثات" })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(subject) })).toContainText("دورة المراسلة");
});

test("another learner cannot open the conversation", async ({ page }) => {
  await login(page, otherEmail);
  const thread = sql(`SELECT id FROM public.message_threads WHERE subject='${subject}'`);
  await page.goto(`/en/messages?thread=${thread}`);
  await expect(page.getByText("This conversation isn’t available.", { exact: false })).toBeVisible();
  await expect(page.getByText(/localhost:8069/)).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /Learner inbox/ })).toHaveCount(0);
});
