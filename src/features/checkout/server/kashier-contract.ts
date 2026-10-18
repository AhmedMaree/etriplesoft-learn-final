import { createHmac, timingSafeEqual } from "node:crypto";
export const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export function minorAmount(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const match = /^(0|[1-9][0-9]{0,7})(?:\.([0-9]{1,2}))?$/.exec(String(value));
  if (!match) return null;
  const amount =
    Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount <= 999999999 ? amount : null;
}
export function verifyKashierSignature(
  body: unknown,
  signature: string | null,
  key: string,
): boolean {
  if (
    !key ||
    !signature ||
    !/^[a-f0-9]{64}$/i.test(signature) ||
    !record(body) ||
    !record(body.data)
  )
    return false;
  const data = body.data;
  const keys = data.signatureKeys;
  const required = [
    "amount",
    "channel",
    "currency",
    "kashierOrderId",
    "merchantOrderId",
    "method",
    "orderReference",
    "status",
    "transactionId",
    "transactionResponseCode",
  ];
  if (!Array.isArray(keys)) return false;
  const signingKeys = keys.filter(
    (key): key is string => typeof key === "string",
  );
  if (
    signingKeys.length !== keys.length ||
    signingKeys.length < required.length ||
    !required.every((key) => signingKeys.includes(key)) ||
    new Set(signingKeys).size !== signingKeys.length
  )
    return false;
  if (
    !signingKeys.every(
      (k) =>
        typeof data[k] === "string" ||
        (typeof data[k] === "number" && Number.isFinite(data[k])),
    )
  )
    return false;
  const payload = [...signingKeys]
    .sort()
    .map((k) => `${k}=${encodeURIComponent(String(data[k]))}`)
    .join("&");
  const expected = createHmac("sha256", key).update(payload).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export function verifiedSessionResult(
  value: unknown,
  expected: {
    id: string;
    sessionId: string;
    merchantId: string;
    total: number;
  },
) {
  if (!record(value) || !record(value.session) || !record(value.payment))
    throw new Error("provider_contract");
  const session = value.session;
  const params = session.paymentParams;
  const paymentResponse = value.payment;
  if (paymentResponse.message !== "success" || !record(paymentResponse.data))
    throw new Error("provider_contract");
  const payment = paymentResponse.data;
  if (
    session._id !== expected.sessionId ||
    session.merchantId !== expected.merchantId ||
    !record(params) ||
    params.order !== expected.id ||
    params.currency !== "EGP" ||
    minorAmount(params.amount) !== expected.total ||
    payment.sessionId !== expected.sessionId ||
    payment.merchantOrderId !== expected.id ||
    payment.merchantId !== expected.merchantId ||
    payment.currency !== "EGP" ||
    minorAmount(payment.amount) !== expected.total ||
    typeof payment.orderId !== "string"
  )
    throw new Error("provider_mismatch");
  if (
    payment.orderId === "NA" ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(payment.orderId)
  ) {
    if (session.status === "CREATED" || session.status === "PENDING") return null;
    throw new Error("provider_contract");
  }
  const amountMatches = (actual: unknown, expectedAmount: number) =>
    (typeof actual === "number" || typeof actual === "string") &&
    (String(actual) === String(expectedAmount) ||
      minorAmount(actual) === expectedAmount);
  if (
    session.status === "REFUNDED" &&
    payment.status === "SUCCESS" &&
    payment.lastTransactionType === "refund"
  ) {
    if (
      !amountMatches(session.capturedAmount, expected.total) ||
      !amountMatches(session.refundedAmount, expected.total)
    )
      throw new Error("unsupported_refund");
    return { result: "refunded" as const, providerOrderId: payment.orderId };
  }
  if (
    session.status === "PAID" &&
    payment.status === "SUCCESS" &&
    ["pay", "capture"].includes(String(payment.lastTransactionType))
  ) {
    if (!amountMatches(session.capturedAmount, expected.total))
      throw new Error("provider_mismatch");
    if (!amountMatches(session.refundedAmount, 0))
      throw new Error("unsupported_refund");
    return { result: "paid" as const, providerOrderId: payment.orderId };
  }
  if (
    session.status === "CREATED" ||
    session.status === "PENDING" ||
    payment.status === "PENDING"
  )
    return null;
  return null;
}
