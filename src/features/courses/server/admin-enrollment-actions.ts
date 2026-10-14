"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AdminActionState } from "@/features/admin/action-state";
import { COURSE_SLUG_PATTERN } from "./course-repository";

export async function grantCourseAccessAction(
  _state: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const email = form.get("email");
  const slug = form.get("slug");
  const reason = form.get("reason");
  if (
    typeof email !== "string" ||
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof slug !== "string" ||
    !COURSE_SLUG_PATTERN.test(slug) ||
    typeof reason !== "string" ||
    !["development_test", "complimentary", "support"].includes(reason)
  )
    return { error: "invalid" };
  const client = await createClient();
  const { error } = await client.rpc("admin_grant_course_access", {
    p_email: email.trim(),
    p_slug: slug,
    p_reason: reason,
  });
  if (error)
    return {
      error:
        error.code === "42501"
          ? "denied"
          : error.code === "P0002"
            ? "missing"
            : "failed",
    };
  revalidatePath("/[locale]/courses", "page");
  revalidatePath("/[locale]/admin/audit", "page");
  return { success: "granted" };
}
