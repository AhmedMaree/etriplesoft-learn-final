import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
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
const email = `learning-${run}@example.test`;
const password = `Aa1-${randomUUID()}!`;
const slug = `learning-${run}`;
const paidEmail = `paid-${email}`;
let adminId: string;
let courseId: string;
let lessonId: string;
let nextLessonId: string;
let userId: string;
let resourceId: string;
let resourceKey: string;
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
    email: `admin-${email}`,
    password,
    email_confirm: true,
  });
  await service.auth.admin.createUser({
    email: paidEmail,
    password,
    email_confirm: true,
  });
  if (!learner.data.user || !admin.data.user)
    throw new Error("Local test users could not be created.");
  userId = learner.data.user.id;
  adminId = admin.data.user.id;
  sql(
    `INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('${adminId}','admin','${adminId}');`,
  );
  const client = createClient<Database>(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await client.auth.signInWithPassword({ email: `admin-${email}`, password });
  async function rpc<N extends keyof Database["public"]["Functions"]>(
    name: N,
    args: Database["public"]["Functions"][N]["Args"],
  ) {
    const result = await client.rpc(name, args);
    if (result.error)
      throw new Error(`Fixture operation ${name}: ${result.error.code}`);
    return result.data;
  }
  courseId = String(await rpc("admin_create_course", { p_slug: slug }));
  for (const locale of ["en", "ar"]) {
    await rpc("admin_upsert_course_translation", {
      p_course_id: courseId,
      p_locale: locale,
      p_title: locale === "en" ? "Learning verification" : "اختبار التعلم",
      p_summary: "Local test content",
    });
    await rpc("admin_set_translation_publication", {
      p_course_id: courseId,
      p_locale: locale,
      p_published: true,
    });
  }
  await rpc("admin_set_course_status", {
    p_course_id: courseId,
    p_status: "published",
  });
  const moduleId = String(
    await rpc("admin_create_course_module", { p_course_id: courseId }),
  );
  for (const locale of ["en", "ar"]) {
    await rpc("admin_save_module_translation", {
      p_module_id: moduleId,
      p_locale: locale,
      p_title: locale === "en" ? "Video module" : "وحدة الفيديو",
    });
    await rpc("admin_set_module_translation_publication", {
      p_module_id: moduleId,
      p_locale: locale,
      p_publish: true,
    });
  }
  lessonId = String(
    await rpc("admin_create_lesson", {
      p_module_id: moduleId,
      p_lesson_type: "video",
    }),
  );
  nextLessonId = String(
    await rpc("admin_create_lesson", {
      p_module_id: moduleId,
      p_lesson_type: "article",
    }),
  );
  for (const id of [lessonId, nextLessonId]) {
    for (const locale of ["en", "ar"]) {
      await rpc("admin_save_lesson_translation", {
        p_lesson_id: id,
        p_locale: locale,
        p_title: locale === "en" ? "Playback test" : "اختبار تشغيل الفيديو",
        p_body: "Local verification notes",
      });
      await rpc("admin_set_lesson_translation_publication", {
        p_lesson_id: id,
        p_locale: locale,
        p_publish: true,
      });
    }
    await rpc("admin_set_lesson_status", {
      p_lesson_id: id,
      p_status: "published",
    });
  }
  const videoId = String(
    await rpc("mux_begin_lesson_upload", { p_lesson_id: lessonId }),
  );
  await rpc("mux_attach_upload", {
    p_video_id: videoId,
    p_upload_id: `upload_${run}`,
  });
  const event = await service.rpc("mux_process_webhook", {
    p_event_id: `evt_${run}`,
    p_event_type: "video.asset.ready",
    p_data: {
      id: "local-learning-fixture",
      upload_id: `upload_${run}`,
      passthrough: videoId,
      playback_ids: [
        {
          id:
            process.env.LEARNING_TEST_MUX_PLAYBACK_ID ??
            "tzwC6VuQYC00sSVwRDaTaZoD3Obj8oCw5N70031BXdbQA",
          policy: "signed",
        },
      ],
      duration: 15.066667,
    },
  });
  if (event.error)
    throw new Error(`Local asset fixture failed: ${event.error.code}`);
  await rpc("learner_grant_free_enrollment", { p_course_id: courseId });
  const resource = await client.rpc("admin_create_lesson_resource", {
    p_lesson_id: lessonId,
    p_kind: "file",
  });
  if (resource.error || !resource.data?.[0])
    throw new Error("Local resource fixture failed.");
  resourceId = resource.data[0].resource_id;
  resourceKey = resource.data[0].storage_object_key;
  const uploaded = await service.storage
    .from("course-resources")
    .upload(
      resourceKey,
      readFileSync("courses-images/crash-course-odoo-erp/Course Agenda.pdf"),
      { contentType: "application/pdf" },
    );
  if (uploaded.error) throw new Error("Local private PDF fixture failed.");
  for (const locale of ["en", "ar"]) {
    await rpc("admin_save_resource_translation", {
      p_resource_id: resourceId,
      p_locale: locale,
      p_label: locale === "en" ? "Course Agenda PDF" : "ملف جدول الدورة",
    });
    await rpc("admin_set_resource_translation_publication", {
      p_resource_id: resourceId,
      p_locale: locale,
      p_publish: true,
    });
  }
});

