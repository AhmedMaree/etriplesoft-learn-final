"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { BookOpen, CalendarDays, ArrowRight, Clock, Bookmark, Check, User, Lock, CreditCard, ShieldCheck, Zap, Info } from 'lucide-react';
import { Button, Panel, Title, IconBox } from '@/components/ui/primitives';
import { Field } from '@/components/ui/field';
import { useDemoToast } from '@/lib/browser/demo-toast';
import { useDemoNavigation } from '@/hooks/use-demo-navigation';
import { ASSET_BASE } from '@/lib/assets';
import { featuredCourse } from '@/features/courses/data/demo-courses';
import { useTranslations, useFormatter } from 'next-intl';

export function Payment() {
  const t = useTranslations("checkout");
  const format = useFormatter();
  const usd = (amount: number) => format.number(amount, {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
    maximumFractionDigits: 2, numberingSystem: "latn",
  });
  const navigate = useDemoNavigation();
  const notify = useDemoToast();

  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(false);
  function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    notify(t("demoComplete"));
    navigate("detail-course");
  }
  return (
    <form className="columns payment-columns" onSubmit={pay}>
      <div className="primary">
        <div className="checkout-steps">
          {["Review Order", "Billing Details", "Payment"].map((s, i) => (
            <React.Fragment key={s}>
              <span>
                <b>{i < 2 ? <Check /> : 3}</b>
                {s}
              </span>
              {i < 2 && <i />}
            </React.Fragment>
          ))}
        </div>
        <Panel>
          <h2>1. {t("billingInfo")}</h2>
          <p>{t("enterDetails")}</p>
          <div className="form-grid">
            <Field label={t("fullName")} value="Ahmed Raza" required />
            <Field
              label={t("email")}
              type="email"
              value="ahmed.raza@example.com"
              required
            />
            <Field
              label={t("country")}
              value="United States"
              options={[
                "United States",
                "Egypt",
                "Pakistan",
                "United Kingdom",
                "United Arab Emirates",
              ]}
              required
            />
            <Field
              label={t("phone")}
              type="tel"
              value="+1 (555) 123-4567"
              required
            />
          </div>
        </Panel>
        <Panel>
          <h2>2. {t("payment")}</h2>
          <p>{t("completeSecure")}</p>
          <div className="payment-box">
            <div className="payment-provider">
              <span className="radio-dot" />
              <div>
                <h3>{t("payWithKashier")}</h3>
                <small>Secure. Reliable. Trusted in the Middle East.</small>
              </div>
              <strong>
                <CreditCard /> Kashier
              </strong>
            </div>
            <div className="payment-benefits">
              {[Lock, Zap, ShieldCheck].map((I, i) => (
                <div key={i}>
                  <IconBox icon={I} color="green" />
                  <span>
                    <b>
                      {
                        [
                          "Secure Payment",
                          "Instant Confirmation",
                          "Trusted by Learners",
                        ][i]
                      }
                    </b>
                    <small>
                      {
                        [
                          "Your data is encrypted and protected.",
                          "Get immediate access after successful payment.",
                          "A reliable payment partner across the region.",
                        ][i]
                      }
                    </small>
                  </span>
                </div>
              ))}
            </div>
            <Field
              label={t("cardNumber")}
              icon={CreditCard}
              placeholder="1234 5678 9012 3456"
            />
            <div className="form-grid">
              <Field
                label={t("expiry")}
                icon={CalendarDays}
                placeholder="MM / YY"
              />
              <Field label="CVV" icon={Lock} placeholder="123" />
            </div>
            <Field
              label={t("cardholder")}
              icon={User}
              placeholder={t("nameOnCard")}
            />
            <small>
              {t("cardAccuracy")}
            </small>
          </div>
        </Panel>
      </div>
      <aside className="right-rail">
        <Panel className="order-summary">
          <Title link={t("edit")} onClick={() => navigate("courses")}>
            {t("orderSummary")}
          </Title>
          <div className="order-course">
            <Image
              src={ASSET_BASE + featuredCourse.image}
              alt={featuredCourse.name}
              width={480}
              height={280}
            />
            <div>
              <h3>{featuredCourse.name}</h3>
              <p>By {featuredCourse.teacher}</p>
              <span>
                <Clock size={18} />
                {featuredCourse.time}{"\u3000"}
                <BookOpen size={18} />
                {featuredCourse.lessons} {t("lessons")}
              </span>
            </div>
          </div>
          <dl>
            <div>
              <dt>{t("coursePrice")}</dt>
              <dd>{usd(79)}</dd>
            </div>
            <div>
              <dt>{t("subtotal")}</dt>
              <dd>{usd(discount ? 71.1 : 79)}</dd>
            </div>
            <div>
              <dt>
                {t("tax")} (VAT 10%)　
                <Info size={16} />
              </dt>
              <dd>{usd(discount ? 7.11 : 7.9)}</dd>
            </div>
          </dl>
          <div className="total">
            <h2>{t("total")}</h2>
            <h2>{usd(discount ? 78.21 : 86.9)}</h2>
          </div>
          <div className="coupon">
            <div className="input-wrap">
              <Bookmark size={20} />
              <input
                aria-label={t("couponCode")}
                placeholder={t("enterCoupon")}
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (coupon.toUpperCase() === "LEARN10") {
                  setDiscount(true);
                  notify(t("discountApplied"));
                } else
                  notify(t("invalidCoupon"));
              }}
            >
              Apply
            </button>
          </div>
        </Panel>
        <Panel className="purchase-protection">
          <h3>
            <ShieldCheck size={38} />
            Your Purchase is Protected
          </h3>
          {[
            "30-Day Money-Back Guarantee",
            "Instant Access",
            "Secure & Encrypted",
          ].map((s, i) => (
            <div key={s}>
              <IconBox icon={Check} color="green" />
              <div>
                <b>{s}</b>
                <p>
                  {
                    [
                      "Not satisfied? Get a full refund within 30 days.",
                      "Start learning immediately after payment.",
                      "Your payment information is always protected with Kashier.",
                    ][i]
                  }
                </p>
              </div>
            </div>
          ))}
        </Panel>
        <Button type="submit" className="pay-button">
          <Lock />
          Pay with Kashier <ArrowRight />
        </Button>
        <p className="terms">
          By completing this purchase, you agree to our
          <br />
          <button
            type="button"
            onClick={() =>
              notify("Terms of Service are not configured for this local demo.")
            }
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button
            type="button"
            onClick={() =>
              notify("Privacy Policy is not configured for this local demo.")
            }
          >
            Privacy Policy
          </button>
        </p>
      </aside>
    </form>
  );
}
