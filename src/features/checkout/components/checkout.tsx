"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import allCoursesArtwork from "../../../../public/assets/all-courses-artwork.png";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Lock,
  LogIn,
  ShoppingCart,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  courseImage,
  hasCourseThumbnail,
} from "@/features/courses/components/course-image";
import { courseHref } from "@/features/courses/components/course-links";
import { AddToCartButton } from "@/features/courses/components/add-to-cart-button";
import { cartSynced, removeFromCart, replaceCart } from "../cart/use-cart";
import { CheckoutProtect } from "./checkout-protect";

export type CheckoutCartItem = {
  id: string;
  slug: string | null;
  title: string;
  amountMinor: number;
  durationSeconds: number | null;
};
export type CartCoupon = {
  orderId: string;
  code: string;
  discountMinor: number;
};
export type CartSuggestion = {
  id: string;
  slug: string;
  title: string;
  amountMinor: number;
  level: string | null;
};

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const COUPON_REASONS = [
  "invalid",
  "notApplicable",
  "used",
  "exhausted",
  "limit",
  "locked",
  "closed",
  "retry",
];

const thumbnail = (slug: string | null) =>
  slug && hasCourseThumbnail(slug) ? courseImage(slug) : allCoursesArtwork;

// Step 1 of checkout (Review Order). It shares the layout of the billing and payment step:
// numbered cards on the left, order summary, protection panel and the main action on the right.
export function Checkout({
  courseId,
  orderId,
  items,
  amount,
  status,
  enabled,
  cart,
}: {
  courseId?: string;
  orderId?: string;
  items: CheckoutCartItem[];
  amount: number;
  status?: string;
  enabled: boolean;
  /** Shopping-cart mode: items come from the cart and can be removed. */
  cart?: {
    signedIn: boolean;
    dropped: string[];
    resume?: boolean;
    /** The merged account cart, which the browser cart adopts. */
    accountSlugs?: string[] | null;
    coupon?: CartCoupon | null;
    suggestions?: CartSuggestion[];
  };
}) {
  const t = useTranslations("realCheckout"),
    tc = useTranslations("cart"),
    locale = useLocale(),
    format = useFormatter(),
    router = useRouter();
  const [busy, setBusy] = useState<"" | "continue" | "coupon" | "remove">(""),
    [message, setMessage] = useState(""),
    [couponInput, setCouponInput] = useState(""),
    [couponMessage, setCouponMessage] = useState<{
      kind: "error" | "success";
      text: string;
    } | null>(null);
  const coupon = cart?.coupon ?? null;
  const discount = coupon ? Math.min(coupon.discountMinor, amount) : 0;
  const closed = status === "paid" || status === "refunded";

  const accountKey = cart?.accountSlugs?.join(",") ?? null;
  const droppedKey = cart?.dropped.join(",") ?? "";
  useEffect(() => {
    // Adopt the account cart, then drop courses the server could not sell (unpublished, free or owned).
    if (accountKey !== null)
      replaceCart(accountKey ? accountKey.split(",") : []);
    if (droppedKey) removeFromCart(droppedKey.split(","));
  }, [accountKey, droppedKey]);

  // After signing in, the learner returns here and checkout continues on its own.
  const loginHref = `/login?next=${encodeURIComponent(`/${locale}/cart?checkout=1`)}`;
  const resumed = useRef(false);
  useEffect(() => {
    if (!cart?.resume || resumed.current) return;
    resumed.current = true;
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname,
    );
    // Stay on the cart when something was removed, so the learner sees why.
    if (cart.signedIn && enabled && items.length && !droppedKey)
      void continueToCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.resume]);

  const formatMoney = (minor: number) =>
    format.number(minor / 100, {
      style: "currency",
      currency: "EGP",
      numberingSystem: "latn",
      minimumFractionDigits: minor % 100 ? 2 : 0,
      maximumFractionDigits: 2,
    });
  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (hours && remainder)
      return t("durationHoursMinutes", {
        h: String(hours),
        m: String(remainder),
      });
    if (hours) return t("durationHours", { h: String(hours) });
    return t("durationMinutes", { m: String(Math.max(minutes, 1)) });
  };

  async function post(body: object) {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const value: unknown = await response.json().catch(() => null);
    return {
      response,
      value:
        value && typeof value === "object"
          ? (value as Record<string, unknown>)
          : {},
    };
  }

  async function remove(slug: string | null) {
    if (!slug || busy) return;
    setBusy("remove");
    removeFromCart([slug]);
    // Let the account cart catch up first, or the server would merge the course back in.
    await cartSynced();
    router.refresh();
    setBusy("");
  }

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code || busy) return;
    setBusy("coupon");
    setCouponMessage(null);
    try {
      const { response, value } = await post({
        action: "cart-coupon",
        ids: items.map((item) => item.id),
        locale,
        code,
      });
      if (response.ok && value.applied === true) {
        setCouponInput("");
        setCouponMessage({
          kind: "success",
          text: t("couponApplied", { code: code.toUpperCase() }),
        });
        router.refresh();
      } else {
        const reason =
          value.error === "coupon" && typeof value.reason === "string"
            ? value.reason
            : value.error;
        setCouponMessage({
          kind: "error",
          text: t(
            `couponErrors.${COUPON_REASONS.includes(String(reason)) ? reason : "retry"}`,
          ),
        });
      }
    } catch {
      setCouponMessage({ kind: "error", text: t("couponErrors.retry") });
    } finally {
      setBusy("");
    }
  }

  async function removeCoupon() {
    if (!coupon || busy) return;
    setBusy("coupon");
    setCouponMessage(null);
    try {
      const { response } = await post({
        action: "remove-coupon",
        id: coupon.orderId,
      });
      if (!response.ok) throw new Error("retry");
      router.refresh();
    } catch {
      setCouponMessage({ kind: "error", text: t("couponErrors.retry") });
    } finally {
      setBusy("");
    }
  }

  // Review is step 1: it only ensures a server-priced order exists, then moves to billing and payment.
  async function continueToCheckout() {
    if (orderId) {
      router.push(`/payment?order=${orderId}&step=checkout`);
      return;
    }
    setBusy("continue");
    setMessage("");
    try {
      const { response, value } = await post(
        cart
          ? {
              action: "create-cart-order",
              ids: items.map((item) => item.id),
              locale,
            }
          : { action: "add-to-cart", id: courseId, locale },
      );
      if (cart && response.status === 401) {
        router.push(loginHref);
        return;
      }
      const url =
        response.ok && typeof value.url === "string"
          ? new URL(value.url, window.location.origin)
          : null;
      const created = url?.searchParams.get("order");
      if (
        !url ||
        url.origin !== window.location.origin ||
        !created ||
        !UUID.test(created)
      )
        throw new Error(
          cart && (value.error === "owned" || value.error === "limit")
            ? value.error
            : "error",
        );
      router.push(`/payment?order=${created}&step=checkout`);
    } catch (error) {
      const key = error instanceof Error ? error.message : "error";
      setMessage(cart ? key : "retry");
      setBusy("");
    }
  }

  const steps = [t("stepReview"), t("stepBilling"), t("stepPay")];
  const suggestions = cart?.suggestions ?? [];
  const suggestionCard = suggestions.length > 0 && (
    <section
      className="checkout-pay-card checkout-suggest"
      aria-labelledby="checkout-suggest-title"
    >
      <h2 id="checkout-suggest-title">{tc("suggestTitle")}</h2>
      <p className="checkout-pay-card-intro">{tc("suggestText")}</p>
      <ul className="checkout-suggest-list">
        {suggestions.map((course) => (
          <li key={course.id} className="checkout-suggest-item">
            <Link
              href={courseHref(course.slug)}
              className="checkout-suggest-image"
              tabIndex={-1}
              aria-hidden="true"
            >
              <Image
                src={thumbnail(course.slug)}
                alt=""
                fill
                sizes="(max-width: 700px) 40vw, 200px"
              />
            </Link>
            <div className="checkout-suggest-text">
              <h3 dir="auto">
                <Link href={courseHref(course.slug)}>{course.title}</Link>
              </h3>
              <strong>{formatMoney(course.amountMinor)}</strong>
            </div>
            <AddToCartButton
              courseSlug={course.slug}
              courseTitle={course.title}
              variant="button"
              className="checkout-suggest-add"
              onAdded={() => void cartSynced().then(() => router.refresh())}
            />
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="checkout-cart-page checkout-pay-page checkout-review-page">
      <header className="checkout-pay-header">
        <h1>{t(items.length ? "cartTitle" : "emptyCartTitle")}</h1>
        <p>{t(items.length ? "cartDescription" : "emptyCartDescription")}</p>
        <ol className="checkout-pay-steps" aria-label={t("checkoutSteps")}>
          {steps.map((label, index) => (
            <li
              key={label}
              className={index === 0 ? "is-current" : ""}
              aria-current={index === 0 ? "step" : undefined}
            >
              <b>{format.number(index + 1, { numberingSystem: "latn" })}</b>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      </header>

      {cart && cart.dropped.length > 0 && (
        <p className="checkout-setup-note checkout-cart-dropped" role="status">
          {tc("removedNotice", { count: cart.dropped.length })}
        </p>
      )}

      {items.length ? (
        <div className="checkout-pay-layout">
          <div className="checkout-pay-main">
            <section
              className="checkout-pay-card"
              aria-labelledby="checkout-items-title"
            >
              <div className="checkout-review-head">
                <h2 id="checkout-items-title">{t("cartItems")}</h2>
                <span className="checkout-review-count">
                  <BookOpen aria-hidden="true" />
                  {format.number(items.length, {
                    numberingSystem: "latn",
                  })}{" "}
                  {t("courseCount", { count: items.length })}
                </span>
              </div>
              <ul className="checkout-review-list">
                {items.map((item, index) => (
                  <li className="checkout-review-item" key={item.id}>
                    <div className="checkout-review-thumb">
                      <Image
                        src={thumbnail(item.slug)}
                        alt=""
                        fill
                        priority={index === 0}
                        sizes="(max-width: 700px) 30vw, 160px"
                      />
                    </div>
                    <div className="checkout-review-text">
                      <h3 dir="auto">
                        {item.slug ? (
                          <Link href={courseHref(item.slug)}>{item.title}</Link>
                        ) : (
                          item.title
                        )}
                      </h3>
                      <div className="checkout-order-meta">
                        <span>
                          <BookOpen aria-hidden="true" />
                          {t("courseType")}
                        </span>
                        {item.durationSeconds && item.durationSeconds > 0 ? (
                          <span>
                            <Clock3 aria-hidden="true" />
                            {formatDuration(item.durationSeconds)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <strong className="checkout-review-price">
                      {formatMoney(item.amountMinor)}
                    </strong>
                    {cart && item.slug && (
                      <button
                        type="button"
                        className="checkout-item-remove"
                        data-testid="cart-remove"
                        aria-label={tc("remove", { title: item.title })}
                        title={tc("remove", { title: item.title })}
                        disabled={Boolean(busy)}
                        onClick={() => void remove(item.slug)}
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <Link className="checkout-back-link" href="/courses">
                <ArrowRight className="flip-rtl" aria-hidden="true" />
                {t("continueBrowsing")}
              </Link>
            </section>
            {suggestionCard}
          </div>

          <aside className="checkout-pay-aside">
            <section
              className="checkout-pay-card checkout-order-summary"
              aria-labelledby="checkout-summary-title"
            >
              <div className="checkout-order-summary-head">
                <h2 id="checkout-summary-title">{t("summary")}</h2>
              </div>
              <dl className="checkout-order-rows">
                <div>
                  <dt>{t("numberOfCourses")}</dt>
                  <dd>
                    {format.number(items.length, { numberingSystem: "latn" })}
                  </dd>
                </div>
                <div>
                  <dt>{t("subtotal")}</dt>
                  <dd>{formatMoney(amount)}</dd>
                </div>
                {coupon && discount > 0 && (
                  <div className="is-discount">
                    <dt>
                      <span dir="ltr">
                        {t("discount", { code: coupon.code })}
                      </span>
                      <button
                        type="button"
                        className="checkout-coupon-remove"
                        aria-label={t("removeCoupon", { code: coupon.code })}
                        disabled={Boolean(busy)}
                        onClick={() => void removeCoupon()}
                      >
                        <X aria-hidden="true" />
                      </button>
                    </dt>
                    <dd>−{formatMoney(discount)}</dd>
                  </div>
                )}
              </dl>
              <div className="checkout-order-total">
                <span>{t("total")}</span>
                <strong>{formatMoney(amount - discount)}</strong>
              </div>
              <p className="checkout-order-note">{t("finalAmount")}</p>
              {cart && cart.signedIn && !coupon && (
                <form
                  className="checkout-coupon"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void applyCoupon();
                  }}
                >
                  <label htmlFor="cart-coupon" className="visually-hidden">
                    {t("couponLabel")}
                  </label>
                  <div className="checkout-coupon-input">
                    <Ticket aria-hidden="true" />
                    <input
                      id="cart-coupon"
                      dir="ltr"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={32}
                      placeholder={t("couponPlaceholder")}
                      value={couponInput}
                      aria-describedby={
                        couponMessage ? "cart-coupon-message" : undefined
                      }
                      onChange={(event) => setCouponInput(event.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={Boolean(busy) || !couponInput.trim() || !enabled}
                  >
                    {busy === "coupon" ? t("working") : t("applyCoupon")}
                  </button>
                </form>
              )}
              {cart && !cart.signedIn && (
                <p className="checkout-coupon-guest">
                  <Ticket aria-hidden="true" />
                  {tc("couponGuest")}
                </p>
              )}
              {couponMessage && (
                <p
                  id="cart-coupon-message"
                  className={
                    couponMessage.kind === "error"
                      ? "checkout-error"
                      : "checkout-payment-status status-paid"
                  }
                  role={couponMessage.kind === "error" ? "alert" : "status"}
                >
                  {couponMessage.text}
                </p>
              )}
            </section>

            <CheckoutProtect />

            {status && (
              <p
                className={`checkout-payment-status status-${status}`}
                role="status"
              >
                {t(closed ? (status as "paid" | "refunded") : "pending")}
              </p>
            )}
            {!enabled && (
              <p className="checkout-setup-note" role="status">
                {t("setupPending")}
              </p>
            )}
            {message && (
              <p className="checkout-error" role="status">
                {cart ? tc(message) : t(message)}
              </p>
            )}
            {cart && !cart.signedIn ? (
              <>
                <Link
                  className="checkout-continue-button checkout-pay-button"
                  data-testid="cart-sign-in"
                  href={loginHref}
                >
                  <LogIn aria-hidden="true" />
                  <span>{tc("signInToCheckout")}</span>
                  <ArrowRight className="flip-rtl" aria-hidden="true" />
                </Link>
                <p className="checkout-terms">{tc("signInNote")}</p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="checkout-continue-button checkout-pay-button"
                  data-testid={cart ? "cart-checkout" : undefined}
                  disabled={!enabled || Boolean(busy) || closed}
                  onClick={() => void continueToCheckout()}
                >
                  <Lock aria-hidden="true" />
                  <span>
                    {busy === "continue"
                      ? t("working")
                      : cart
                        ? tc("checkout")
                        : t("continueToBilling")}
                  </span>
                  <ArrowRight className="flip-rtl" aria-hidden="true" />
                </button>
                <p className="checkout-terms">{t("confirmation")}</p>
              </>
            )}
          </aside>
        </div>
      ) : (
        <div className="checkout-review-empty">
          <section className="checkout-pay-card checkout-empty-state">
            <span>
              <ShoppingCart aria-hidden="true" />
            </span>
            <h2>{t("emptyCartTitle")}</h2>
            <p>{t("pickCourse")}</p>
            <Link className="checkout-continue-button" href="/courses">
              {t("catalog")}
              <ArrowRight className="flip-rtl" aria-hidden="true" />
            </Link>
          </section>
          {suggestionCard}
        </div>
      )}
    </div>
  );
}
