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
    <form action={action} className="panel video-upload-form">
      <label htmlFor="access-email">{t("email")}</label>
      <input
        id="access-email"
        name="email"
        type="email"
        dir="ltr"
        required
        autoComplete="off"
        maxLength={320}
      />
      <label htmlFor="access-course">{t("course")}</label>
      <select id="access-course" name="slug" required>
        {slugs.map((slug) => (
          <option key={slug} value={slug}>
            {slug}
          </option>
        ))}
      </select>
      <label htmlFor="access-reason">{t("reason")}</label>
      <select id="access-reason" name="reason" required>
        {["development_test", "complimentary", "support"].map((reason) => (
          <option key={reason} value={reason}>
            {t(`reasons.${reason}`)}
          </option>
        ))}
      </select>
      <button className="btn" type="submit" disabled={pending || !slugs.length}>
        {pending ? t("saving") : t("grant")}
      </button>
      {state.error && <p role="alert">{t(`errors.${state.error}`)}</p>}
      {state.success && <p role="status">{t("success")}</p>}
    </form>
  );
}
