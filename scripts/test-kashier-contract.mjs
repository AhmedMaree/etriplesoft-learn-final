import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import {
  minorAmount,
  verifyKashierSignature,
  verifiedSessionResult,
} from "../src/features/checkout/server/kashier-contract.ts";
test("minor units reject imprecise, negative and malformed amounts", () => {
  assert.equal(minorAmount("499.01"), 49901);
  for (const x of ["1.001", "-1", "1e2", "01", null])
    assert.equal(minorAmount(x), null);
});
const data = {
  amount: 1,
  channel: "online | e-commerce",
  currency: "EGP",
  kashierOrderId: "9ad06b17-755b-4e21-9774-aff3e2726ac9",
  merchantOrderId: "1653481557813",
  method: "card",
  orderReference: "TEST-ORD-38855",
  status: "SUCCESS",
  transactionId: "TX-249893963",
  transactionResponseCode: "00",
};
const payload = Object.keys(data)
  .sort()
  .map((k) => `${k}=${encodeURIComponent(String(data[k]))}`)
  .join("&");
const signature = createHmac("sha256", "11111").update(payload).digest("hex");
const body = {
  event: "pay",
  data: { ...data, signatureKeys: Object.keys(data).reverse() },
};
test("matches Kashier published signature vector and accepts case-insensitive hex", () => {
  assert.equal(
    signature,
    "9610477b2255b2a8ef84fd89adfaa5f1305ff9c20324205851890f1ea03109f4",
  );
  assert.ok(verifyKashierSignature(body, signature.toUpperCase(), "11111"));
});
test("verifies additional signed provider fields without dropping them", () => {
  const extended = {
    ...body,
    data: {
      ...body.data,
      apikeyname: "test-key",
      signatureKeys: [...body.data.signatureKeys, "apikeyname"],
    },
  };
  const signed = Object.keys(extended.data)
    .filter((k) => k !== "signatureKeys")
    .sort()
    .map((k) => `${k}=${encodeURIComponent(String(extended.data[k]))}`)
    .join("&");
  assert.ok(
    verifyKashierSignature(
      extended,
      createHmac("sha256", "11111").update(signed).digest("hex"),
      "11111",
    ),
  );
});
test("rejects tampering, empty keys, duplicate keys and malformed headers", () => {
  assert.equal(
    verifyKashierSignature(
      { ...body, data: { ...body.data, amount: 2 } },
      signature,
      "11111",
    ),
    false,
  );
  assert.equal(
    verifyKashierSignature(
      { ...body, data: { signatureKeys: [] } },
      signature,
      "11111",
    ),
    false,
  );
  assert.equal(
    verifyKashierSignature(
      {
        ...body,
        data: {
          ...body.data,
          signatureKeys: [...body.data.signatureKeys, "amount"],
        },
      },
      signature,
      "11111",
    ),
    false,
  );
  assert.equal(verifyKashierSignature(body, "00", "11111"), false);
});
const expected = {
  id: "local-order",
  sessionId: "session",
  merchantId: "MID-test",
  total: 44910,
};
// Shape of a real Kashier test-mode GET /v3/payment/sessions/{id}/payment response (2026-10-18).
const payment = {
  sessionId: expected.sessionId,
  status: "PAID",
  merchantId: expected.merchantId,
  merchantOrderId: expected.id,
  amount: 449.1,
  currency: "EGP",
  method: "card",
  orderId: "9f492708-47bd-4073-b562-c98f73fe7fe2",
  capturedAmount: 449.1,
  refundedAmount: 0,
  lastTransactionType: "pay",
  history: [
    { status: "SUCCESS", operation: "pay", amount: 449.1, transactionId: "TX-1" },
  ],
};
const response = (p) => ({ message: "success", data: p });
test("accepts independently verified full capture", () =>
  assert.equal(verifiedSessionResult(response(payment), expected).result, "paid"));
test("rejects wrong merchant, amount, session and merchant order", () => {
  for (const changed of [
    { merchantId: "other" },
    { sessionId: "other" },
    { amount: 1 },
    { merchantOrderId: "other" },
    { currency: "USD" },
    { capturedAmount: 1 },
    { history: [{ status: "SUCCESS", operation: "pay", amount: 1 }] },
  ])
    assert.throws(() => verifiedSessionResult(response({ ...payment, ...changed }), expected));
  assert.throws(() => verifiedSessionResult({ message: "error", data: payment }, expected));
});
test("authorization or failure alone cannot grant access", () => {
  for (const status of ["AUTHORIZED", "FAILED", "CREATED", "PENDING", "EXPIRED"])
    assert.equal(verifiedSessionResult(response({ ...payment, status }), expected), null);
  assert.throws(() =>
    verifiedSessionResult(
      response({ ...payment, history: [{ status: "FAILURE", operation: "pay", amount: 449.1 }] }),
      expected,
    ),
  );
});
test("full confirmed refund removes access and pending sessions do not grant access", () => {
  assert.equal(
    verifiedSessionResult(
      response({ ...payment, status: "REFUNDED", refundedAmount: 449.1, lastTransactionType: "refund" }),
      expected,
    ).result,
    "refunded",
  );
  assert.equal(
    verifiedSessionResult(
      response({ ...payment, status: "CREATED", capturedAmount: 0, orderId: "NA", history: [] }),
      expected,
    ),
    null,
  );
  assert.throws(() => verifiedSessionResult(response({ ...payment, refundedAmount: 1 }), expected));
  assert.throws(() =>
    verifiedSessionResult(response({ ...payment, status: "REFUNDED", refundedAmount: 100 }), expected),
  );
});
test("unsigned event name cannot alter verified payment result", () =>
  assert.equal(
    verifiedSessionResult({ ...response(payment), event: "refund" }, expected).result,
    "paid",
  ));
