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
    <form action={action} className="panel video-upload-form">
      <h2>{t("create")}</h2>
      <label htmlFor="coupon-code">{t("code")}</label>
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
        style={{ textTransform: "uppercase" }}
      />
      <small id="coupon-code-hint">{t("codeHint")}</small>
      <label htmlFor="coupon-kind">{t("kind")}</label>
      <select id="coupon-kind" name="kind" value={kind} onChange={(event) => setKind(event.target.value)}>
        <option value="percent">{t("percent")}</option>
        <option value="amount">{t("amount")}</option>
      </select>
      <label htmlFor="coupon-value">{t("value")}</label>
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
      <label htmlFor="coupon-course">{t("course")}</label>
      <select id="coupon-course" name="course" defaultValue="">
        <option value="">{t("anyCourse")}</option>
        {slugs.map((slug) => (
          <option key={slug} value={slug}>
            {slug}
          </option>
        ))}
      </select>
      <label htmlFor="coupon-limit">{t("maxRedemptions")}</label>
      <input id="coupon-limit" name="max_redemptions" type="number" dir="ltr" min={1} max={100000} step={1} placeholder={t("unlimited")} />
      <label htmlFor="coupon-expires">{t("expiresAt")}</label>
      <input id="coupon-expires" name="expires_at" type="date" dir="ltr" />
      <button className="btn" type="submit" disabled={pending}>
        {pending ? t("saving") : t("create")}
      </button>
      {state.error && <p role="alert">{t(`errors.${state.error}`)}</p>}
      {state.success && <p role="status">{t(`success.${state.success}`)}</p>}
    </form>
  );
}

function ToggleCoupon({ coupon }: { coupon: AdminCoupon }) {
  const t = useTranslations("coupons");
  const [state, action, pending] = useActionState<AdminActionState, FormData>(setCouponActiveAction, {});
  return (
    <form action={action}>
      <input type="hidden" name="id" value={coupon.id} />
      <input type="hidden" name="active" value={String(!coupon.isActive)} />
      <button className="btn outline" type="submit" disabled={pending}>
        {coupon.isActive ? t("deactivate") : t("activate")}
      </button>
      {state.error && <p role="alert">{t(`errors.${state.error}`)}</p>}
    </form>
  );
}

export function CouponTable({ coupons }: { coupons: AdminCoupon[] }) {
  const t = useTranslations("coupons");
  const format = useFormatter();
  if (!coupons.length) return <p>{t("empty")}</p>;
  return (
    <div className="admin-table-wrap">
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
              <span className="visually-hidden">{t("status")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((coupon) => (
            <tr key={coupon.id}>
              <td dir="ltr">{coupon.code}</td>
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
              <td>{coupon.isActive ? t("active") : t("inactive")}</td>
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
