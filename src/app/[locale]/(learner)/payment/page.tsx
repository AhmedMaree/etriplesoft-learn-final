import { createPageMetadata } from "@/i18n/page-metadata";
import { getTranslations } from "next-intl/server";
import { Panel } from "@/components/ui/primitives";
import { Link, redirect } from "@/i18n/navigation";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCatalogCourse } from "@/features/courses/server/course-repository";
import {
  getCatalogCourseDurations,
  getCatalogCourseOutline,
} from "@/features/courses/server/course-repository";
import { Checkout, type CheckoutCartItem } from "@/features/checkout/components/checkout";
import { CheckoutPayment } from "@/features/checkout/components/checkout-payment";
import {
  checkoutConfiguration,
  readCommerceOrder,
  reconcileOrder,
} from "@/features/checkout/server/commerce";
import { billingCountryOptions } from "@/features/checkout/billing-countries";

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

// Request-time check (server only), kept out of the component body.
const isPast = (timestamp: string) => Date.parse(timestamp) <= Date.now();

// Only orders that reached Kashier can have been paid; any provider error leaves the order pending.
async function settleExpiredOrder(id: string) {
  try {
    const order = await readCommerceOrder(id);
    return typeof order.sessionId === "string" ? await reconcileOrder(id) : "pending";
  } catch {
    return "pending";
  }
}

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
  searchParams: Promise<{
    course?: string;
    order?: string;
    step?: string;
    returned?: string;
  }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  const orderId =
    typeof query.order === "string" && UUID.test(query.order) ? query.order : null;
  if (!user) {
    // Keep the order (and the Kashier return marker) across sign-in so a learner whose session
    // ended while paying comes back to the confirmation instead of an empty cart.
    const next = orderId
      ? `/${locale}/payment?order=${orderId}&step=checkout${query.returned === "1" ? "&returned=1" : ""}`
      : `/${locale}/payment${typeof query.course === "string" ? `?course=${encodeURIComponent(query.course)}` : ""}`;
    redirect({ href: `/login?next=${encodeURIComponent(next)}`, locale });
  }
  const t = await getTranslations("realCheckout");
  let content;
  if (orderId) {
    let { data: order } = await client
      .from("orders")
      .select(
        "id,status,kind,expires_at,subtotal_minor,discount_minor,total_minor,coupon_code,billing_name,billing_country,billing_phone",
      )
      .eq("id", orderId)
      .maybeSingle();
    const enabled = Boolean(checkoutConfiguration());
    // An expired order may still have been paid at the last moment (the webhook can lag), so ask
    // Kashier before offering a fresh checkout that could charge the learner twice.
    if (order?.status === "pending" && isPast(order.expires_at) && enabled) {
      const settled = await settleExpiredOrder(order.id);
      if (settled !== "pending") order = { ...order, status: settled };
    }
    const { data: orderItems } = await client
      .from("order_items")
      .select("course_id,title,amount_minor")
      .eq("order_id", orderId)
      .order("position", { ascending: true })
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
    // Our own Kashier return marker; it is display-only and only triggers server reconciliation.
    const returned = query.returned === "1";
    const expired =
      order?.status === "pending" && isPast(order.expires_at);
    if (order && user && (query.step === "checkout" || returned || expired || order.status !== "pending")) {
      const first = items[0];
      const [{ data: profile }, detail, outline] = await Promise.all([
        client.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
        first?.slug ? getCatalogCourse(client, locale, first.slug) : Promise.resolve(null),
        first?.slug ? getCatalogCourseOutline(client, locale, first.slug) : Promise.resolve([]),
      ]);
      return (
        <CheckoutPayment
          order={{
            id: order.id,
            status: order.status,
            kind: order.kind === "cart" ? "cart" : "course",
            expired,
            subtotalMinor: Number(order.subtotal_minor),
            discountMinor: Number(order.discount_minor),
            totalMinor: Number(order.total_minor),
            couponCode: order.coupon_code,
            billingName: order.billing_name,
            billingCountry: order.billing_country,
            billingPhone: order.billing_phone,
          }}
          items={items}
          email={user.email ?? ""}
          defaultName={profile?.display_name ?? ""}
          instructor={detail?.instructors[0] ?? null}
          lessonCount={outline.length || null}
          enabled={enabled}
          returned={returned}
          countryNames={billingCountryOptions(locale)}
        />
      );
    }
    content = order ? (
      <Checkout
        orderId={order.id}
        items={items}
        amount={order.total_minor}
        status={order.status}
        enabled={enabled}
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
  } else redirect({ href: "/cart", locale });
  return (
    <>{content}</>
  );
}
