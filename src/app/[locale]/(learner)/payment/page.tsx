import { createPageMetadata } from "@/i18n/page-metadata";
import { getTranslations } from "next-intl/server";
import { Panel } from "@/components/ui/primitives";
import { Link, redirect } from "@/i18n/navigation";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCatalogCourse } from "@/features/courses/server/course-repository";
import { getCatalogCourseDurations } from "@/features/courses/server/course-repository";
import { Checkout, type CheckoutCartItem } from "@/features/checkout/components/checkout";
import { checkoutConfiguration } from "@/features/checkout/server/commerce";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return createPageMetadata(params, "checkout", "/payment");
}

export default async function PaymentRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ course?: string; order?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    redirect({
      href: `/login?next=${encodeURIComponent(`/${locale}/payment${typeof query.course === "string" ? `?course=${encodeURIComponent(query.course)}` : ""}`)}`,
      locale,
    });
  const t = await getTranslations("realCheckout");
  let content;
  if (
    typeof query.order === "string" &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(query.order)
  ) {
    const { data: order } = await client
      .from("orders")
      .select("id,status,total_minor,currency")
      .eq("id", query.order)
      .maybeSingle();
    const { data: orderItems } = await client
      .from("order_items")
      .select("course_id,title,amount_minor")
      .eq("order_id", query.order)
      .order("id", { ascending: true });
    const courseIds = (orderItems ?? []).map((item) => item.course_id);
    const [{ data: courses }, durations] = await Promise.all([
      courseIds.length
        ? client.from("courses").select("id,slug").in("id", courseIds)
        : Promise.resolve({ data: [] }),
      getCatalogCourseDurations(client, locale, courseIds),
    ]);
    const slugs = new Map((courses ?? []).map((course) => [course.id, course.slug]));
    const items: CheckoutCartItem[] = (orderItems ?? []).map((item) => ({
      id: item.course_id,
      slug: slugs.get(item.course_id) ?? null,
      title: item.title,
      amountMinor: Number(item.amount_minor),
      durationSeconds: durations[item.course_id] ?? null,
    }));
    content = order ? (
      <Checkout
        orderId={order.id}
        items={items}
        amount={order.total_minor}
        status={order.status}
        enabled={Boolean(checkoutConfiguration())}
      />
    ) : (
      <Panel>
        <p>{t("unavailable")}</p>
      </Panel>
    );
  } else if (typeof query.course === "string") {
    const course = await getCatalogCourse(client, locale, query.course);
    const duration = course
      ? await getCatalogCourseDurations(client, locale, [course.id])
      : {};
    content =
      course && course.priceMinor > 0 ? (
        <Checkout
          courseId={course.id}
          items={[
            {
              id: course.id,
              slug: course.slug,
              title: course.title,
              amountMinor: course.priceMinor,
              durationSeconds: duration[course.id] ?? null,
            },
          ]}
          amount={course.priceMinor}
          enabled={Boolean(checkoutConfiguration())}
        />
      ) : (
        <Panel>
          <p>{t("pickCourse")}</p>
          <Link className="btn outline" href="/catalog">
            {t("catalog")}
          </Link>
        </Panel>
      );
  } else
    content = (
      <Checkout
        items={[]}
        amount={0}
        enabled={false}
      />
    );
  return (
    <>{content}</>
  );
}
