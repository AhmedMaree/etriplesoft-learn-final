import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createPageMetadata } from "@/i18n/page-metadata";
import { isLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { listMyEnrollments } from "@/features/courses/server/course-repository";
import {
  cachedCatalogCourse,
  cachedCatalogCourses,
  cachedCatalogDurations,
} from "@/features/courses/server/catalog-cache";
import {
  Checkout,
  type CartCoupon,
  type CartSuggestion,
  type CheckoutCartItem,
} from "@/features/checkout/components/checkout";
import { checkoutConfiguration } from "@/features/checkout/server/commerce";
import { CART_COOKIE, parseCart } from "@/features/checkout/cart/cart-cookie";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return createPageMetadata(params, "cart", "/cart");
}

// The cart is open to guests; signing in is required only to create the order and pay.
export default async function CartRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ checkout?: string | string[] }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const browserSlugs = parseCart((await cookies()).get(CART_COOKIE)?.value);
  const [client, user] = await Promise.all([createClient(), getCurrentUser()]);

  // Neither the enrollments nor the suggestion pool depends on the cart, so they load alongside the sync.
  const enrollmentsPromise = user
    ? listMyEnrollments(client).catch(() => ({}))
    : Promise.resolve({});
  const poolPromise = cachedCatalogCourses({ locale, limit: 24 }).catch(() => ({
    courses: [],
    total: 0,
  }));

  // Signed in: merge this browser's cart into the account cart and show the account cart.
  let accountSlugs: string[] | null = null;
  if (user) {
    const { data } = await client.rpc("learner_cart_sync", {
      p_add: browserSlugs,
      p_remove: [],
    });
    if (data) accountSlugs = parseCart(data.join(","));
  }
  const slugs = accountSlugs ?? browserSlugs;

  // `undefined` marks a failed lookup: hidden for now but kept in the stored cart.
  const [courses, enrollments] = await Promise.all([
    Promise.all(
      slugs.map((slug) =>
        cachedCatalogCourse(locale, slug).catch(() => undefined),
      ),
    ),
    enrollmentsPromise,
  ]);
  const owned = new Set(
    Object.entries(enrollments)
      .filter(
        ([, enrollment]) =>
          enrollment.status === "active" || enrollment.status === "completed",
      )
      .map(([courseId]) => courseId),
  );
  const sellable = courses.filter(
    (course): course is NonNullable<typeof course> =>
      course != null && course.priceMinor > 0 && !owned.has(course.id),
  );
  const kept = new Set(sellable.map((course) => course.slug));
  slugs.forEach(
    (slug, index) => courses[index] === undefined && kept.add(slug),
  );
  const inCart = new Set(sellable.map((course) => course.id));
  const categories = new Set(sellable.map((course) => course.category));

  const [durations, pool, coupon] = await Promise.all([
    sellable.length
      ? cachedCatalogDurations(
          locale,
          sellable.map((course) => course.id),
        ).catch(() => ({}) as Record<string, number>)
      : Promise.resolve({} as Record<string, number>),
    poolPromise,
    user && sellable.length ? openCartCoupon(client, inCart) : null,
  ]);

  const items: CheckoutCartItem[] = sellable.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    amountMinor: course.priceMinor,
    durationSeconds: durations[course.id] ?? null,
  }));
  // Paid courses the learner neither has nor is buying; same category first.
  const suggestions: CartSuggestion[] = pool.courses
    .filter(
      (course) =>
        course.priceMinor > 0 &&
        !inCart.has(course.id) &&
        !owned.has(course.id),
    )
    .sort(
      (a, b) =>
        Number(categories.has(b.category)) - Number(categories.has(a.category)),
    )
    .slice(0, 3)
    .map((course) => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
      amountMinor: course.priceMinor,
      level: course.level,
    }));

  return (
    <Checkout
      items={items}
      amount={items.reduce((sum, item) => sum + item.amountMinor, 0)}
      enabled={Boolean(checkoutConfiguration())}
      cart={{
        signedIn: Boolean(user),
        dropped: slugs.filter((slug) => !kept.has(slug)),
        // Set by the sign-in return link so checkout resumes without a second click.
        resume: query.checkout === "1",
        accountSlugs,
        coupon,
        suggestions,
      }}
    />
  );
}

type Client = Awaited<ReturnType<typeof createClient>>;

// A coupon applied in the cart lives on the learner's open cart order for exactly these courses.
async function openCartCoupon(
  client: Client,
  courseIds: Set<string>,
): Promise<CartCoupon | null> {
  const { data } = await client
    .from("orders")
    .select("id,coupon_code,discount_minor,order_items(course_id)")
    .eq("status", "pending")
    .eq("kind", "cart")
    .gt("expires_at", new Date().toISOString())
    .not("coupon_code", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);
  const match = (data ?? []).find(
    (order) =>
      order.order_items.length === courseIds.size &&
      order.order_items.every((item) => courseIds.has(item.course_id)),
  );
  return match?.coupon_code
    ? {
        orderId: match.id,
        code: match.coupon_code,
        discountMinor: Number(match.discount_minor),
      }
    : null;
}
