import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const localOnly = process.env.PHASE10_LOCAL_TEST === "1" && url === "http://127.0.0.1:54321" && Boolean(serviceKey);
test.skip(!localOnly, "Opt in only with PHASE10_LOCAL_TEST=1 and local Supabase credentials.");

const runId = randomUUID();
const email = `phase10-ui-${runId}@example.test`;
const password = `Aa1-${randomUUID()}!`;
const courseId = "c0000000-0000-4000-8000-000000000002";
let userId = "";
let service: SupabaseClient<Database>;

function localSql(statement: string) {
  execFileSync("docker", [
    "exec",
    "supabase_db_etriplesoft-learn-local",
    "psql",
    "-X",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    statement,
  ], { stdio: "ignore" });
}

async function show(page: Page, locale: "en" | "ar", status: string, actionVisible: boolean) {
  for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1086 });
    await page.goto(`/${locale}/catalog/python-fundamentals`);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.getByRole("status").filter({ hasText: status })).toBeVisible();
    await expect(page.getByTestId("course-enroll-free")).toHaveCount(actionVisible ? 1 : 0);
    const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(dimensions.content, `${locale} ${status} overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
    if (width === 375 && (status.includes("expired") || status.includes("revoked") || status.includes("انتهت") || status.includes("إلغاء"))) {
      await page.screenshot({ path: `tmp/phase10-manual-review/${locale}-${status.includes("expired") || status.includes("انتهت") ? "expired" : "revoked"}-375.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
    }
  }
}

test.beforeAll(async () => {
  service = createClient<Database>(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`Could not create local disposable enrollment learner: ${error?.message}`);
  userId = data.user.id;
});

test.afterAll(async () => {
  if (!userId) return;
  // This suite owns the synthetic local account and its rows; never run it against Hosted DEV.
  localSql(`DELETE FROM public.enrollments WHERE user_id = '${userId}'::uuid; DELETE FROM auth.users WHERE id = '${userId}'::uuid;`);
});

test("authenticated enrollment, history states and re-enrollment render in EN/AR", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/en/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator("form.auth-fields button[type=submit]").click();
  await page.waitForURL((current) => !current.pathname.endsWith("/login"));

  await page.goto("/en/catalog/python-fundamentals?enrollment=unavailable");
  await expect(page.locator('p[role="alert"]')).toContainText("We could not complete enrollment");
  await expect(page.getByTestId("course-enroll-free")).toBeEnabled();
  await page.getByTestId("course-enroll-free").click();
  await expect(page).toHaveURL(/\/en\/catalog\/python-fundamentals$/);
  await expect(page.getByTestId("course-enrollment-active")).toContainText("You are enrolled");
  await expect(page.getByTestId("course-enroll-free")).toHaveCount(0);
  await page.screenshot({ path: "tmp/phase10-manual-review/en-active-375.png", fullPage: true, style: "nextjs-portal { display: none !important; }" });

  const learner = createClient<Database>(url!, process.env.PHASE10_LOCAL_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await learner.auth.signInWithPassword({ email, password });
  expect(signInError).toBeNull();
  const firstGrant = await learner.rpc("learner_grant_free_enrollment", { p_course_id: courseId });
  const repeatedGrant = await learner.rpc("learner_grant_free_enrollment", { p_course_id: courseId });
  expect(firstGrant.error).toBeNull();
  expect(repeatedGrant.error).toBeNull();
  expect(repeatedGrant.data).toBe(firstGrant.data);
  const ownerRows = await learner.from("enrollments").select("id").eq("course_id", courseId);
  expect(ownerRows.data).toHaveLength(1);

  const firstId = firstGrant.data!;
  localSql(`UPDATE public.enrollments SET status='completed', completed_at=now(), granted_at=now()-interval '1 hour' WHERE id='${firstId}'::uuid;`);
  await page.reload();
  await show(page, "en", "You completed this course", true);
  await expect(page.getByTestId("course-enroll-free")).toHaveText("Enroll again");
  await page.getByTestId("course-enroll-free").click();
  await show(page, "en", "You are enrolled", false);
  await show(page, "ar", "أنت مسجّل", false);

  const newest = await learner.from("enrollments").select("id").eq("course_id", courseId).order("granted_at", { ascending: false }).limit(1).single();
  expect(newest.error).toBeNull();
  const secondId = newest.data!.id;
  const history = await learner.from("enrollments").select("id").eq("course_id", courseId);
  expect(history.data).toHaveLength(2);

  localSql(`UPDATE public.enrollments SET status='expired', granted_at=now()-interval '10 minutes', expires_at=now()-interval '1 second' WHERE id='${secondId}'::uuid;`);
  await show(page, "en", "Your access to this course has expired", true);

  localSql(`UPDATE public.enrollments SET status='revoked', expires_at=NULL, revoked_at=now(), revoked_by='00000000-0000-4000-8000-000000000001' WHERE id='${secondId}'::uuid;`);
  await show(page, "ar", "تم إلغاء إمكانية وصولك إلى هذه الدورة", true);
});
