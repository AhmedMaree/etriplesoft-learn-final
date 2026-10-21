import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/supabase/auth";
import { listAdminCourses } from "@/features/courses/server/course-repository";
import {
  CouponCreateForm,
  CouponTable,
  type AdminCoupon,
} from "@/features/checkout/components/admin-coupons";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  AdminCheckoutFunnel,
  FUNNEL_WINDOWS,
} from "@/features/checkout/components/admin-checkout-funnel";

export const metadata = { robots: { index: false, follow: false } };
export default async function CouponAdministration({
  searchParams,
}: {
  searchParams: Promise<{ days?: string | string[] }>;
}) {
  if ((await getAdminAccess()).status !== "admin") return null;
  const requested = Number((await searchParams).days);
  const days = FUNNEL_WINDOWS.find((window) => window === requested) ?? 30;
  const t = await getTranslations("coupons");
  const admin = await getTranslations("admin");
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
      <AdminPageHeader eyebrow={admin("nav.groups.learners")} title={t("title")} description={t("description")} />
      <AdminCheckoutFunnel days={days} />
      <section className="panel admin-card" aria-labelledby="admin-coupon-create">
        <h2 id="admin-coupon-create">{t("create")}</h2>
        <CouponCreateForm slugs={courses.map((course) => course.slug)} />
      </section>
      <section className="panel admin-card" aria-labelledby="admin-coupon-list">
        <div className="admin-card-head">
          <h2 id="admin-coupon-list">{t("listTitle")}</h2>
          {!error && <span className="admin-count" dir="ltr">{coupons.length}</span>}
        </div>
        {error ? <p className="admin-status error" role="alert">{t("errors.failed")}</p> : <CouponTable coupons={coupons} />}
      </section>
    </>
  );
}
