import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readBoundedJson } from "@/lib/http/bounded-json";
import { hasTrustedRequestOrigin } from "@/lib/http/trusted-origin";
import { record } from "@/features/checkout/server/kashier-contract";
import { CART_LIMIT, parseCart } from "@/features/checkout/cart/cart-cookie";

const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

function slugList(value: unknown) {
  if (value === undefined || value === null) return [];
  if (
    !Array.isArray(value) ||
    value.length > CART_LIMIT ||
    !value.every((slug) => typeof slug === "string")
  )
    return null;
  return parseCart(value.join(","));
}

// Keeps a signed-in learner's account cart in step with the browser cart and returns the merged
// account cart. Guests get 401 and keep their browser-only cart.
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
  const add = record(body) ? slugList(body.add) : null;
  const remove = record(body) ? slugList(body.remove) : null;
  if (!add || !remove) return reply({ error: "invalid" }, 400);
  const { data, error } = await client.rpc("learner_cart_sync", {
    p_add: add,
    p_remove: remove,
  });
  if (error || !data) return reply({ error: "retry" }, 503);
  return reply({ slugs: data });
}
