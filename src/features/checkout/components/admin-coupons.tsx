"use client";
import { useActionState, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { AdminActionState } from "@/features/admin/action-state";
import { createCouponAction, setCouponActiveAction } from "../server/coupon-actions";

export type AdminCoupon = {
  id: string;
  code: string;
  percentOff: number | null;
  amountOffMinor: number | null;
  courseSlug: string | null;
  maxRedemptions: number | null;
  redemptions: number;
  expiresAt: string | null;
  isActive: boolean;
};

export function CouponCreateForm({ slugs }: { slugs: string[] }) {
  const t = useTranslations("coupons");
  const [kind, setKind] = useState("percent");
  const [state, action, pending] = useActionState<AdminActionState, FormData>(createCouponAction, {});
  return (
    <form action={action} className="admin-form-grid">
      <label className="admin-field" htmlFor="coupon-code">
        <span>{t("code")}</span>
        <input
          id="coupon-code"
          name="code"
          dir="ltr"
          required
          autoComplete="off"
          spellCheck={false}
          maxLength={32}
          pattern="[A-Za-z0-9][A-Za-z0-9_\-]{2,31}"
          aria-describedby="coupon-code-hint"
          className="admin-code-input"
        />
        <small id="coupon-code-hint" className="admin-field-hint">{t("codeHint")}</small>
      </label>
      <label className="admin-field" htmlFor="coupon-kind">
        <span>{t("kind")}</span>
        <select id="coupon-kind" name="kind" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="percent">{t("percent")}</option>
          <option value="amount">{t("amount")}</option>
        </select>
      </label>
      <label className="admin-field" htmlFor="coupon-value">
        <span>{t("value")}</span>
        <input
          id="coupon-value"
          name="value"
          type="number"
          dir="ltr"
          required
          min={kind === "percent" ? 1 : 0.01}
          max={kind === "percent" ? 99 : 9999999}
          step={kind === "percent" ? 1 : 0.01}
        />
      </label>
      <label className="admin-field" htmlFor="coupon-course">
        <span>{t("course")}</span>
        <select id="coupon-course" name="course" defaultValue="">
          <option value="">{t("anyCourse")}</option>
          {slugs.map((slug) => (
            <option key={slug} value={slug}>
              {slug}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-field" htmlFor="coupon-limit">
        <span>{t("maxRedemptions")}</span>
        <input id="coupon-limit" name="max_redemptions" type="number" dir="ltr" min={1} max={100000} step={1} placeholder={t("unlimited")} />
      </label>
      <label className="admin-field" htmlFor="coupon-expires">
        <span>{t("expiresAt")}</span>
        <input id="coupon-expires" name="expires_at" type="date" dir="ltr" />
      </label>
      <div className="admin-form-actions">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? t("saving") : t("create")}
        </button>
        {state.error && <p className="admin-status error" role="alert">{t(`errors.${state.error}`)}</p>}
        {state.success && <p className="admin-status success" role="status">{t(`success.${state.success}`)}</p>}
      </div>
    </form>
  );
}

function ToggleCoupon({ coupon }: { coupon: AdminCoupon }) {
  const t = useTranslations("coupons");
  const [state, action, pending] = useActionState<AdminActionState, FormData>(setCouponActiveAction, {});
  return (
    <form action={action} className="admin-inline-form">
      <input type="hidden" name="id" value={coupon.id} />
      <input type="hidden" name="active" value={String(!coupon.isActive)} />
      <button
        className={`btn outline admin-btn-sm ${coupon.isActive ? "admin-danger" : ""}`}
        type="submit"
        disabled={pending}
        aria-label={`${coupon.isActive ? t("deactivate") : t("activate")}: ${coupon.code}`}
      >
        {coupon.isActive ? t("deactivate") : t("activate")}
      </button>
      {state.error && <p className="admin-status error" role="alert">{t(`errors.${state.error}`)}</p>}
    </form>
  );
}

export function CouponTable({ coupons }: { coupons: AdminCoupon[] }) {
  const t = useTranslations("coupons");
  const format = useFormatter();
  if (!coupons.length) return <p className="admin-empty">{t("empty")}</p>;
  return (
    <div className="admin-table-wrap" tabIndex={0} role="region" aria-label={t("listTitle")}>
      <table className="admin-table">
        <thead>
          <tr>
            <th scope="col">{t("code")}</th>
            <th scope="col">{t("value")}</th>
            <th scope="col">{t("course")}</th>
            <th scope="col">{t("redemptions")}</th>
            <th scope="col">{t("expiresAt")}</th>
            <th scope="col">{t("status")}</th>
            <th scope="col">
              <span className="admin-visually-hidden">{t("actions")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((coupon) => (
            <tr key={coupon.id}>
              <td dir="ltr"><code className="admin-code">{coupon.code}</code></td>
              <td dir="ltr">
                {coupon.percentOff !== null
                  ? `${coupon.percentOff}%`
                  : format.number((coupon.amountOffMinor ?? 0) / 100, {
                      style: "currency",
                      currency: "EGP",
                      numberingSystem: "latn",
                    })}
              </td>
              <td dir="ltr">{coupon.courseSlug ?? t("anyCourse")}</td>
              <td>
                {format.number(coupon.redemptions, { numberingSystem: "latn" })}
                {" / "}
                {coupon.maxRedemptions !== null
                  ? format.number(coupon.maxRedemptions, { numberingSystem: "latn" })
                  : t("unlimited")}
              </td>
              <td>
                {coupon.expiresAt
                  ? format.dateTime(new Date(coupon.expiresAt), { dateStyle: "medium", numberingSystem: "latn" })
                  : t("never")}
              </td>
              <td>
                <span className={`admin-badge ${coupon.isActive ? "active" : "revoked"}`}>
                  {coupon.isActive ? t("active") : t("inactive")}
                </span>
              </td>
              <td>
                <ToggleCoupon coupon={coupon} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
