"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AdminActionState } from "@/features/admin/action-state";
import { GeminiError, isGeminiConfigured } from "./gemini";
import { indexCourse } from "./indexer";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rebuilds one course's Course chat index. Message keys live under aiIndex; authority is enforced in each RPC. */
export async function rebuildCourseIndexAction(_state: AdminActionState, form: FormData): Promise<AdminActionState> {
  const courseId = form.get("course_id");
  if (typeof courseId !== "string" || !UUID_PATTERN.test(courseId)) return { error: "invalid" };
  if (!isGeminiConfigured()) return { error: "configuration" };
  try {
    const result = await indexCourse(await createClient(), courseId, { force: form.get("force") === "on" });
    // Partial progress is saved; the provider quota ran out before every source was embedded.
    if (!result.complete) {
      revalidatePath("/[locale]/admin/ai", "page");
      return { error: "partial" };
    }
  } catch (error) {
    if (error instanceof Error && error.message === "forbidden") return { error: "denied" };
    if (error instanceof GeminiError) return { error: error.code === "rate" ? "busy" : "provider" };
    return { error: "failed" };
  }
  revalidatePath("/[locale]/admin/ai", "page");
  revalidatePath("/[locale]/admin/audit", "page");
  return { success: "rebuilt" };
}
