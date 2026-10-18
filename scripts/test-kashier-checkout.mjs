import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// Exercise the real server adapter in Node without Next's server-only marker.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only")
      return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier.startsWith("@/"))
      return nextResolve(
        new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    if (specifier === "./kashier-contract")
      return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
});
const { checkoutConfiguration, startProviderCheckout, reconcileOrder } =
  await import("../src/features/checkout/server/commerce.ts");
const env = {
  KASHIER_MODE: "test",
  KASHIER_CHECKOUT_ENABLED: "true",
  KASHIER_MERCHANT_ID: "MID-fixture",
  KASHIER_PAYMENT_API_KEY: "fixture-api-key",
  KASHIER_SECRET_KEY: "fixture-secret",
  AUTH_SITE_URL: "http://127.0.0.1:3010",
  SUPABASE_SERVICE_ROLE_KEY: "fixture-service-key",
  NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-public-key",
};
function configure(t, overrides = {}) {
  t.mock.property(process, "env", {
    ...process.env,
    ...env,
    KASHIER_WEBHOOK_URL: "",
    ...overrides,
  });
}
test("test credentials enable localhost checkout without a public webhook", (t) => {
  configure(t);
  const cfg = checkoutConfiguration();
  assert.ok(cfg);
  assert.equal(cfg.apiBase, "https://test-api.kashier.io");
  assert.equal(cfg.webhook, undefined);
});
test("disabled checkout, invalid mode and each absent credential fail closed", (t) => {
  configure(t);
  for (const [key, value] of [
    ["KASHIER_CHECKOUT_ENABLED", "false"],
    ["KASHIER_MODE", "sandbox"],
    ["KASHIER_MERCHANT_ID", ""],
    ["KASHIER_PAYMENT_API_KEY", ""],
    ["KASHIER_SECRET_KEY", ""],
  ]) {
    const before = process.env[key];
    process.env[key] = value;
    assert.equal(checkoutConfiguration(), null);
    process.env[key] = before;
  }
});
test("configured webhooks remain strictly validated in test mode", (t) => {
  configure(t);
  for (const value of [
    "invalid",
    "http://example.test/api/webhooks/kashier",
    "https://localhost/api/webhooks/kashier",
    "https://example.test/wrong",
    "https://example.test/api/webhooks/kashier?x=1",
  ]) {
    process.env.KASHIER_WEBHOOK_URL = value;
    assert.equal(checkoutConfiguration(), null);
  }
  process.env.KASHIER_WEBHOOK_URL = "https://example.test/api/webhooks/kashier";
  assert.equal(
    checkoutConfiguration()?.webhook,
    process.env.KASHIER_WEBHOOK_URL,
  );
});
test("live mode still requires public HTTPS app and webhook", (t) => {
  configure(t, { KASHIER_MODE: "live", AUTH_SITE_URL: "https://example.test" });
  assert.equal(checkoutConfiguration(), null);
  process.env.KASHIER_WEBHOOK_URL = "https://example.test/api/webhooks/kashier";
  assert.equal(checkoutConfiguration()?.apiBase, "https://api.kashier.io");
  process.env.AUTH_SITE_URL = env.AUTH_SITE_URL;
  assert.equal(checkoutConfiguration(), null);
});

const id = "12345678-1234-4321-8123-123456789abc";
const sessionId = "0123456789abcdef01234567";
const sessionUrl = `https://payments.kashier.io/session/${sessionId}?mode=test`;
test("checkout sends authoritative order price and omits absent webhook", async (t) => {
  configure(t);
  let bound = false;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    const body = JSON.parse(init.body);
    if (String(url).endsWith("/rpc/commerce_get_order"))
      return Response.json({
        id,
        userId: id,
        total: 49900,
        locale: "en",
        status: "pending",
        expires: new Date(Date.now() + 60000).toISOString(),
      });
    if (String(url) === "https://test-api.kashier.io/v3/payment/sessions") {
      assert.equal(body.amount, "499.00");
      assert.equal(body.currency, "EGP");
      assert.equal(body.customer.reference, id);
      assert.equal(
        body.merchantRedirect,
        `${env.AUTH_SITE_URL}/en/payment?order=${id}&step=checkout&returned=1`,
      );
      assert.equal(Object.hasOwn(body, "serverWebhook"), false);
      return Response.json({ _id: sessionId, sessionUrl });
    }
    assert.ok(String(url).endsWith("/rpc/commerce_bind_session"));
    bound = true;
    assert.equal(body.p_session_id, sessionId);
    assert.equal(body.p_amount, 49900);
    return Response.json(null);
  });
  assert.equal(
    await startProviderCheckout(id, "fixture@example.test"),
    sessionUrl,
  );
  assert.ok(bound);
});
test("return reconciliation settles only independently verified full payment", async (t) => {
  configure(t);
  let paid = false;
  let confirmations = 0;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    const path = String(url);
    if (path.endsWith("/rpc/commerce_get_order"))
      return Response.json({
        id,
        userId: id,
        total: 49900,
        locale: "ar",
        expires: new Date().toISOString(),
        sessionId,
      });
    if (path.endsWith(`/sessions/${sessionId}`))
      assert.fail("paid sessions cannot be read from the public session document");
    if (path.endsWith(`/sessions/${sessionId}/payment`)) {
      assert.equal(init.headers.Authorization, env.KASHIER_SECRET_KEY);
      return Response.json({
        message: "success",
        data: {
          sessionId,
          merchantOrderId: id,
          merchantId: env.KASHIER_MERCHANT_ID,
          orderId: paid ? "9f492708-47bd-4073-b562-c98f73fe7fe2" : "NA",
          amount: 499,
          currency: "EGP",
          status: paid ? "PAID" : "CREATED",
          capturedAmount: paid ? 499 : 0,
          refundedAmount: 0,
          lastTransactionType: paid ? "pay" : "NA",
          history: paid ? [{ status: "SUCCESS", operation: "pay", amount: 499 }] : [],
        },
      });
    }
    assert.ok(path.endsWith("/rpc/commerce_confirm_order"));
    assert.equal(JSON.parse(init.body).p_result, "paid");
    confirmations++;
    return Response.json(null);
  });
  assert.equal(await reconcileOrder(id), "pending");
  assert.equal(confirmations, 0);
  paid = true;
  assert.equal(await reconcileOrder(id), "paid");
  assert.equal(confirmations, 1);
});
