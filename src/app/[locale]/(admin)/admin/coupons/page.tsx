import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/supabase/auth";
import { listAdminCourses } from "@/features/courses/server/course-repository";
import {
  CouponCreateForm,
  CouponTable,
  type AdminCoupon,
} from "@/features/checkout/components/admin-coupons";

export const metadata = { robots: { index: false, follow: false } };
export default async function CouponAdministration() {
  if ((await getAdminAccess()).status !== "admin") return null;
  const t = await getTranslations("coupons");
  const client = await createClient();
  const [{ courses }, { data, error }] = await Promise.all([
    listAdminCourses(client, { status: "published", limit: 100 }),
    client.rpc("admin_list_coupons"),
  ]);
  const coupons: AdminCoupon[] = error
    ? []
    : (data ?? []).map((row) => ({
        id: row.id,
        code: row.code,
        percentOff: row.percent_off,
        amountOffMinor: row.amount_off_minor === null ? null : Number(row.amount_off_minor),
        courseSlug: row.course_slug,
        maxRedemptions: row.max_redemptions,
        redemptions: Number(row.redemptions),
        expiresAt: row.expires_at,
        isActive: row.is_active,
      }));
  return (
    <>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      <CouponCreateForm slugs={courses.map((course) => course.slug)} />
      {error ? <p role="alert">{t("errors.failed")}</p> : <CouponTable coupons={coupons} />}
    </>
  );
}
