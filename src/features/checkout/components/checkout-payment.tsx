"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import allCoursesArtwork from "../../../../public/assets/all-courses-artwork.png";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  Clock3,
  CreditCard,
  Lock,
  RotateCcw,
  ShieldCheck,
  Ticket,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { courseImage, hasCourseThumbnail } from "@/features/courses/components/course-image";
import {
  DEFAULT_BILLING_COUNTRY,
  dialCode,
  nationalNumber,
  toE164,
} from "../billing-countries";
import type { CheckoutCartItem } from "./checkout";
import { removeFromCart } from "../cart/use-cart";
import { CheckoutProtect } from "./checkout-protect";

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export type CheckoutOrder = {
  id: string;
  status: string;
  /** "cart" orders are edited in the cart; "course" orders came from a single course's Buy now. */
  kind: "cart" | "course";
  /** Pending past its 30-minute window: Kashier no longer accepts it, so checkout must restart. */
  expired: boolean;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  couponCode: string | null;
  billingName: string | null;
  billingCountry: string | null;
  billingPhone: string | null;
};

async function post(body: object) {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const value: unknown = await response.json().catch(() => null);
  return { ok: response.ok, value: value && typeof value === "object" ? (value as Record<string, unknown>) : {} };
}

export function CheckoutPayment({
  order,
  items,
  email,
  defaultName,
  instructor,
  lessonCount,
  enabled,
  returned,
  countryNames,
}: {
  order: CheckoutOrder;
  items: CheckoutCartItem[];
  email: string;
  defaultName: string;
  instructor: string | null;
  lessonCount: number | null;
  enabled: boolean;
  returned: boolean;
  // Built on the server so the ICU data used for names matches between server and client render.
  countryNames: { code: string; label: string }[];
}) {
  const t = useTranslations("realCheckout"),
    tc = useTranslations("cart"),
    locale = useLocale(),
    format = useFormatter(),
    router = useRouter();
  const initialCountry =
    order.billingCountry && dialCode(order.billingCountry) ? order.billingCountry : DEFAULT_BILLING_COUNTRY;
  const [name, setName] = useState(order.billingName ?? defaultName);
  const [country, setCountry] = useState<string>(initialCountry);
  const [phone, setPhone] = useState(nationalNumber(initialCountry, order.billingPhone));
  const [touched, setTouched] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState<"" | "pay" | "coupon" | "check" | "restart">("");
  const [message, setMessage] = useState("");
  const [restartError, setRestartError] = useState<"" | "owned" | "limit" | "error">("");

  const nameValid = name.trim().length >= 2 && name.trim().length <= 120;
  const phoneValid = Boolean(toE164(country, phone));
  const billingComplete = nameValid && phoneValid;
  const paid = order.status === "paid";
  const refunded = order.status === "refunded";
  const expired = order.expired && !paid && !refunded;
  const item = items[0];
  // Instructor and lesson details describe one course; a multi-course order lists each price instead.
  const single = items.length === 1;

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
    if (hours && remainder) return t("durationHoursMinutes", { h: String(hours), m: String(remainder) });
    if (hours) return t("durationHours", { h: String(hours) });
    return t("durationMinutes", { m: String(Math.max(minutes, 1)) });
  };

  // Asks the server to reconcile with Kashier. `report` shows a still-pending or failed result.
  async function check(report = true) {
    setBusy("check");
    setMessage("");
    try {
      const { ok, value } = await post({ action: "check", id: order.id });
      if (!ok || typeof value.status !== "string" || !["pending", "paid", "refunded"].includes(value.status))
        throw new Error("retry");
      if (value.status === "pending") {
        if (report) setMessage("pending");
      } else router.refresh();
      return value.status;
    } catch {
      if (report) setMessage("retry");
      return "error";
    } finally {
      setBusy("");
    }
  }

  // Kashier's return redirect is display-only; ask the server to reconcile with the provider. The
  // payment can take a few seconds to settle at Kashier, so retry briefly before showing "pending".
  useEffect(() => {
    if (!returned || order.status !== "pending" || !enabled) return;
    let cancelled = false;
    void (async () => {
      const waits = [0, 2500, 4000, 6000];
      for (const [index, wait] of waits.entries()) {
        if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
        if (cancelled) return;
        const status = await check(index === waits.length - 1);
        if (status === "paid" || status === "refunded") return;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returned, order.status, enabled]);

  // An expired order cannot be paid; create a fresh server-priced order for the same courses.
  async function restart() {
    if (busy) return;
    setBusy("restart");
    setRestartError("");
    try {
      const { ok, value } = await post(
        order.kind === "cart"
          ? { action: "create-cart-order", ids: items.map((entry) => entry.id), locale }
          : { action: "add-to-cart", id: items[0]?.id, locale },
      );
      const next = ok && typeof value.url === "string" ? new URL(value.url, window.location.origin) : null;
      const created = next?.searchParams.get("order");
      if (!next || next.origin !== window.location.origin || !created || !UUID.test(created) || created === order.id)
        throw new Error(value.error === "owned" || value.error === "limit" ? value.error : "error");
      router.push(`/payment?order=${created}&step=checkout`);
    } catch (error) {
      const key = error instanceof Error ? error.message : "error";
      setRestartError(key === "owned" || key === "limit" ? key : "error");
      setBusy("");
    }
  }

  // Purchased courses leave the cart (browser and account) once the server reports the order paid.
  const purchasedSlugs = items.flatMap((entry) => (entry.slug ? [entry.slug] : [])).join(",");
  useEffect(() => {
    if (paid && purchasedSlugs) removeFromCart(purchasedSlugs.split(","));
  }, [paid, purchasedSlugs]);

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!billingComplete || busy) return;
    setBusy("pay");
    setMessage("");
    try {
      const { ok, value } = await post({
        action: "start-order",
        id: order.id,
        billing: { name: name.trim(), country, phone },
      });
      if (!ok)
        throw new Error(
          value.error === "billing" || value.error === "closed" || value.error === "owned" ? value.error : "retry",
        );
      if (typeof value.url !== "string") throw new Error("retry");
      const url = new URL(value.url);
      if (
        url.origin !== "https://payments.kashier.io" ||
        !/^\/session\/[a-f0-9]{24}$/.test(url.pathname) ||
        !["?mode=test", "?mode=live"].includes(url.search)
      )
        throw new Error("retry");
      window.location.assign(url.href);
    } catch (error) {
      setBusy("");
      // The order expired while this page was open; reload into the "start again" state.
      if (error instanceof Error && error.message === "closed") return router.refresh();
      setMessage(
        error instanceof Error && ["billing", "owned"].includes(error.message) ? error.message : "startRetry",
      );
    }
  }

  async function changeCoupon(action: "apply-coupon" | "remove-coupon") {
    if (busy) return;
    const code = coupon.trim().toUpperCase();
    if (action === "apply-coupon" && !code) return;
    setBusy("coupon");
    setCouponMessage(null);
    try {
      const { ok, value } = await post({ action, id: order.id, ...(action === "apply-coupon" ? { code } : {}) });
      if (ok) {
        setCoupon("");
        if (action === "apply-coupon") setCouponMessage({ kind: "success", text: t("couponApplied", { code }) });
        router.refresh();
      } else {
        const reason =
          value.error === "coupon" && typeof value.reason === "string"
            ? value.reason
            : value.error === "closed"
              ? "closed"
              : "retry";
        const known = ["invalid", "notApplicable", "used", "exhausted", "limit", "locked", "closed", "retry"];
        setCouponMessage({ kind: "error", text: t(`couponErrors.${known.includes(reason) ? reason : "retry"}`) });
      }
    } catch {
      setCouponMessage({ kind: "error", text: t("couponErrors.retry") });
    } finally {
      setBusy("");
    }
  }

  const steps = [
    { label: t("stepReview"), done: true },
    { label: t("stepBilling"), done: (billingComplete && !expired) || paid },
    { label: t("stepPay"), done: paid },
  ];
  const currentStep = paid ? -1 : expired ? 0 : billingComplete ? 2 : 1;
  const showNameError = touched && !nameValid;
  const showPhoneError = touched && !phoneValid;

  return (
    <div className="checkout-cart-page checkout-pay-page">
      <header className="checkout-pay-header">
        <h1>{t("enrollTitle")}</h1>
        <p>{t("enrollDescription")}</p>
        <ol className="checkout-pay-steps" aria-label={t("checkoutSteps")}>
          {steps.map((step, index) => (
            <li
              key={step.label}
              className={`${step.done ? "is-done" : ""} ${index === currentStep ? "is-current" : ""}`}
              aria-current={index === currentStep ? "step" : undefined}
            >
              <b>
                {step.done && index !== currentStep ? (
                  <>
                    <Check aria-hidden="true" />
                    <span className="visually-hidden">{t("stepDone")}</span>
                  </>
                ) : (
                  format.number(index + 1, { numberingSystem: "latn" })
                )}
              </b>
              <span>{step.label}</span>
            </li>
          ))}
        </ol>
      </header>

      <div className="checkout-pay-layout">
        <div className="checkout-pay-main">
          {paid ? (
            <section className="checkout-pay-card checkout-result is-success" role="status">
              <span className="checkout-result-icon">
                <BadgeCheck aria-hidden="true" />
              </span>
              <h2>{t("successTitle")}</h2>
              <p>{t(single ? "successText" : "successTextMany")}</p>
              {single && item?.slug ? (
                <Link className="checkout-continue-button" href={`/courses/${item.slug}`}>
                  {t("startLearning")}
                  <ArrowRight className="flip-rtl" aria-hidden="true" />
                </Link>
              ) : (
                <Link className="checkout-continue-button" href="/courses">
                  {t("courses")}
                  <ArrowRight className="flip-rtl" aria-hidden="true" />
                </Link>
              )}
            </section>
          ) : expired ? (
            <section className="checkout-pay-card checkout-result" aria-labelledby="checkout-expired-title">
              <span className="checkout-result-icon">
                <RotateCcw aria-hidden="true" />
              </span>
              <h2 id="checkout-expired-title">{t("expiredTitle")}</h2>
              <p>{t(order.couponCode ? "expiredTextCoupon" : "expiredText")}</p>
              <button
                type="button"
                className="checkout-continue-button"
                disabled={!enabled || Boolean(busy)}
                onClick={() => void restart()}
              >
                {busy === "restart" ? t("working") : t("restart")}
                <ArrowRight className="flip-rtl" aria-hidden="true" />
              </button>
              {restartError && (
                <p className="checkout-error" role="alert">
                  {tc(restartError)}
                </p>
              )}
            </section>
          ) : returned && order.status === "pending" ? (
            <section className="checkout-pay-card checkout-result" aria-live="polite">
              <span className="checkout-result-icon">
                <ShieldCheck aria-hidden="true" />
              </span>
              <h2>{t("confirmingTitle")}</h2>
              <p>{t("confirmingText")}</p>
              <button
                type="button"
                className="checkout-check-button"
                disabled={!enabled || Boolean(busy)}
                onClick={() => void check()}
              >
                {busy === "check" ? t("working") : t("check")}
              </button>
            </section>
          ) : null}

          {!paid && !expired && (
            <form id="checkout-billing" className="checkout-pay-card" noValidate onSubmit={(event) => void pay(event)}>
              <h2>
                <span>{format.number(1, { numberingSystem: "latn" })}.</span> {t("billingTitle")}
              </h2>
              <p className="checkout-pay-card-intro">{t("billingDescription")}</p>
              <div className="checkout-field-grid">
                <div className="checkout-field">
                  <label htmlFor="billing-name">
                    {t("fullName")} <abbr title={t("required")}>*</abbr>
                  </label>
                  <input
                    id="billing-name"
                    name="name"
                    autoComplete="name"
                    dir="auto"
                    required
                    maxLength={120}
                    value={name}
                    aria-invalid={showNameError}
                    aria-describedby={showNameError ? "billing-name-error" : undefined}
                    onChange={(event) => setName(event.target.value)}
                  />
                  {showNameError && (
                    <p id="billing-name-error" className="checkout-field-error">
                      {t("nameError")}
                    </p>
                  )}
                </div>
                <div className="checkout-field">
                  <label htmlFor="billing-email">
                    {t("email")} <abbr title={t("required")}>*</abbr>
                  </label>
                  <input
                    id="billing-email"
                    type="email"
                    dir="ltr"
                    value={email}
                    readOnly
                    aria-describedby="billing-email-hint"
                  />
                  <p id="billing-email-hint" className="checkout-field-hint">
                    {t("emailHint")}
                  </p>
                </div>
                <div className="checkout-field">
                  <label htmlFor="billing-country">
                    {t("country")} <abbr title={t("required")}>*</abbr>
                  </label>
                  <select
                    id="billing-country"
                    name="country"
                    autoComplete="country"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                  >
                    {countryNames.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="checkout-field">
                  <label htmlFor="billing-phone">
                    {t("phone")} <abbr title={t("required")}>*</abbr>
                  </label>
                  <div className="checkout-phone" dir="ltr">
                    <span className="checkout-phone-code">
                      <span className="visually-hidden">{t("dialCode")} </span>+{dialCode(country)}
                    </span>
                    <input
                      id="billing-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      required
                      maxLength={20}
                      value={phone}
                      aria-invalid={showPhoneError}
                      aria-describedby={showPhoneError ? "billing-phone-error" : undefined}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                  {showPhoneError && (
                    <p id="billing-phone-error" className="checkout-field-error">
                      {t("phoneError")}
                    </p>
                  )}
                </div>
              </div>
            </form>
          )}

          {!paid && !expired && (
            <section className="checkout-pay-card" aria-labelledby="checkout-payment-title">
              <h2 id="checkout-payment-title">
                <span>{format.number(2, { numberingSystem: "latn" })}.</span> {t("paymentTitle")}
              </h2>
              <p className="checkout-pay-card-intro">{t("paymentDescription")}</p>
              <fieldset className="checkout-method">
                <legend className="visually-hidden">{t("paymentMethod")}</legend>
                <label className="checkout-method-option">
                  <input type="radio" name="method" value="kashier" defaultChecked />
                  <span className="checkout-method-radio" aria-hidden="true" />
                  <span className="checkout-method-text">
                    <strong>{t("kashierTitle")}</strong>
                    <span>{t("kashierTagline")}</span>
                  </span>
                  <span className="checkout-method-brand" aria-hidden="true">
                    <CreditCard />
                    Kashier
                  </span>
                </label>
                <ul className="checkout-method-features">
                  <li>
                    <span className="checkout-feature-icon">
                      <Lock aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{t("featureSecureTitle")}</strong>
                      {t("featureSecureText")}
                    </span>
                  </li>
                  <li>
                    <span className="checkout-feature-icon">
                      <Zap aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{t("featureInstantTitle")}</strong>
                      {t("featureInstantText")}
                    </span>
                  </li>
                  <li>
                    <span className="checkout-feature-icon">
                      <Wallet aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{t("featureMethodsTitle")}</strong>
                      {t("featureMethodsText")}
                    </span>
                  </li>
                </ul>
                <p className="checkout-hosted-note">
                  <ShieldCheck aria-hidden="true" />
                  {t("hostedNote")}
                </p>
              </fieldset>
            </section>
          )}
        </div>

        <aside className="checkout-pay-aside">
          <section className="checkout-pay-card checkout-order-summary" aria-labelledby="checkout-summary-title">
            <div className="checkout-order-summary-head">
              <h2 id="checkout-summary-title">{t("summary")}</h2>
              {!paid && !refunded && (
                <Link href={order.kind === "cart" ? "/cart" : `/payment?order=${order.id}`} aria-label={t("editOrder")}>
                  {t("edit")}
                </Link>
              )}
            </div>
            {items.map((entry, index) => (
              <div className="checkout-order-item" key={entry.id}>
                <div className="checkout-order-thumb">
                  <Image
                    src={entry.slug && hasCourseThumbnail(entry.slug) ? courseImage(entry.slug) : allCoursesArtwork}
                    alt=""
                    fill
                    priority={index === 0}
                    sizes="110px"
                  />
                </div>
                <div className="checkout-order-item-text">
                  <h3 dir="auto">{entry.title}</h3>
                  {single && instructor && <p dir="auto">{t("byInstructor", { name: instructor })}</p>}
                  <div className="checkout-order-meta">
                    {entry.durationSeconds && entry.durationSeconds > 0 ? (
                      <span>
                        <Clock3 aria-hidden="true" />
                        {formatDuration(entry.durationSeconds)}
                      </span>
                    ) : null}
                    {!single && <strong className="checkout-order-item-price">{formatMoney(entry.amountMinor)}</strong>}
                    {single && lessonCount ? (
                      <span>
                        <BookOpen aria-hidden="true" />
                        {t("lessons", { count: lessonCount })}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            <dl className="checkout-order-rows">
              {single ? (
                <div>
                  <dt>{t("coursePrice")}</dt>
                  <dd>{formatMoney(order.subtotalMinor)}</dd>
                </div>
              ) : (
                <div>
                  <dt>{t("numberOfCourses")}</dt>
                  <dd>{format.number(items.length, { numberingSystem: "latn" })}</dd>
                </div>
              )}
              <div>
                <dt>{t("subtotal")}</dt>
                <dd>{formatMoney(order.subtotalMinor)}</dd>
              </div>
              {order.couponCode && order.discountMinor > 0 && (
                <div className="is-discount">
                  <dt>
                    <span dir="ltr">{t("discount", { code: order.couponCode })}</span>
                    {!paid && !refunded && !expired && (
                      <button
                        type="button"
                        className="checkout-coupon-remove"
                        aria-label={t("removeCoupon", { code: order.couponCode })}
                        disabled={Boolean(busy)}
                        onClick={() => void changeCoupon("remove-coupon")}
                      >
                        <X aria-hidden="true" />
                      </button>
                    )}
                  </dt>
                  <dd>−{formatMoney(order.discountMinor)}</dd>
                </div>
              )}
            </dl>
            <div className="checkout-order-total">
              <span>{t("total")}</span>
              <strong>{formatMoney(order.totalMinor)}</strong>
            </div>
            <p className="checkout-order-note">{t("finalAmount")}</p>
            {/* One coupon per order: once applied (here or in the cart), remove it to enter another. */}
            {!paid && !refunded && !expired && !order.couponCode && (
              <form
                className="checkout-coupon"
                onSubmit={(event) => {
                  event.preventDefault();
                  void changeCoupon("apply-coupon");
                }}
              >
                <label htmlFor="checkout-coupon" className="visually-hidden">
                  {t("couponLabel")}
                </label>
                <div className="checkout-coupon-input">
                  <Ticket aria-hidden="true" />
                  <input
                    id="checkout-coupon"
                    dir="ltr"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={32}
                    placeholder={t("couponPlaceholder")}
                    value={coupon}
                    aria-describedby={couponMessage ? "checkout-coupon-message" : undefined}
                    onChange={(event) => setCoupon(event.target.value)}
                  />
                </div>
                <button type="submit" disabled={Boolean(busy) || !coupon.trim()}>
                  {busy === "coupon" ? t("working") : t("applyCoupon")}
                </button>
              </form>
            )}
            {couponMessage && (
              <p
                id="checkout-coupon-message"
                className={couponMessage.kind === "error" ? "checkout-error" : "checkout-payment-status status-paid"}
                role={couponMessage.kind === "error" ? "alert" : "status"}
              >
                {couponMessage.text}
              </p>
            )}
          </section>

          <CheckoutProtect />

          {refunded && (
            <p className="checkout-payment-status status-refunded" role="status">
              {t("refunded")}
            </p>
          )}
          {!enabled && !paid && (
            <p className="checkout-setup-note" role="status">
              {t("setupPending")}
            </p>
          )}
          {message && (
            <p className={message === "pending" ? "checkout-payment-status" : "checkout-error"} role="status">
              {t(message)}
            </p>
          )}
          {!paid && !expired && (
            <>
              <button
                type="submit"
                form="checkout-billing"
                className="checkout-continue-button checkout-pay-button"
                disabled={!enabled || Boolean(busy) || refunded}
              >
                <Lock aria-hidden="true" />
                <span>{busy === "pay" ? t("redirecting") : t("payWithKashier")}</span>
                <ArrowRight className="flip-rtl" aria-hidden="true" />
              </button>
              <p className="checkout-terms">
                {t.rich("agree", {
                  terms: (chunks) => <Link href="/terms">{chunks}</Link>,
                  privacy: (chunks) => <Link href="/privacy">{chunks}</Link>,
                })}
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
