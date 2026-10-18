"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AdminActionState } from "@/features/admin/action-state";
import { COURSE_SLUG_PATTERN } from "@/features/courses/server/course-repository";

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// Stable message keys under coupons.errors; authority is enforced inside each RPC.
function errorKey(error: { code?: string }) {
  if (error.code === "42501") return "denied";
  if (error.code === "23505") return "duplicate";
  if (error.code === "P0002") return "missing";
  if (error.code === "22023" || error.code === "23514") return "invalid";
  return "failed";
}

function refresh() {
  revalidatePath("/[locale]/admin/coupons", "page");
  revalidatePath("/[locale]/admin/audit", "page");
}

export async function createCouponAction(
  _state: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const code = text(form, "code").toUpperCase();
  const kind = text(form, "kind");
  const value = Number(text(form, "value"));
  const slug = text(form, "course");
  const limitText = text(form, "max_redemptions");
  const limit = limitText ? Number(limitText) : null;
  const expiresText = text(form, "expires_at");
  const expires = expiresText ? new Date(`${expiresText}T23:59:59Z`) : null;
  if (
    !CODE_PATTERN.test(code) ||
    !["percent", "amount"].includes(kind) ||
    !Number.isFinite(value) ||
    (kind === "percent" && (!Number.isInteger(value) || value < 1 || value > 99)) ||
    (kind === "amount" && (value <= 0 || value > 9999999)) ||
    (slug && !COURSE_SLUG_PATTERN.test(slug)) ||
    (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 100000)) ||
    (expiresText && (!/^\d{4}-\d{2}-\d{2}$/.test(expiresText) || !expires || Number.isNaN(expires.getTime())))
  )
    return { error: "invalid" };
  const client = await createClient();
  const { error } = await client.rpc("admin_create_coupon", {
    p_code: code,
    p_percent_off: kind === "percent" ? value : null,
    // Admins enter pounds; storage is in piasters.
    p_amount_off_minor: kind === "amount" ? Math.round(value * 100) : null,
    p_course_slug: slug || null,
    p_max_redemptions: limit,
    p_expires_at: expires ? expires.toISOString() : null,
  });
  if (error) return { error: errorKey(error) };
  refresh();
  return { success: "created" };
}

export async function setCouponActiveAction(
  _state: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const id = text(form, "id");
  const active = text(form, "active");
  if (!UUID_PATTERN.test(id) || !["true", "false"].includes(active)) return { error: "invalid" };
  const client = await createClient();
  const { error } = await client.rpc("admin_set_coupon_active", {
    p_id: id,
    p_active: active === "true",
  });
  if (error) return { error: errorKey(error) };
  refresh();
  return { success: "updated" };
}
