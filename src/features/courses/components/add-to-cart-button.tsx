"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { addToCart, useCart } from "@/features/checkout/cart/use-cart";
import { notifyDemoToast } from "@/lib/browser/demo-toast";

// Adds a course to the browser cart; no sign-in needed until checkout. Once added it links to the cart.
// `icon` is the compact course-card control; `button` is a labelled button for course detail pages.
export function AddToCartButton({
  courseSlug,
  courseTitle,
  variant = "icon",
  className = "course-cart-button",
  onAdded,
}: {
  courseSlug: string;
  courseTitle: string;
  variant?: "icon" | "button";
  className?: string;
  onAdded?: () => void;
}) {
  const t = useTranslations("cart");
  const inCart = useCart().includes(courseSlug);
  const icon = variant === "icon";
  const viewCart = { href: "/cart", label: t("viewCart") };

  function add() {
    if (addToCart(courseSlug)) {
      notifyDemoToast(t("added", { title: courseTitle }), { action: viewCart });
      onAdded?.();
    } else notifyDemoToast(t("full"), { tone: "error", action: viewCart });
  }

  if (inCart)
    return (
      <Link
        className={`${className} is-in-cart`}
        data-testid="course-view-cart"
        href="/cart"
        aria-label={
          icon ? t("viewCartTitle", { title: courseTitle }) : undefined
        }
        title={icon ? t("viewCartTitle", { title: courseTitle }) : undefined}
      >
        <Check size={icon ? 19 : 18} aria-hidden="true" />
        {!icon && t("viewCart")}
      </Link>
    );

  return (
    <button
      className={className}
      data-testid="course-add-to-cart"
      type="button"
      aria-label={icon ? t("addTitle", { title: courseTitle }) : undefined}
      title={icon ? t("addTitle", { title: courseTitle }) : undefined}
      onClick={add}
    >
      <ShoppingCart size={icon ? 19 : 18} aria-hidden="true" />
      {!icon && t("add")}
    </button>
  );
}
