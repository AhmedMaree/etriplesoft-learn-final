"use client";

import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n/config";
import { AddToCartButton } from "@/features/courses/components/add-to-cart-button";

/**
 * Add-to-cart on the static marketing course page. Prices live only in the platform catalog, so the
 * button appears once the public catalog confirms the course is published in this locale and paid.
 * Until then an invisible copy holds its space so the neighbouring buttons do not jump.
 */
export function CourseCartButton({
  slug,
  title,
  locale,
  className,
}: {
  slug: string;
  title: string;
  locale: Locale;
  className: string;
}) {
  const t = useTranslations("cart");
  const [paid, setPaid] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    try {
      void createClient()
        .rpc("catalog_get_course", { p_slug: slug, p_locale: locale })
        .then(
          ({ data }) => {
            if (active) setPaid(Number(data?.[0]?.price_minor ?? 0) > 0);
          },
          () => active && setPaid(false),
        );
    } catch {
      // Without Supabase configuration the page simply has no cart button.
      queueMicrotask(() => active && setPaid(false));
    }
    return () => {
      active = false;
    };
  }, [slug, locale]);

  if (paid === null)
    return (
      <span className={`${className} mk-cart-placeholder`} aria-hidden="true">
        <ShoppingCart size={18} />
        {t("add")}
      </span>
    );
  if (!paid) return null;
  return (
    <AddToCartButton
      courseSlug={slug}
      courseTitle={title}
      variant="button"
      className={className}
    />
  );
}
