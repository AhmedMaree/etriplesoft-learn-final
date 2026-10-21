import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { completeAdminMfa, enrollTestAdminTotp } from "./support/admin-mfa";

// Live end-to-end check of the AI assistant: real Gemini calls, local Supabase only.
// Run against an app server that uses local Supabase and has GEMINI_API_KEY, for example:
//   AI_LOCAL_TEST=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3011 npx playwright test tests/ai-assistant.spec.ts
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const localOnly =
  process.env.AI_LOCAL_TEST === "1" && url === "http://127.0.0.1:54321" && Boolean(serviceKey && publishableKey && process.env.GEMINI_API_KEY);
test.skip(!localOnly, "Opt in with AI_LOCAL_TEST=1, local Supabase credentials and GEMINI_API_KEY.");
test.describe.configure({ mode: "serial" });

const runId = randomUUID();
const email = `ai-assistant-${runId}@example.test`;
const password = `Aa1-${randomUUID()}!`;
const courseId = "c0000000-0000-4000-8000-000000000001"; // seeded free course, published in en and ar
// Course chat fixture: a video transcript on lesson 2.2 ("Session 2 / Accounting Module").
const fixtureLessonId = "90d286ba-5b44-e049-6c2e-adba432970d3";
const fixtureVideoId = "e5000000-0000-4000-8000-0000000000f1";
const fixtureTranscript = [
  "في الدرس ده هنشرح ازاي نعمل backup لل database في Odoo.",
  "ندخل على Settings وبعدين Manage Databases ونضغط على Backup جنب اسم ال database ونختار Backup Format zip عشان ياخد ال filestore كمان.",
  "عشان نرجع النسخة ندخل على Restore Database ونرفع ملف ال zip ونكتب اسم جديد لل database.",
].join("\n\n");
// A stable local operator account (audit rows reference it, so it is reused rather than deleted).
const adminEmail = "ai-spec-admin@example.test";
const adminPassword = "Aa1-ai-spec-admin-local!";
let userId = "";
let adminSecret = "";