test.afterAll(async () => {
  if (!courseId) return;
  // Retain audited local fixture history. Do not delete protected learner/audit records.
  sql(
    `UPDATE public.lesson_videos v SET status='errored',mux_playback_id=NULL,mux_asset_id=NULL FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id WHERE v.lesson_id=l.id AND m.course_id='${courseId}'; UPDATE public.courses SET status='archived' WHERE id='${courseId}'; UPDATE public.user_roles SET revoked_at=now(),revoked_by='${adminId}' WHERE user_id='${adminId}' AND revoked_at IS NULL;`,
  );
  if (resourceKey)
    await createClient<Database>(url!, secret!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
      .storage.from("course-resources")
      .remove([resourceKey]);
});

async function login(page: Page, admin = false) {
  await page.goto("/en/login");
  await page
    .locator("input[name=email]")
    .fill(admin ? `admin-${email}` : email);
  await page.locator("input[name=password]").fill(password);
  await page.locator("form.auth-fields button[type=submit]").click();
  await page.waitForURL((current) => !current.pathname.endsWith("/login"));
}

test("enrollment, real signed playback, persisted progress and resume", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await login(page);
  await page.goto(`/en/courses/${slug}/lessons/${lessonId}`);
  await expect(page.locator(".lesson-player [role=alert]")).toContainText(
    "Enroll in this course",
  );
  await page.goto(`/en/courses?course=${slug}`);
  await page
    .locator("form button[type=submit]")
    .filter({ hasText: "Enroll" })
    .click();
  await expect(page.getByTestId("course-enrollment-active")).toBeVisible();
  await page.getByTestId("course-start-learning").click();
  const downloadPath = `/api/learning/resources/${resourceId}?lessonId=${lessonId}&locale=en`;
  await expect(
    page.getByRole("link", { name: "Course Agenda PDF", exact: true }),
  ).toBeVisible();
  const download = await page.request.get(downloadPath);
  expect(download.status()).toBe(200);
  expect((await download.body()).subarray(0, 5).toString()).toBe("%PDF-");
  expect(
    (
      await page.request.get(
        `/api/learning/resources/${resourceId}?lessonId=${nextLessonId}&locale=en`,
      )
    ).status(),
  ).toBe(404);
  await expect(page.locator("mux-player")).toBeVisible();
  await expect(page.locator(".lesson-saved-progress")).toContainText(
    "watched",
    { timeout: 30_000 },
  );
  await page.waitForFunction(
    () => {
      const element = document.querySelector("mux-player");
      return (
        element && "readyState" in element && Number(element.readyState) >= 2
      );
    },
    undefined,
    { timeout: 45_000 },
  );
  await page.locator("mux-player").evaluate(async (element) => {
    if ("play" in element && typeof element.play === "function")
      await element.play();
  });
  await expect(page.locator(".lesson-saved-progress")).toContainText(
    /\d+% watched/,
    { timeout: 20_000 },
  );
  await expect
    .poll(
      () =>
        Number(
          sql(
            `SELECT position_seconds FROM public.video_progress vp JOIN public.enrollments e ON e.id=vp.enrollment_id WHERE e.user_id='${userId}' LIMIT 1;`,
          ),
        ),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(1);
  const persisted = Number(
    sql(
      `SELECT position_seconds FROM public.video_progress vp JOIN public.enrollments e ON e.id=vp.enrollment_id WHERE e.user_id='${userId}' LIMIT 1;`,
    ),
  );
  expect(persisted).toBeGreaterThan(1);
  await page.reload();
  await expect(page.locator(".lesson-saved-progress")).toContainText(
    /watched|completed/,
    { timeout: 30_000 },
  );
  await page.waitForFunction((position) => {
    const element = document.querySelector("mux-player");
    return (
      element &&
      "currentTime" in element &&
      Number(element.currentTime) >= position - 1
    );
  }, persisted);
  sql(`UPDATE public.lesson_translations SET publication_status='draft',published_at=NULL WHERE lesson_id='${lessonId}' AND locale='ar';`);
  try {
    await page.goto(`/ar/courses/${slug}/lessons/${lessonId}`);
    await expect(page.locator('h1')).toContainText('الدرس غير متاح بهذه اللغة');
    await expect(page.getByRole('link', { name: 'فتح الدرس بالإنجليزية' })).toHaveAttribute('href', `/en/courses/${slug}/lessons/${lessonId}`);
  } finally {
    sql(`UPDATE public.lesson_translations SET publication_status='published',published_at=now() WHERE lesson_id='${lessonId}' AND locale='ar';`);
  }
});

test("learner and upload screens fit both locales at all required widths", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, true);
  for (const locale of ["en", "ar"]) {
    for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const path of [
        `/${locale}/video-management`,
        `/${locale}/admin/enrollments`,
        `/${locale}/courses/${slug}/lessons/${lessonId}`,
      ]) {
        await page.goto(path);
        await expect(page.locator("h1").first()).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute(
          "dir",
          locale === "ar" ? "rtl" : "ltr",
        );
        if (path.includes("admin/enrollments"))
          await expect(page.locator("#access-email")).toBeVisible();
        else if (path.includes("video-management"))
          await expect(page.locator("#video-lesson")).toBeEnabled();
        else await expect(page.locator("mux-player")).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${path} at ${width}`,
        ).toBe(true);
        await page.screenshot({
          path: `tmp/learning-review/${locale}-${path.includes("admin/enrollments") ? "access" : path.includes("video-management") ? "upload" : "lesson"}-${width}.png`,
          fullPage: true,
          caret: "initial",
        });
      }
    }
  }
  expect(errors).toEqual([]);
});

test("administrator grants paid course access through the form", async ({
  page,
}) => {
  sql(`UPDATE public.courses SET price_minor=49900 WHERE id='${courseId}';`);
  await login(page, true);
  await page.goto("/en/admin/enrollments");
  await page.locator("#access-email").fill(paidEmail);
  await page.locator("#access-course").selectOption(slug);
  await page.locator("#access-reason").selectOption("development_test");
  await page.getByRole("button", { name: "Grant access", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Course access granted");
  const client = createClient<Database>(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await client.auth.signInWithPassword({ email: paidEmail, password });
  const { data, error } = await client.rpc("learner_get_lesson", {
    p_lesson_id: lessonId,
    p_locale: "en",
  });
  expect(error).toBeNull();
  expect(data?.[0]?.lesson_id).toBe(lessonId);
  expect(
    sql(
      `SELECT count(*) FROM public.admin_audit_log a JOIN public.enrollments e ON e.id=a.enrollment_id JOIN auth.users u ON u.id=e.user_id WHERE u.email='${paidEmail}' AND a.action='enrollment.granted';`,
    ),
  ).toBe("1");
});
