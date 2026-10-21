"use client";

import { useSyncExternalStore } from "react";
import {
  CART_COOKIE,
  CART_LIMIT,
  parseCart,
  serializeCart,
} from "./cart-cookie";

const CHANGE_EVENT = "ets-cart-change";
const EMPTY: string[] = [];
let cached: { raw: string; slugs: string[] } = { raw: "", slugs: EMPTY };

function readCookie() {
  const entry = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${CART_COOKIE}=`));
  return entry ? entry.slice(CART_COOKIE.length + 1) : "";
}

// useSyncExternalStore needs a stable snapshot, so the parsed list is reused until the cookie changes.
function snapshot() {
  const raw = readCookie();
  if (raw !== cached.raw) cached = { raw, slugs: parseCart(raw) };
  return cached.slugs;
}

function write(slugs: readonly string[]) {
  const value = serializeCart(slugs);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = value
    ? `${CART_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`
    : `${CART_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Signed-in learners also keep the cart on their account so it follows them across devices.
// The Supabase session cookie is only a hint to skip the request for guests; the API decides.
const signedInHint = () => /(^|; )sb-[^=]*-auth-token/.test(document.cookie);
let queue: Promise<void> = Promise.resolve();
let mergedThisLoad = false;

function sync(change: { add?: readonly string[]; remove?: readonly string[] }) {
  if (!signedInHint()) return;
  // Requests run one at a time so an older response never overwrites a newer change.
  queue = queue.then(async () => {
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      });
      if (!response.ok) return;
      const value: unknown = await response.json();
      if (
        value &&
        typeof value === "object" &&
        "slugs" in value &&
        Array.isArray(value.slugs)
      )
        write(parseCart(value.slugs.join(",")));
    } catch {
      // The browser cart still works; the account copy catches up on the next change.
    }
  });
}

function subscribe(onChange: () => void) {
  // Once per page load, merge this browser's cart into the account cart and adopt the result.
  if (!mergedThisLoad) {
    mergedThisLoad = true;
    sync({ add: snapshot() });
  }
  // Cookies have no cross-tab event; re-read when this tab regains focus.
  const onVisible = () => document.visibilityState === "visible" && onChange();
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/** Course slugs in the cart. Empty during server rendering and hydration. */
export function useCart() {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

/** Adds a course; returns false when the cart is already full. */
export function addToCart(slug: string) {
  const slugs = snapshot();
  if (slugs.includes(slug)) return true;
  if (slugs.length >= CART_LIMIT) return false;
  write([...slugs, slug]);
  sync({ add: [slug] });
  return true;
}

export function removeFromCart(remove: readonly string[]) {
  const slugs = snapshot();
  if (remove.some((slug) => slugs.includes(slug)))
    write(slugs.filter((slug) => !remove.includes(slug)));
  // The account cart may hold courses this browser does not (added on another device).
  sync({ remove });
}

/** Resolves once pending account-cart requests finish (before re-rendering the cart on the server). */
export function cartSynced() {
  return queue;
}

/** Adopts the account cart the server already merged (cart page), without another request. */
export function replaceCart(slugs: readonly string[]) {
  const current = snapshot();
  if (
    current.length === slugs.length &&
    current.every((slug, index) => slug === slugs[index])
  )
    return;
  write(slugs);
}
