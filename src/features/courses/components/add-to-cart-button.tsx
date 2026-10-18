"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";

export function AddToCartButton({
  courseId,
  courseSlug,
  courseTitle,
  signedIn,
}: {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  signedIn: boolean;
}) {
  const t = useTranslations("courses");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const label = t("addToCart", { title: courseTitle });

  if (!signedIn) {
    return (
      <Link
        className="course-cart-button"
        data-testid="course-add-to-cart"
        href={`/payment?course=${encodeURIComponent(courseSlug)}`}
        aria-label={label}
        title={label}
      >
        <ShoppingCart size={19} aria-hidden="true" />
      </Link>
    );
  }

  async function addToCart() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-to-cart",
          id: courseId,
          locale,
        }),
      });
      const value: unknown = await response.json();
      if (!response.ok || !value || typeof value !== "object" || !("url" in value) || typeof value.url !== "string") {
        throw new Error("cart_unavailable");
      }
      const destination = new URL(value.url, window.location.origin);
      const orderId = destination.searchParams.get("order");
      if (
        destination.origin !== window.location.origin ||
        destination.pathname !== `/${locale}/payment` ||
        !orderId ||
        !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(orderId)
      ) {
        throw new Error("cart_unavailable");
      }
      router.push(`/payment?order=${orderId}`);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="course-cart-button"
        data-testid="course-add-to-cart"
        type="button"
        aria-label={label}
        title={label}
        aria-busy={busy}
        disabled={busy}
        onClick={() => void addToCart()}
      >
        <ShoppingCart size={19} aria-hidden="true" />
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {error ? t("cartError") : busy ? t("addingToCart") : ""}
      </span>
    </>
  );
}
