import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readBoundedJson } from "@/lib/http/bounded-json";
import { hasTrustedRequestOrigin } from "@/lib/http/trusted-origin";
import { isLocale } from "@/i18n/config";
import {
  checkoutConfiguration,
  readCommerceOrder,
  reconcileOrder,
  startProviderCheckout,
} from "@/features/checkout/server/commerce";
import { record } from "@/features/checkout/server/kashier-contract";
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  if (!hasTrustedRequestOrigin(request)) return reply({ error: "access" }, 403);
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return reply({ error: "access" }, 401);
  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch {
    return reply({ error: "invalid" }, 400);
  }
  if (
    !record(body) ||
    typeof body.id !== "string" ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.id)
  )
    return reply({ error: "invalid" }, 400);
  try {
    if (
      body.action === "add-to-cart" &&
      typeof body.locale === "string" &&
      isLocale(body.locale)
    ) {
      const order = await client.rpc("learner_create_order", {
        p_course_id: body.id,
        p_locale: body.locale,
      });
      if (order.error || !order.data) return reply({ error: "rule" }, 409);
      return reply({ url: `/${body.locale}/payment?order=${order.data}` });
    }
    if (
      body.action === "start" &&
      typeof body.locale === "string" &&
      isLocale(body.locale)
    ) {
      if (!checkoutConfiguration()) return reply({ error: "unavailable" }, 503);
      const order = await client.rpc("learner_create_order", {
        p_course_id: body.id,
        p_locale: body.locale,
      });
      if (order.error || !order.data || !user.email)
        return reply({ error: "rule" }, 409);
      return reply({
        url: await startProviderCheckout(order.data, user.email),
      });
    }
    if (body.action === "start-order") {
      if (!checkoutConfiguration() || !user.email)
        return reply({ error: "unavailable" }, 503);
      const order = await readCommerceOrder(body.id);
      if (order.userId !== user.id) return reply({ error: "access" }, 403);
      return reply({ url: await startProviderCheckout(body.id, user.email) });
    }
    if (body.action === "check") {
      if (!checkoutConfiguration()) return reply({ error: "unavailable" }, 503);
      const order = await readCommerceOrder(body.id);
      if (order.userId !== user.id) return reply({ error: "access" }, 403);
      return reply({ status: await reconcileOrder(body.id) });
    }
    return reply({ error: "invalid" }, 400);
  } catch {
    return reply({ error: "retry" }, 503);
  }
}
