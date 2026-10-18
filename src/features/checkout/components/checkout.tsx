"use client";

import Image from "next/image";
import { useState } from "react";
import allCoursesArtwork from "../../../../public/assets/all-courses-artwork.png";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  FileText,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { courseImage, hasCourseThumbnail } from "@/features/courses/components/course-image";

export type CheckoutCartItem = {
  id: string;
  slug: string | null;
  title: string;
  amountMinor: number;
  durationSeconds: number | null;
};

export function Checkout({
  courseId,
  orderId,
  items,
  amount,
  status,
  enabled,
}: {
  courseId?: string;
  orderId?: string;
  items: CheckoutCartItem[];
  amount: number;
  status?: string;
  enabled: boolean;
}) {
  const t = useTranslations("realCheckout"),
    locale = useLocale(),
    format = useFormatter(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const formatMoney = (minor: number) =>
    format.number(minor / 100, {
      style: "currency",
      currency: "EGP",
      numberingSystem: "latn",
      maximumFractionDigits: 0,
    });
  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (hours && remainder)
      return t("durationHoursMinutes", { h: String(hours), m: String(remainder) });
    if (hours) return t("durationHours", { h: String(hours) });
    return t("durationMinutes", { m: String(Math.max(minutes, 1)) });
  };

  async function act(action: "pay" | "check" = "pay") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: orderId
            ? action === "check"
              ? "check"
              : "start-order"
            : "start",
          id: orderId || courseId,
          locale,
        }),
      });
      const value: unknown = await response.json();
      if (!response.ok || !value || typeof value !== "object")
        throw new Error("retry");
      if ("url" in value && typeof value.url === "string") {
        const url = new URL(value.url);
        if (
          url.origin !== "https://payments.kashier.io" ||
          !/^\/session\/[a-f0-9]{24}$/.test(url.pathname) ||
          !["?mode=test", "?mode=live"].includes(url.search)
        )
          throw new Error("retry");
        window.location.assign(url.href);
      } else if (
        "status" in value &&
        typeof value.status === "string" &&
        ["pending", "paid", "refunded"].includes(value.status)
      ) {
        setMessage(value.status);
        router.refresh();
      } else throw new Error("retry");
    } catch {
      setMessage("retry");
    } finally {
      setBusy(false);
    }
  }

  const stepLabels = [t("stepCart"), t("stepPayment"), t("stepConfirmation")];

  return (
    <div className="checkout-cart-page">
      <header className="checkout-cart-header">
        <nav className="checkout-cart-steps" aria-label={t("checkoutSteps")}>
          {stepLabels.map((label, index) => (
            <span
              className={index === 0 ? "checkout-step is-current" : "checkout-step"}
              aria-current={index === 0 ? "step" : undefined}
              key={label}
            >
              <b>{index + 1}</b>
              <span>{label}</span>
            </span>
          ))}
        </nav>
        <div className="checkout-cart-heading">
          <div>
            <h1>{t(items.length ? "cartTitle" : "emptyCartTitle")}</h1>
            <p>{t(items.length ? "cartDescription" : "emptyCartDescription")}</p>
          </div>
          <div className="checkout-cart-art" aria-hidden="true">
            <ShoppingCart />
          </div>
        </div>
      </header>

      {items.length ? (
        <div className="checkout-cart-layout">
          <section className="checkout-cart-items" aria-label={t("cartItems")}>
            <div className="checkout-cart-list-heading">
              <span className="checkout-cart-count">
                <BookOpen aria-hidden="true" />
                <strong>{format.number(items.length, { numberingSystem: "latn" })}</strong>
                {t("courseCount", { count: items.length })}
              </span>
            </div>
            <div className="checkout-cart-list">
              {items.map((item, index) => (
                <article className="checkout-cart-item" key={item.id}>
                  <div className="checkout-item-image">
                    <Image
                      src={
                        item.slug && hasCourseThumbnail(item.slug)
                          ? courseImage(item.slug)
                          : allCoursesArtwork
                      }
                      alt=""
                      fill
                      priority={index === 0}
                      sizes="(max-width: 700px) 30vw, 190px"
                    />
                    <span>{t("courseType")}</span>
                  </div>
                  <div className="checkout-item-details">
                    <h2 dir="auto">{item.title}</h2>
                    <div className="checkout-item-meta">
                      {item.durationSeconds && item.durationSeconds > 0 ? (
                        <span>
                          <Clock3 aria-hidden="true" />
                          {t("duration", { time: formatDuration(item.durationSeconds) })}
                        </span>
                      ) : null}
                      <span>
                        <BookOpen aria-hidden="true" />
                        {t("courseType")}
                      </span>
                    </div>
                    <strong className="checkout-item-price">
                      {formatMoney(item.amountMinor)}
                    </strong>
                  </div>
                </article>
              ))}
            </div>
            <Link className="checkout-back-link" href="/courses">
              <ArrowRight className="flip-rtl" aria-hidden="true" />
              {t("continueBrowsing")}
            </Link>
          </section>

          <aside className="checkout-cart-summary" aria-labelledby="checkout-summary-title">
            <div className="checkout-summary-heading">
              <span className="checkout-summary-icon">
                <FileText aria-hidden="true" />
              </span>
              <div>
                <h2 id="checkout-summary-title">{t("summary")}</h2>
                <p>{t("courseCount", { count: items.length })}</p>
              </div>
            </div>
            <div className="checkout-summary-rows">
              <div>
                <span><BookOpen aria-hidden="true" />{t("numberOfCourses")}</span>
                <strong>{format.number(items.length, { numberingSystem: "latn" })}</strong>
              </div>
              <div>
                <span><FileText aria-hidden="true" />{t("subtotal")}</span>
                <strong>{formatMoney(amount)}</strong>
              </div>
            </div>
            <div className="checkout-summary-total">
              <span>{t("total")}</span>
              <strong>{formatMoney(amount)}</strong>
            </div>
            {status && (
              <p className={`checkout-payment-status status-${status}`} role="status">
                {t(["paid", "refunded"].includes(status) ? status : "pending")}
              </p>
            )}
            {!enabled && <p className="checkout-setup-note" role="status">{t("setupPending")}</p>}
            {message && <p className="checkout-error" role="status">{t(message)}</p>}
            <button
              className="checkout-continue-button"
              disabled={!enabled || busy || status === "paid" || status === "refunded"}
              onClick={() => void act("pay")}
            >
              <ShoppingCart aria-hidden="true" />
              <span>{busy ? t("working") : t("continueToPayment")}</span>
              <ArrowRight className="flip-rtl" aria-hidden="true" />
            </button>
            {orderId && (
              <button
                className="checkout-check-button"
                disabled={!enabled || busy}
                onClick={() => void act("check")}
              >
                {t("check")}
              </button>
            )}
            <div className="checkout-secure-note">
              <ShieldCheck aria-hidden="true" />
              <p>{t("confirmation")}</p>
            </div>
          </aside>
        </div>
      ) : (
        <section className="checkout-empty-state">
          <span><ShoppingCart aria-hidden="true" /></span>
          <h2>{t("emptyCartTitle")}</h2>
          <p>{t("pickCourse")}</p>
          <Link className="checkout-continue-button" href="/courses">
            {t("catalog")}
            <ArrowRight className="flip-rtl" aria-hidden="true" />
          </Link>
        </section>
      )}
    </div>
  );
}
