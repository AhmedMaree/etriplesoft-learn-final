"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { COURSE_SLUG_PATTERN, grantFreeEnrollment } from "./course-repository";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function enrollFreeCourseAction(courseId: string, localeValue: string, slug: string): Promise<void> {
  if (!isLocale(localeValue) || !UUID_PATTERN.test(courseId) || !COURSE_SLUG_PATTERN.test(slug)) {
    throw new Error("Invalid course enrollment request.");
  }

  const coursePath = `/${localeValue}/courses?course=${encodeURIComponent(slug)}`;
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    redirect(`/${localeValue}/login?next=${encodeURIComponent(coursePath)}`);
  }

  try {
    await grantFreeEnrollment(client, courseId);
  } catch {
    redirect(`${coursePath}&enrollment=unavailable`);
  }

  revalidatePath(`/${localeValue}/courses`);
  redirect(coursePath);
}
