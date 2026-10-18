import {
  checkoutConfiguration,
  reconcileOrder,
} from "@/features/checkout/server/commerce";
import {
  record,
  verifyKashierSignature,
} from "@/features/checkout/server/kashier-contract";
import { readBoundedJson } from "@/lib/http/bounded-json";
export async function POST(request: Request) {
  const cfg = checkoutConfiguration();
  if (!cfg) return new Response(null, { status: 503 });
  let body: unknown;
  try {
    body = await readBoundedJson(request, 65536);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (
    !verifyKashierSignature(
      body,
      request.headers.get("x-kashier-signature"),
      cfg.apiKey,
    )
  )
    return new Response(null, { status: 401 });
  if (
    !record(body) ||
    !record(body.data) ||
    typeof body.data.merchantOrderId !== "string" ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
      body.data.merchantOrderId,
    )
  )
    return new Response(null, { status: 400 });
  try {
    const status = await reconcileOrder(body.data.merchantOrderId);
    // Kashier retries every non-200 reply. A signed failure/pending event that leaves the order
    // pending is acknowledged; only an unsettled SUCCESS is retried until reconciliation sees it.
    const retry = status === "pending" && body.data.status === "SUCCESS";
    return new Response(null, { status: retry ? 503 : 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
