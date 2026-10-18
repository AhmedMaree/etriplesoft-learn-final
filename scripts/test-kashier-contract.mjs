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
  total: 49900,
};
const session = {
  _id: expected.sessionId,
  merchantId: expected.merchantId,
  paymentParams: { order: expected.id, amount: "499.00", currency: "EGP" },
  capturedAmount: 499,
  refundedAmount: 0,
  status: "PAID",
};
const payment = {
  sessionId: expected.sessionId,
  merchantOrderId: expected.id,
  merchantId: expected.merchantId,
  orderId: "12345678-1234-4321-8123-123456789abc",
  amount: "499.00",
  currency: "EGP",
  status: "SUCCESS",
  lastTransactionType: "pay",
};
const response = (s, p) => ({
  session: s,
  payment: { message: "success", data: p },
});
test("accepts independently verified full capture", () =>
  assert.equal(verifiedSessionResult(response(session, payment), expected).result, "paid"));
test("rejects wrong merchant, amount, session and merchant order", () => {
  for (const changed of [{ merchantId: "other" }, { _id: "other" }])
    assert.throws(() =>
      verifiedSessionResult(response({ ...session, ...changed }, payment), expected),
    );
  for (const changed of [
    { merchantId: "other" },
    { sessionId: "other" },
    { amount: 1 },
    { merchantOrderId: "other" },
  ])
    assert.throws(() =>
      verifiedSessionResult(response(session, { ...payment, ...changed }), expected),
    );
});
test("authorization or failure alone cannot grant access", () => {
  assert.equal(
    verifiedSessionResult(
      response({ ...session, status: "AUTHORIZED" }, { ...payment, status: "SUCCESS" }),
      expected,
    ),
    null,
  );
  assert.equal(
    verifiedSessionResult(
      response({ ...session, status: "FAILED" }, { ...payment, status: "FAILURE" }),
      expected,
    ),
    null,
  );
});
test("full confirmed refund removes access and pending sessions do not grant access", () => {
  assert.equal(
    verifiedSessionResult(
      response(
        { ...session, status: "REFUNDED", refundedAmount: 499 },
        { ...payment, status: "SUCCESS", lastTransactionType: "refund" },
      ),
      expected,
    ).result,
    "refunded",
  );
  assert.equal(
    verifiedSessionResult(
      response(
        { ...session, status: "CREATED", capturedAmount: 0 },
        { ...payment, status: "PENDING", lastTransactionType: "NA", orderId: "NA" },
      ),
      expected,
    ),
    null,
  );
  assert.throws(() =>
    verifiedSessionResult(
      response({ ...session, refundedAmount: 1 }, payment),
      expected,
    ),
  );
});
test("unsigned event name cannot alter verified payment result", () =>
  assert.equal(
    verifiedSessionResult({ ...response(session, payment), event: "refund" }, expected)
      .result,
    "paid",
  ));
