// The cart is a list of platform course slugs in a first-party cookie, so the server can render
// /cart for guests too. It is never trusted for price or access: checkout re-reads every course
// from the database and the order RPC prices it.
export const CART_COOKIE = "ets_cart";
export const CART_LIMIT = 20;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function parseCart(value: string | undefined | null): string[] {
  if (!value) return [];
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return [];
  }
  const slugs = decoded
    .split(",")
    .map((slug) => slug.trim())
    .filter((slug) => slug.length <= 120 && SLUG.test(slug));
  return [...new Set(slugs)].slice(0, CART_LIMIT);
}

export function serializeCart(slugs: readonly string[]) {
  return encodeURIComponent(parseCart(slugs.join(",")).join(","));
}
