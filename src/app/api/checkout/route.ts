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
