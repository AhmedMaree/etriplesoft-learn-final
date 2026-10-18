import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { test, expect, type Page } from "@playwright/test";
import type { Database } from "../src/types/database";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(
  url !== "http://127.0.0.1:54321" || !key || !secret,
  "Disposable local Supabase only.",
);
const run = randomUUID();
const email = `quiz-${run}@example.test`;
const adminEmail = `admin-${email}`;
const password = `Aa1-${randomUUID()}!`;
const slug = `quiz-${run}`;
let adminId: string;
let courseId: string;
let quizId: string;
let readingId: string;
let certificateId: string;
let editorCourseId: string;
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
test.beforeAll(async () => {
  const service = createClient<Database>(url!, secret!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const learner = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  const admin = await service.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
  });
  if (!learner.data.user || !admin.data.user)
    throw new Error("Local fixture users failed.");
  adminId = admin.data.user.id;
  sql(
    `INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('${adminId}','admin','${adminId}');`,
  );
  const client = createClient<Database>(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await client.auth.signInWithPassword({ email: adminEmail, password });
  async function rpc<N extends keyof Database["public"]["Functions"]>(
    name: N,
    args: Database["public"]["Functions"][N]["Args"],
  ) {
    const result = await client.rpc(name, args);
    if (result.error) throw new Error(`Fixture ${name}: ${result.error.code}`);
    return result.data;
  }
  courseId = String(await rpc("admin_create_course", { p_slug: slug }));
  const moduleId = String(
    await rpc("admin_create_course_module", { p_course_id: courseId }),
  );
  quizId = String(
    await rpc("admin_create_lesson", {
      p_module_id: moduleId,
      p_lesson_type: "assessment",
    }),
  );
  readingId = String(
    await rpc("admin_create_lesson", {
      p_module_id: moduleId,
      p_lesson_type: "article",
    }),
  );
  for (const locale of ["en", "ar"]) {
    await rpc("admin_upsert_course_translation", {
      p_course_id: courseId,
      p_locale: locale,
      p_title: locale === "en" ? "Assessment verification" : "اختبار التقييم",
      p_summary: "Clearly labeled local test content",
    });
    await rpc("admin_set_translation_publication", {
      p_course_id: courseId,
      p_locale: locale,
      p_published: true,
    });
    await rpc("admin_set_course_status", {
      p_course_id: courseId,
      p_status: "published",
    });
    await rpc("admin_save_module_translation", {
      p_module_id: moduleId,
      p_locale: locale,
      p_title: "Verification",
    });
    await rpc("admin_set_module_translation_publication", {
      p_module_id: moduleId,
      p_locale: locale,
      p_publish: true,
    });
    for (const id of [quizId, readingId]) {
      await rpc("admin_save_lesson_translation", {
        p_lesson_id: id,
        p_locale: locale,
        p_title: id === quizId ? "Test quiz" : "Test reading",
        p_body: id === readingId ? "Actual test article" : undefined,
      });
      await rpc("admin_set_lesson_translation_publication", {
        p_lesson_id: id,
        p_locale: locale,
        p_publish: true,
      });
    }
  }
  const version = String(
    await rpc("admin_create_quiz_version", {
      p_lesson_id: quizId,
      p_locale: "en",
      p_title: "Verification quiz",
      p_instructions: "Local verification only",
      p_questions: [
        {
          type: "single",
          prompt: "Choose the correct test choice",
          options: [
            { label: "Correct test choice", correct: true },
            { label: "Incorrect test choice", correct: false },
          ],
        },
      ],
    }),
  );
  await rpc("admin_localize_quiz_draft", {
    p_version_id: version,
    p_locale: "ar",
    p_title: "تقييم تجريبي",
    p_instructions: "اختبار محلي فقط",
    p_questions: [
      {
        prompt: "اختر الإجابة التجريبية الصحيحة",
        options: ["الإجابة التجريبية الصحيحة", "الإجابة التجريبية الخاطئة"],
      },
    ],
  });
  await rpc("admin_publish_quiz_version", { p_version_id: version });
  await rpc("admin_set_course_status", {
    p_course_id: courseId,
    p_status: "published",
  });
  for (const id of [quizId, readingId])
    await rpc("admin_set_lesson_status", {
      p_lesson_id: id,
      p_status: "published",
    });
  await client.auth.signOut();
  await client.auth.signInWithPassword({ email, password });
  await rpc("learner_grant_free_enrollment", { p_course_id: courseId });
});
test.afterAll(async () => {
  if (courseId)
    sql(
      `UPDATE public.courses SET status='archived' WHERE id='${courseId}'; UPDATE public.user_roles SET revoked_at=now(),revoked_by='${adminId}' WHERE user_id='${adminId}' AND revoked_at IS NULL;`,
    );
  if (editorCourseId) {
    const keys = sql(
      `SELECT r.storage_object_key FROM public.lesson_resources r JOIN public.lessons l ON l.id=r.lesson_id JOIN public.course_modules m ON m.id=l.module_id WHERE m.course_id='${editorCourseId}' AND r.kind='file';`,
    )
      .split("\n")
      .filter((key) => key.startsWith(`courses/${editorCourseId}/`));
    sql(
      `UPDATE public.courses SET status='archived' WHERE id='${editorCourseId}';`,
    );
    if (keys.length)
      await createClient<Database>(url!, secret!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
        .storage.from("course-resources")
        .remove(keys);
  }
});
async function login(page: Page, admin = false) {
  await page.goto("/en/login");
  await page.locator("input[name=email]").fill(admin ? adminEmail : email);
  await page.locator("input[name=password]").fill(password);
  await page.locator("form.auth-fields button[type=submit]").click();
  await page.waitForURL((current) => !current.pathname.endsWith("/login"));
  await expect(page.locator(".rl-stats")).toBeVisible();
}
test("real quiz autosaves, resumes, grades and enables course completion", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page);
  await page.goto("/en/assessment");
  await expect(
    page.getByRole("link", {
      name: "Assessment verification — Test quiz",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(`/en/courses/${slug}/lessons/${quizId}`);
  const forbiddenOrigin = await page.request.post("/api/learning/quiz", {
    headers: { Origin: "https://untrusted.example" },
    data: { lessonId: quizId, locale: "en", action: "start" },
  });
  expect(forbiddenOrigin.status()).toBe(403);
  const initial = await page.request.post("/api/learning/quiz", {
    headers: { Origin: "http://127.0.0.1:3016" },
    data: { lessonId: quizId, locale: "en", action: "get" },
  });
  expect(initial.status(), await initial.text()).toBe(200);
  await page
    .getByRole("button", { name: "Start assessment", exact: true })
    .click();
  await expect(page.getByRole("radio").first()).toBeVisible();
  const concurrentStarts = await Promise.all(
    [1, 2, 3].map(() =>
      page.request.post("/api/learning/quiz", {
        headers: { Origin: "http://127.0.0.1:3016" },
        data: { lessonId: quizId, locale: "en", action: "start" },
      }),
    ),
  );
  expect(concurrentStarts.every((response) => response.ok())).toBe(true);
  expect(
    Number(
      sql(
        `SELECT count(*) FROM public.quiz_attempts WHERE quiz_id=(SELECT id FROM public.quizzes WHERE lesson_id='${quizId}');`,
      ),
    ),
  ).toBe(1);
  await page.getByRole("radio").first().check();
  await expect
    .poll(() =>
      Number(
        sql(
          `SELECT last_sequence FROM public.quiz_attempts WHERE quiz_id=(SELECT id FROM public.quizzes WHERE lesson_id='${quizId}') AND status='active';`,
        ),
      ),
    )
    .toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await expect(
    page.getByRole("heading", { name: "Correct answers" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Submit assessment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Assessment passed", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Correct answers" }),
  ).toBeVisible();
  await page.goto(`/en/courses/${slug}/lessons/${readingId}`);
  await page
    .getByRole("button", { name: "Mark complete", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Course completed");
  expect(
    Number(
      sql(
        `SELECT count(*) FROM public.course_completions cc JOIN public.enrollments e ON e.id=cc.enrollment_id WHERE e.course_id='${courseId}';`,
      ),
    ),
  ).toBe(1);
  await page.goto("/en/certificates");
  await page
    .getByRole("button", { name: "Issue certificate", exact: true })
    .click();
  await page
    .getByRole("link", { name: "View certificate", exact: true })
    .click();
  await expect(page.locator(".certificate")).toContainText(
    "Assessment verification",
  );
  certificateId = page.url().split("/").at(-1)!;
  const verification = await page
    .getByRole("link", { name: "Verify certificate", exact: true })
    .getAttribute("href");
  expect(verification).toBeTruthy();
  const anonymous = await page
    .context()
    .browser()!
    .newContext({ baseURL: "http://127.0.0.1:3016" });
  const publicPage = await anonymous.newPage();
  await publicPage.goto(verification!);
  await expect(
    publicPage.getByText("Valid certificate", { exact: true }),
  ).toBeVisible();
  await anonymous.close();
  await page.goto("/en/overview");
  await expect(page.locator(".rl-stats")).toContainText(
    "Completed courses",
  );
  await expect(
    page.getByRole("link", { name: "Assessment verification" }).first(),
  ).toBeVisible();
});
test("assessment and authoring preserve both locales at all required widths", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  for (const locale of ["en", "ar"])
    for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}/courses/${slug}/lessons/${quizId}`);
      await expect(page.locator(".real-quiz")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `tmp/learner-quiz-${locale}-${width}.png`,
        fullPage: true,
        caret: "initial",
      });
      await page.goto(`/${locale}/certificates/${certificateId}`);
      await expect(page.locator(".certificate")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `tmp/certificate-${locale}-${width}.png`,
        fullPage: true,
        caret: "initial",
      });
      await page.goto(`/${locale}/overview`);
      await expect(page.locator(".rl-stats")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `tmp/dashboard-${locale}-${width}.png`,
        fullPage: true,
        caret: "initial",
      });
    }
  await page.context().clearCookies();
  await login(page, true);
  for (const locale of ["en", "ar"])
    for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}/admin/assessments`);
      await expect(page.locator(".quiz-author")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `tmp/quiz-${locale}-${width}.png`,
        fullPage: true,
        caret: "initial",
      });
      await page.goto(`/${locale}/admin/courses/${courseId}`);
      await expect(page.locator(".course-editor")).toBeVisible();
      await page.locator(".admin-lesson summary").first().click();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `tmp/course-editor-${locale}-${width}.png`,
        fullPage: true,
      });
    }
  expect(errors).toEqual([]);
});
test("administrator authors and publishes a reviewed quiz version", async ({
  page,
}) => {
  await login(page, true);
  await page.goto("/en/admin/assessments");
  await page
    .getByLabel("Assessment lesson", { exact: true })
    .selectOption(quizId);
  await page
    .getByLabel("Assessment title", { exact: true })
    .fill("Admin-authored test quiz");
  await page
    .getByLabel("Question", { exact: true })
    .fill("A test authoring question");
  await page
    .getByLabel("Answer choice 1", { exact: true })
    .fill("Correct option");
  await page
    .getByLabel("Answer choice 2", { exact: true })
    .fill("Incorrect option");
  await page
    .getByRole("button", { name: "Save draft version", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page
    .getByRole("button", { name: "Publish reviewed version", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Assessment version published",
  );
});

test("administrator creates curriculum and uploads a validated private PDF", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page, true);
  await page.goto("/en/admin/courses");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Document workflow verification");
  await page
    .getByLabel("Course URL name", { exact: true })
    .fill(`editor-${run}`);
  await page
    .getByLabel("Summary", { exact: true })
    .fill("Clearly labeled local content workflow fixture");
  await page.getByRole("button", { name: "Save course", exact: true }).click();
  await page.waitForURL(/\/admin\/courses\/[0-9a-f-]+$/);
  editorCourseId = page.url().split("/").at(-1)!;
  await page.getByLabel("Publish in this language", { exact: true }).check();
  await page.getByRole("button", { name: "Save course", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  await page.getByLabel("New module title", { exact: true }).fill("Curriculum");
  await page.getByRole("button", { name: "Add module", exact: true }).click();
  const modulePanel = page.locator(".admin-module");
  await expect(modulePanel).toBeVisible();
  await modulePanel
    .getByLabel("Publish in this language", { exact: true })
    .check();
  await modulePanel
    .getByRole("button", { name: "Save module", exact: true })
    .click();
  await expect(modulePanel.getByRole("status")).toContainText("Saved.");
  await modulePanel
    .getByLabel("New lesson title", { exact: true })
    .fill("PDF lesson");
  await modulePanel
    .getByLabel("Lesson type", { exact: true })
    .selectOption("resource");
  await modulePanel
    .getByRole("button", { name: "Add lesson", exact: true })
    .click();
  const lesson = modulePanel.locator(".admin-lesson");
  await expect(lesson).toBeVisible();
  await lesson.locator("summary").click();
  await lesson.getByLabel("Publish in this language", { exact: true }).check();
  await lesson
    .getByRole("button", { name: "Save lesson", exact: true })
    .click();
  await expect(lesson.getByRole("status")).toContainText("Saved.");
  const resources = lesson.locator(".admin-resource-upload");
  await resources
    .getByLabel("Document title", { exact: true })
    .fill("Browser-uploaded PDF");
  await resources
    .getByLabel("PDF file", { exact: true })
    .setInputFiles("courses-images/crash-course-odoo-erp/Course Agenda.pdf");
  await resources
    .getByRole("button", { name: "Upload PDF draft", exact: true })
    .click();
  await expect(resources.getByRole("status")).toContainText(
    "PDF uploaded and validated",
  );
  await resources
    .getByRole("button", { name: "Publish document", exact: true })
    .click();
  await expect(resources.getByRole("status")).toContainText(
    "Document published",
  );
  await resources
    .getByLabel("Document title", { exact: true })
    .fill("Invalid PDF");
  await resources.getByLabel("PDF file", { exact: true }).setInputFiles({
    name: "invalid.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not-a-real-pdf"),
  });
  await resources
    .getByRole("button", { name: "Upload PDF draft", exact: true })
    .click();
  await expect(resources.getByRole("status")).toContainText(
    "Upload or validation failed",
  );
  expect(
    sql(
      `SELECT rt.publication_status FROM public.lesson_resource_translations rt JOIN public.lesson_resources r ON r.id=rt.resource_id JOIN public.lessons l ON l.id=r.lesson_id JOIN public.course_modules m ON m.id=l.module_id WHERE m.course_id='${editorCourseId}' AND rt.label='Invalid PDF';`,
    ),
  ).toBe("draft");
  await page.context().clearCookies();
  await login(page);
  const denied = await page.request.post("/api/admin/resources", {
    headers: { Origin: "http://127.0.0.1:3016" },
    data: {
      action: "begin",
      locale: "en",
      lessonId: readingId,
      label: "Unauthorized",
      size: 100,
    },
  });
  expect(denied.status()).toBe(403);
});
