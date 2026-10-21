"use client";

import { ShoppingCart } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "./use-cart";
import "./cart.css";

/** Header cart icon with the number of courses in the cart. */
export function CartLink({
  className,
  onClick,
}: {
  className: string;
  onClick?: () => void;
}) {
  const t = useTranslations("cart");
  const format = useFormatter();
  const count = useCart().length;
  const label = count ? t("openCount", { count }) : t("open");

  return (
    <Link
      href="/cart"
      className={`cart-link ${className}`}
      data-testid="header-cart"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <ShoppingCart aria-hidden="true" />
      {count > 0 && (
        <span className="cart-count" aria-hidden="true">
          {count > 9 ? "9+" : format.number(count, { numberingSystem: "latn" })}
        </span>
      )}
    </Link>
  );
}
