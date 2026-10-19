"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { grantCourseAccessAction } from "../server/admin-enrollment-actions";
import type { AdminActionState } from "@/features/admin/action-state";

export function AdminAccessForm({ slugs }: { slugs: string[] }) {
  const t = useTranslations("courseAccess");
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    grantCourseAccessAction,
    {},
  );
  return (
    <form action={action} className="admin-form-grid">
      <label className="admin-field admin-span-2" htmlFor="access-email">
        <span>{t("email")}</span>
        <input
          id="access-email"
          name="email"
          type="email"
          dir="ltr"
          required
          autoComplete="off"
          maxLength={320}
        />
      </label>
      <label className="admin-field" htmlFor="access-course">
        <span>{t("course")}</span>
        <select id="access-course" name="slug" required dir="ltr">
          {slugs.map((slug) => (
            <option key={slug} value={slug}>
              {slug}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-field" htmlFor="access-reason">
        <span>{t("reason")}</span>
        <select id="access-reason" name="reason" required>
          {["development_test", "complimentary", "support"].map((reason) => (
            <option key={reason} value={reason}>
              {t(`reasons.${reason}`)}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-form-actions">
        <button className="btn" type="submit" disabled={pending || !slugs.length}>
          {pending ? t("saving") : t("grant")}
        </button>
        {state.error && <p className="admin-status error" role="alert">{t(`errors.${state.error}`)}</p>}
        {state.success && <p className="admin-status success" role="status">{t("success")}</p>}
      </div>
    </form>
  );
}