function localSql(statement: string) {
  execFileSync("docker", ["exec", "supabase_db_etriplesoft-learn-local", "psql", "-X", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", statement], { stdio: "ignore" });
}

async function signIn(page: Page, account = { email, password }) {
  await page.context().clearCookies();
  await page.goto("/en/login");
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.locator("form.auth-fields button[type=submit]").click();
  await page.waitForURL((current) => !current.pathname.endsWith("/login"));
}

async function ask(page: Page, question: string) {
  const replies = page.locator(".message.assistant");
  const questions = page.locator(".message.user");
  const [before, asked] = [await replies.count(), await questions.count()];
  await page.getByRole("textbox", { name: /Ask the AI assistant|اسأل المساعد الذكي/ }).fill(question);
  await page.keyboard.press("Enter");
  await expect(page.locator(".send-button.stop")).toHaveCount(1);
  // Composer is released on "done": the stop button turns back into send.
  await expect(page.locator(".send-button.stop")).toHaveCount(0, { timeout: 120_000 });
  await expect(page.locator(".chat-error")).toHaveCount(0);
  await expect(questions).toHaveCount(asked + 1);
  await expect(replies).toHaveCount(before + 1);
  const reply = replies.last().locator(".bubble");
  await expect(reply.locator(".typing-dots")).toHaveCount(0);
  return (await reply.innerText()).trim();
}

test.beforeAll(async () => {
  const service = createClient<Database>(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`Could not create local AI learner: ${error?.message}`);
  userId = data.user.id;
  const learner = createClient<Database>(url!, publishableKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const signIn = await learner.auth.signInWithPassword({ email, password });
  if (signIn.error) throw new Error(`Could not sign in local AI learner: ${signIn.error.message}`);
  const enrolled = await learner.rpc("learner_grant_free_enrollment", { p_course_id: courseId });
  if (enrolled.error) throw new Error(`Could not enroll local AI learner: ${enrolled.error.message}`);
  const { data: existing } = await service.auth.admin.listUsers({ perPage: 1000 });
  let admin = existing.users.find((user) => user.email === adminEmail);
  if (!admin) {
    const created = await service.auth.admin.createUser({ email: adminEmail, password: adminPassword, email_confirm: true });
    if (created.error || !created.data.user) throw new Error(`Could not create local AI admin: ${created.error?.message}`);
    admin = created.data.user;
  }
  // The reused local admin gets a fresh TOTP factor each run (admin authority needs aal2).
  const factors = await service.auth.admin.mfa.listFactors({ userId: admin.id });
  for (const factor of factors.data?.factors ?? []) await service.auth.admin.mfa.deleteFactor({ id: factor.id, userId: admin.id });
  adminSecret = await enrollTestAdminTotp(url!, publishableKey!, adminEmail, adminPassword);
  localSql(`INSERT INTO public.user_roles(user_id,role,granted_by) SELECT '${admin.id}','admin','${admin.id}' WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id='${admin.id}' AND role='admin' AND revoked_at IS NULL);
    INSERT INTO public.lesson_videos(id,lesson_id,provider,bunny_video_id,status,duration_seconds,created_by) VALUES('${fixtureVideoId}','${fixtureLessonId}','bunny','0e500000-0000-4000-8000-000000000001','ready',60,'${admin.id}') ON CONFLICT (id) DO NOTHING;
    INSERT INTO ai_private.video_transcripts(lesson_video_id,provider_video_id,language,content,model,created_by) VALUES('${fixtureVideoId}','0e500000-0000-4000-8000-000000000001','ar',E'${fixtureTranscript}','fixture-transcript','${admin.id}') ON CONFLICT (lesson_video_id) DO NOTHING;`);
});

test.afterAll(async () => {
  if (!userId) return;
  // Owns only this synthetic local account; AI rows cascade from the profile.
  localSql(`DELETE FROM public.enrollments WHERE user_id = '${userId}'::uuid; DELETE FROM auth.users WHERE id = '${userId}'::uuid;
    DELETE FROM public.lesson_videos WHERE id = '${fixtureVideoId}'; DELETE FROM ai_private.course_chunks WHERE source_key = 'transcript:${fixtureVideoId}';`);
});

test("general chat reply is saved, titled, reopened and deleted", async ({ page }) => {
  test.setTimeout(300_000);
  await signIn(page);
  await page.goto("/en/ai-page");
  await expect(page.getByRole("tab", { name: "General chat" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".chat-course-banner")).toHaveCount(0);

  const answer = await ask(page, "In one short paragraph, what is a domain filter in Odoo?");
  expect(answer.length).toBeGreaterThan(20);
  await expect(page.locator(".message-sources")).toHaveCount(0);
  const recent = page.locator(".recent-item");
  await expect(recent).toHaveCount(1);
  await expect(page.locator(".insight b").first()).toHaveText("1");

  // Follow-up uses saved history in the same conversation.
  await ask(page, "Summarize your previous answer in one sentence.");
  await expect(recent).toHaveCount(1);
  await page.screenshot({ path: "tmp/ai-review/en-chat-1448.png", fullPage: true, style: "nextjs-portal { display: none !important; }" });

  // History persists across reloads and reopens with both turns.
  await page.reload();
  await expect(recent).toHaveCount(1);
  await expect(page.locator(".message.user")).toHaveCount(0);
  await recent.first().locator(".recent-row").click();
  await expect(page.locator(".message.user")).toHaveCount(2);
  await expect(page.locator(".message.assistant")).toHaveCount(3); // welcome + two saved replies

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete conversation", exact: true }).click();
  await expect(recent).toHaveCount(0);
  await expect(page.locator(".message.user")).toHaveCount(0);
});

test("Arabic replies, deep thinking and responsive layout", async ({ page }) => {
  test.setTimeout(300_000);
  await signIn(page);
  await page.goto("/ar/ai-page");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const arabic = await ask(page, "ما هو تطبيق Odoo CRM؟ أجب في جملتين.");
  expect(arabic).toMatch(/[؀-ۿ]/);

  await page.getByRole("switch", { name: "تفكير معمّق" }).click();
  const deep = await ask(page, "اختبرني بسؤال واحد عن المحاسبة في Odoo.");
  expect(deep).toMatch(/[؀-ۿ]/);

  for (const locale of ["ar", "en"] as const) {
    if (locale === "en") await page.goto("/en/ai-page");
    for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1086 });
      const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
      expect(size.content, `${locale} overflows at ${width}px`).toBeLessThanOrEqual(size.viewport + 1);
      if (width === 375 || width === 1440) {
        // A fresh load at this width; resizing an already-scrolled RTL page skews full-page captures.
        await page.reload();
        await page.screenshot({ path: `tmp/ai-review/${locale}-${width}.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
      }
    }
  }
});

test("course chat answers from indexed course content with lesson citations", async ({ page }) => {
  test.setTimeout(300_000);
  // An administrator rebuilds the course index (real Gemini embeddings).
  await signIn(page, { email: adminEmail, password: adminPassword });
  await completeAdminMfa(page, "en", adminSecret);
  await page.goto("/en/admin/ai");
  const row = page.locator("tr", { hasText: "crash-course-odoo-erp" });
  await row.getByRole("button", { name: /Rebuild index/ }).click();
  await expect(row.getByRole("status")).toHaveText("Index rebuilt.", { timeout: 180_000 });
  await expect(row).toContainText("passages");

  // The enrolled learner asks in English; the answer comes from the Arabic transcript, with a citation.
  await signIn(page);
  await page.goto("/en/ai-page");
  await page.getByRole("tab", { name: "Course chat" }).click();
  await expect(page.locator(".chat-course-banner")).toContainText("Crash Course Odoo ERP");
  const answer = await ask(page, "How do I back up my Odoo database, including the filestore?");
  expect(answer).toMatch(/backup|back up/i);
  // Answered in the question's language (English), although the source transcript is Arabic.
  expect((answer.match(/[A-Za-z]/g) ?? []).length).toBeGreaterThan((answer.match(/[؀-ۿ]/g) ?? []).length);
  expect(answer).toMatch(/\[\d+\]/);
  const citation = page.locator(".message-sources a").filter({ hasText: "Accounting Module" });
  await expect(citation).toHaveCount(1);
  await expect(citation).toHaveAttribute("href", new RegExp(`/en/courses/crash-course-odoo-erp/lessons/${fixtureLessonId}$`));
  await page.screenshot({ path: "tmp/ai-review/en-course-chat-1448.png", fullPage: true, style: "nextjs-portal { display: none !important; }" });

  // Course conversations are listed under Course chat only.
  await expect(page.locator(".recent-item")).toHaveCount(1);
  const courseTitle = (await page.locator(".recent-item .recent-row span").first().innerText()).trim();
  await page.getByRole("tab", { name: "General chat" }).click();
  await expect(page.locator(".recent-item").filter({ hasText: courseTitle })).toHaveCount(0);

  // Citations survive a reload.
  await page.reload();
  await page.getByRole("tab", { name: "Course chat" }).click();
  await page.locator(".recent-item .recent-row").first().click();
  await expect(page.locator(".message-sources a").filter({ hasText: "Accounting Module" })).toHaveCount(1);

  // Arabic interface, same course chat.
  await page.goto("/ar/ai-page");
  await page.getByRole("tab", { name: "محادثة الدورة" }).click();
  const arabic = await ask(page, "إزاي أرجّع نسخة احتياطية للداتابيز؟");
  expect(arabic).toMatch(/[\u0600-\u06FF]/);
  await expect(page.locator(".message.assistant").last().locator(".message-sources a")).not.toHaveCount(0);
  await page.screenshot({ path: "tmp/ai-review/ar-course-chat-1448.png", fullPage: true, style: "nextjs-portal { display: none !important; }" });
});
