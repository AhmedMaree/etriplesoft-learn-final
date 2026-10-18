import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";
import { record, verifiedSessionResult } from "./kashier-contract";
export function checkoutConfiguration() {
  const mode = process.env.KASHIER_MODE;
  if (
    process.env.KASHIER_CHECKOUT_ENABLED !== "true" ||
    (mode !== "test" && mode !== "live")
  )
    return null;
  // Test and live use different hosts and mode-scoped keys (Kashier "going live" guide).
  const apiBase =
    mode === "live" ? "https://api.kashier.io" : "https://test-api.kashier.io";
  const merchantId = process.env.KASHIER_MERCHANT_ID?.trim(),
    apiKey = process.env.KASHIER_PAYMENT_API_KEY?.trim(),
    secret = process.env.KASHIER_SECRET_KEY?.trim();
  const webhook = process.env.KASHIER_WEBHOOK_URL?.trim(),
    app = process.env.AUTH_SITE_URL;
  if (
    !merchantId ||
    !apiKey ||
    !secret ||
    !app ||
    (mode === "live" && !webhook)
  )
    return null;
  try {
    const w = webhook ? new URL(webhook) : null,
      a = new URL(app);
    if (
      (w &&
        (w.protocol !== "https:" ||
          w.username ||
          w.password ||
          w.search ||
          w.hash ||
          w.pathname !== "/api/webhooks/kashier" ||
          ["localhost", "127.0.0.1", "[::1]"].includes(w.hostname))) ||
      a.username ||
      a.password ||
      a.pathname !== "/" ||
      a.search ||
      a.hash ||
      (a.protocol !== "https:" &&
        !(
          a.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(a.hostname)
        ))
    )
      return null;
    // Real money: the app origin must be public HTTPS, never a local address.
    if (
      mode === "live" &&
      (a.protocol !== "https:" ||
        ["localhost", "127.0.0.1", "[::1]"].includes(a.hostname))
    )
      return null;
    return {
      merchantId,
      apiKey,
      secret,
      webhook: w?.href,
      app: a.origin,
      mode,
      apiBase,
    };
  } catch {
    return null;
  }
}
export function commerceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("configuration");
  return createClient<Database>(getSupabasePublicEnv().url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function readCommerceOrder(id: string) {
  const { data, error } = await commerceClient().rpc("commerce_get_order", {
    p_id: id,
  });
  if (
    error ||
    !record(data) ||
    typeof data.id !== "string" ||
    typeof data.userId !== "string" ||
    typeof data.total !== "number" ||
    typeof data.expires !== "string" ||
    !["en", "ar"].includes(String(data.locale))
  )
    throw new Error("order");
  return data;
}
async function providerJson(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("provider_unavailable");
  const body = await response.text();
  if (body.length > 1024 * 1024) throw new Error("provider_contract");
  return JSON.parse(body) as unknown;
}
export async function startProviderCheckout(orderId: string, email: string) {
  const cfg = checkoutConfiguration();
  if (!cfg) throw new Error("configuration");
  const order = await readCommerceOrder(orderId);
  if (
    order.status !== "pending" ||
    Date.parse(String(order.expires)) <= Date.now()
  )
    throw new Error("expired");
  if (typeof order.sessionUrl === "string") return order.sessionUrl;
  const value = await providerJson(
    `${cfg.apiBase}/v3/payment/sessions`,
    {
      method: "POST",
      headers: {
        Authorization: cfg.secret,
        "api-key": cfg.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expireAt: order.expires,
        maxFailureAttempts: 3,
        paymentType: "credit",
        amount: (Number(order.total) / 100).toFixed(2),
        currency: "EGP",
        order: orderId,
        merchantId: cfg.merchantId,
        merchantRedirect: `${cfg.app}/${order.locale}/payment?order=${orderId}`,
        display: order.locale,
        type: "one-time",
        allowedMethods: "card,wallet",
        manualCapture: false,
        enable3DS: true,
        failureRedirect: false,
        // Test mode can reconcile after return without a public webhook.
        ...(cfg.webhook ? { serverWebhook: cfg.webhook } : {}),
        customer: { email, reference: order.userId },
        description: `ETripleSoft Learn ${orderId}`,
      }),
    },
  );
  if (
    !record(value) ||
    typeof value._id !== "string" ||
    !/^[a-f0-9]{24}$/.test(value._id) ||
    value.sessionUrl !==
      `https://payments.kashier.io/session/${value._id}?mode=${cfg.mode}`
  )
    throw new Error("provider_contract");
  const bound = await commerceClient().rpc("commerce_bind_session", {
    p_id: orderId,
    p_session_id: value._id,
    p_url: value.sessionUrl,
  });
  if (bound.error) throw new Error("session_binding");
  return value.sessionUrl;
}
export async function reconcileOrder(id: string) {
  const cfg = checkoutConfiguration();
  if (!cfg) throw new Error("configuration");
  const order = await readCommerceOrder(id);
  if (typeof order.sessionId !== "string") throw new Error("session_missing");
  // Event names and redirect claims are not settlement authority. Fetch the bound session.
  const sessionUrl =
    `${cfg.apiBase}/v3/payment/sessions/` +
    encodeURIComponent(order.sessionId);
  const [session, payment] = await Promise.all([
    providerJson(sessionUrl, { method: "GET" }),
    providerJson(`${sessionUrl}/payment`, {
      method: "GET",
      headers: { Authorization: cfg.secret },
    }),
  ]);
  const value = { session, payment };
  const confirmed = verifiedSessionResult(value, {
    id,
    sessionId: order.sessionId,
    merchantId: cfg.merchantId,
    total: Number(order.total),
  });
  if (!confirmed) return "pending";
  const result = await commerceClient().rpc("commerce_confirm_order", {
    p_id: id,
    p_session_id: order.sessionId,
    p_provider_order_id: confirmed.providerOrderId,
    p_amount: Number(order.total),
    p_currency: "EGP",
    p_result: confirmed.result,
    p_event_key: `${confirmed.providerOrderId}:${confirmed.result}`,
  });
  if (result.error) throw new Error("settlement");
  return confirmed.result;
}
