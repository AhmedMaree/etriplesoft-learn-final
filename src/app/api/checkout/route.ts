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
import { dialCode, toE164 } from "@/features/checkout/billing-countries";
import { CART_LIMIT } from "@/features/checkout/cart/cart-cookie";
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const COUPON_REASONS = ["invalid", "notApplicable", "used", "exhausted", "limit", "locked"];
const ruleError = (code?: string) =>
  code === "55000" ? "closed" : code === "22023" ? "billing" : "rule";
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
  // Cart checkout sends course ids only; the RPC prices them and rejects owned or unpublished courses.
  // `cart-coupon` applies a code from the cart page to that same server-priced order.
  if (record(body) && (body.action === "create-cart-order" || body.action === "cart-coupon")) {
    const ids = body.ids;
    if (
      typeof body.locale !== "string" ||
      !isLocale(body.locale) ||
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > CART_LIMIT ||
      !ids.every((id) => typeof id === "string" && UUID.test(id)) ||
      (body.action === "cart-coupon" && (typeof body.code !== "string" || body.code.length > 64))
    )
      return reply({ error: "invalid" }, 400);
    try {
      const order = await client.rpc("learner_create_cart_order", {
        p_course_ids: ids as string[],
        p_locale: body.locale,
      });
      if (order.error || !order.data)
        return reply(
          {
            error:
              order.error?.code === "23514" ? "owned" : order.error?.code === "54000" ? "limit" : "rule",
          },
          409,
        );
      if (body.action === "create-cart-order")
        return reply({ url: `/${body.locale}/payment?order=${order.data}&step=checkout` });
      const result = await client.rpc("learner_apply_coupon", {
        p_order_id: order.data,
        p_code: String(body.code),
      });
      if (result.error) return reply({ error: ruleError(result.error.code) }, 409);
      if (record(result.data) && result.data.ok === true) return reply({ applied: true });
      const reason =
        record(result.data) && typeof result.data.reason === "string" && COUPON_REASONS.includes(result.data.reason)
          ? result.data.reason
          : "invalid";
      return reply({ error: "coupon", reason }, 422);
    } catch {
      return reply({ error: "retry" }, 503);
    }
  }
  if (!record(body) || typeof body.id !== "string" || !UUID.test(body.id))
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
      if (order.error || !order.data)
        return reply(
          {
            error:
              order.error?.code === "23514" ? "owned" : order.error?.code === "54000" ? "limit" : "rule",
          },
          409,
        );
      return reply({ url: `/${body.locale}/payment?order=${order.data}` });
    }
    if (body.action === "apply-coupon") {
      if (typeof body.code !== "string" || body.code.length > 64)
        return reply({ error: "invalid" }, 400);
      const result = await client.rpc("learner_apply_coupon", {
        p_order_id: body.id,
        p_code: body.code,
      });
      if (result.error) return reply({ error: ruleError(result.error.code) }, 409);
      const value = result.data;
      if (record(value) && value.ok === true) return reply({ applied: true });
      const reason =
        record(value) && typeof value.reason === "string" && COUPON_REASONS.includes(value.reason)
          ? value.reason
          : "invalid";
      return reply({ error: "coupon", reason }, 422);
    }
    if (body.action === "remove-coupon") {
      const result = await client.rpc("learner_remove_coupon", { p_order_id: body.id });
      if (result.error) return reply({ error: ruleError(result.error.code) }, 409);
      return reply({ removed: true });
    }
    if (body.action === "start-order") {
      if (!checkoutConfiguration() || !user.email)
        return reply({ error: "unavailable" }, 503);
      const billing = body.billing;
      const phone =
        record(billing) &&
        typeof billing.country === "string" &&
        typeof billing.phone === "string" &&
        billing.phone.length <= 32 &&
        dialCode(billing.country)
          ? toE164(billing.country, billing.phone)
          : null;
      if (!record(billing) || typeof billing.name !== "string" || billing.name.length > 120 || !phone)
        return reply({ error: "billing" }, 400);
      // The billing snapshot RPC is owner-scoped, so it also rejects another learner's order.
      const saved = await client.rpc("learner_set_order_billing", {
        p_order_id: body.id,
        p_name: billing.name,
        p_country: String(billing.country),
        p_phone: phone,
      });
      if (saved.error) return reply({ error: ruleError(saved.error.code) }, 409);
      const order = await readCommerceOrder(body.id);
      if (order.userId !== user.id) return reply({ error: "access" }, 403);
      // Seat orders buy seats for an organization, so the buyer's own enrollments do not matter.
      const { data: orderRow } = await client.from("orders").select("organization_id").eq("id", body.id).maybeSingle();
      // An older pending order may hold a course the learner has since bought; never charge for it twice.
      const { data: items } = orderRow?.organization_id ? { data: [] } : await client
        .from("order_items")
        .select("course_id")
        .eq("order_id", body.id);
      const courseIds = (items ?? []).map((item) => item.course_id);
      if (courseIds.length) {
        const { data: owned, error: ownedError } = await client
          .from("enrollments")
          .select("course_id")
          .eq("user_id", user.id)
          .in("course_id", courseIds)
          .in("status", ["active", "completed"])
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .limit(1);
        if (ownedError) return reply({ error: "retry" }, 503);
        if (owned?.length) return reply({ error: "owned" }, 409);
      }
      return reply({ url: await startProviderCheckout(body.id, user.email) });
    }
    if (body.action === "check") {
      if (!checkoutConfiguration()) return reply({ error: "unavailable" }, 503);
      const order = await readCommerceOrder(body.id);
      if (order.userId !== user.id) return reply({ error: "access" }, 403);
      return reply({ status: await reconcileOrder(body.id) });
    }
    return reply({ error: "invalid" }, 400);
  } catch (error) {
    // Operator diagnostics only: internal error codes (no secrets or learner data); the learner gets "retry".
    console.error("checkout_failed", {
      action: body.action,
      reason: error instanceof Error ? error.message.slice(0, 80) : "unknown",
    });
    return reply({ error: "retry" }, 503);
  }
}
