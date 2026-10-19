import { randomBytes } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { enrollAdminTotp } from "./support/admin-mfa";
import {
  CourseRepositoryError,
  createCourse,
  getAdminCourse,
  getCatalogCourse,
  listAdminCourses,
  listCatalogCourses,
  saveCourseTranslation,
  setCourseInstructors,
  setCourseStatus,
  setTranslationPublication,
  updateCourse,
} from "../src/features/courses/server/course-repository";

// Phase 07 repository against a real database as real users (admin, learner, anonymous).
// Course rows and their audit rows can never be deleted, so this runs only with PHASE07_LIVE=1
// and should be pointed at the disposable local Supabase, not hosted DEV.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const live = Boolean(url && publishableKey && serviceKey && process.env.PHASE07_LIVE === "1");

type Client = SupabaseClient<Database>;

test.describe("course domain repository", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!live, "Set PHASE07_LIVE=1 with the Supabase URL, publishable key and a process-only service-role key (use the local database).");

  const runId = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  const password = `Aa1-${randomBytes(12).toString("base64url")}`;
  const slug = `e2e-course-${runId}`.toLowerCase();
  let anon: Client;
  let admin: Client;
  let learner: Client;
  let courseId: string;
  let profileLinkId: string;

  async function userClient(service: Client, label: string, role?: "admin") {
    const email = `codex-course-${runId}-${label}@example.test`;
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `Course ${label}`, role: "admin", permissions: { admin: true } },
    });
    if (error || !data.user) throw new Error(`createUser ${label} failed: ${error?.message}`);
    if (role) {
      const { error: grantError } = await service.from("user_roles").insert({ user_id: data.user.id, role, granted_by: data.user.id });
      if (grantError) throw new Error(`bootstrap ${label} failed: ${grantError.message}`);
    }
    const client = createClient<Database>(url!, publishableKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) throw new Error(`sign-in ${label} failed: ${signInError.message}`);
    // Admin authority needs an MFA-verified (aal2) session.
    if (role) await enrollAdminTotp(client);
    return { client, id: data.user.id };
  }

  test.beforeAll(async () => {
    const service = createClient<Database>(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    anon = createClient<Database>(url!, publishableKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    admin = (await userClient(service, "admin", "admin")).client;
    const learnerUser = await userClient(service, "learner");
    learner = learnerUser.client;
    profileLinkId = learnerUser.id;
  });

  test("learners and anonymous callers are refused with a typed error", async () => {
    for (const client of [learner, anon]) {
      await expect(createCourse(client, { slug: `${slug}-denied` })).rejects.toMatchObject({ code: "forbidden" });
      await expect(listAdminCourses(client)).rejects.toBeInstanceOf(CourseRepositoryError);
    }
  });

  test("an admin creates a draft and rules are enforced with typed errors", async () => {
    courseId = await createCourse(admin, { slug, category: "technical", level: "beginner", priceMinor: 25000 });
    expect(courseId).toMatch(/^[0-9a-f-]{36}$/);
    await expect(createCourse(admin, { slug })).rejects.toMatchObject({ code: "slugTaken" });
    await expect(createCourse(admin, { slug: "Bad Slug" })).rejects.toMatchObject({ code: "rule" });
    await expect(createCourse(admin, { slug: `${slug}-neg`, priceMinor: -5 })).rejects.toMatchObject({ code: "rule" });
    await expect(setCourseStatus(admin, courseId, "published")).rejects.toMatchObject({ code: "rule" });
    await expect(setCourseStatus(admin, "00000000-0000-4000-8000-0000000000ff", "draft")).rejects.toMatchObject({ code: "notFound" });
  });

  test("a draft is invisible to anonymous callers in both locales", async () => {
    for (const locale of ["en", "ar"] as const) {
      const { courses } = await listCatalogCourses(anon, { locale, limit: 50 });
      expect(courses.map((c) => c.slug)).not.toContain(slug);
      expect(await getCatalogCourse(anon, locale, slug)).toBeNull();
    }
  });

  test("English publishes alone and Arabic never falls back to it", async () => {
    await saveCourseTranslation(admin, courseId, "en", { title: "E2E English", summary: "English summary", description: "Long English text" });
    await setTranslationPublication(admin, courseId, "en", true);
    await setCourseStatus(admin, courseId, "published");

    const en = await listCatalogCourses(anon, { locale: "en", category: "technical", limit: 50 });
    expect(en.courses.map((c) => c.slug)).toContain(slug);
    const ar = await listCatalogCourses(anon, { locale: "ar", limit: 50 });
    expect(ar.courses.map((c) => c.slug)).not.toContain(slug);
    expect(await getCatalogCourse(anon, "ar", slug)).toBeNull();
    expect((await getCatalogCourse(anon, "en", slug))?.description).toBe("Long English text");

    await saveCourseTranslation(admin, courseId, "ar", { title: "عنوان", summary: "ملخص" });
    expect(await getCatalogCourse(anon, "ar", slug)).toBeNull(); // saved but still a draft
    await setTranslationPublication(admin, courseId, "ar", true);
    expect((await getCatalogCourse(anon, "ar", slug))?.title).toBe("عنوان");
    await setTranslationPublication(admin, courseId, "ar", false);
    expect(await getCatalogCourse(anon, "ar", slug)).toBeNull();
    await expect(setTranslationPublication(admin, courseId, "en", false)).rejects.toMatchObject({ code: "rule" });
  });

  test("ordered instructors are public as names only, with no profile or email data", async () => {
    await setCourseInstructors(admin, courseId, [{ displayName: "First Person" }, { displayName: "Linked Person", profileId: profileLinkId }]);
    const detail = await getCatalogCourse(anon, "en", slug);
    expect(detail?.instructors).toEqual(["First Person", "Linked Person"]);

    const everything = JSON.stringify([detail, (await listCatalogCourses(anon, { locale: "en", limit: 50 })).courses]);
    expect(everything).not.toMatch(/@|profile_id|created_by|updated_by|assigned_by/);
    expect(Object.keys(detail!).sort()).toEqual(
      ["category", "currency", "description", "id", "instructors", "level", "priceMinor", "publishedAt", "slug", "summary", "thumbnailObjectKey", "title"],
    );

    // Direct table reads stay column-limited for anonymous callers.
    expect((await anon.from("course_instructors").select("profile_id")).error?.code).toBe("42501");
    expect((await anon.from("course_instructors").select("course_id, position, display_name").eq("course_id", courseId)).data).toHaveLength(2);
    expect((await anon.from("courses").select("created_by")).error?.code).toBe("42501");

    // Attribution alone gives the linked profile no authority.
    await expect(createCourse(learner, { slug: `${slug}-linked` })).rejects.toMatchObject({ code: "forbidden" });

    // A failing replacement rolls back and leaves the list intact.
    await expect(setCourseInstructors(admin, courseId, [{ displayName: "X", profileId: "ffffffff-ffff-4fff-8fff-ffffffffffff" }])).rejects.toMatchObject({ code: "invalid" });
    expect((await getCatalogCourse(anon, "en", slug))?.instructors).toEqual(["First Person", "Linked Person"]);
  });

  test("published slugs are frozen, edits are audited, and archiving removes the course from the catalog", async () => {
    await expect(updateCourse(admin, courseId, { slug: `${slug}-renamed`, category: "technical", level: "beginner", priceMinor: 25000 })).rejects.toMatchObject({ code: "rule" });
    await updateCourse(admin, courseId, { slug, category: "functional", level: "intermediate", priceMinor: 30000 });
    expect((await getCatalogCourse(anon, "en", slug))?.priceMinor).toBe(30000);

    const detail = (await getAdminCourse(admin, courseId)) as { status: string; translations: unknown[]; instructors: unknown[] };
    expect(detail.status).toBe("published");
    expect(detail.translations).toHaveLength(2);

    const { courses } = await listAdminCourses(admin, { status: "published", limit: 100 });
    expect(courses.find((c) => c.id === courseId)?.localesPublished).toEqual(["en"]);

    await setCourseStatus(admin, courseId, "archived");
    expect(await getCatalogCourse(anon, "en", slug)).toBeNull();
    await expect(saveCourseTranslation(admin, courseId, "en", { title: "Edit", summary: "Edit" })).rejects.toMatchObject({ code: "rule" });
    await expect(setCourseStatus(admin, courseId, "published")).rejects.toMatchObject({ code: "rule" });

    const audit = await admin.rpc("admin_list_audit", { p_limit: 100 });
    const mine = (audit.data ?? []).filter((row) => row.target_type === "course" && row.safe_summary.includes(slug));
    expect(mine.map((row) => row.action)).toEqual(
      expect.arrayContaining(["course.created", "course.translation_saved", "course.translation_published", "course.status_changed", "course.instructors_set", "course.updated"]),
    );
  });

  test("the seeded demo catalog behaves per locale (when the local seed is present)", async () => {
    const en = await listCatalogCourses(anon, { locale: "en", limit: 50 });
    const seeded = en.courses.filter((c) => c.slug.startsWith("odoo-") || c.slug === "python-fundamentals" || c.slug === "crash-course-odoo-erp");
    test.skip(seeded.length === 0, "The DEV seed is not loaded in this database.");
    const ar = await listCatalogCourses(anon, { locale: "ar", limit: 50 });
    expect(en.courses.map((c) => c.slug)).toContain("odoo-system-admin");
    expect(ar.courses.map((c) => c.slug)).not.toContain("odoo-system-admin");
    expect(ar.courses.map((c) => c.slug)).toContain("odoo-development");
    expect(en.courses.every((c) => c.currency === "EGP")).toBe(true);
  });

  test("an unsupported locale is an error, never a silent default", async () => {
    await expect(listCatalogCourses(anon, { locale: "fr" as "en" })).rejects.toMatchObject({ code: "invalid" });
  });
});
