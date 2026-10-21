"use client";

import { Check, CircleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useDemoToastMessage } from "@/lib/browser/demo-toast";

export function ToastViewport() {
  const t = useTranslations("common");
  const { message, tone, action, dismiss } = useDemoToastMessage();
  if (!message) return null;
  const error = tone === "error";

  return (
    <div
      role={error ? "alert" : "status"}
      className={error ? "toast toast-error" : "toast"}
      key={message}
    >
      <span className="toast-icon" aria-hidden="true">
        {error ? (
          <CircleAlert size={16} strokeWidth={3} />
        ) : (
          <Check size={16} strokeWidth={3} />
        )}
      </span>
      <span className="toast-message">{message}</span>
      {action && (
        <Link className="toast-action" href={action.href} onClick={dismiss}>
          {action.label}
        </Link>
      )}
      <button
        type="button"
        className="toast-close"
        aria-label={t("dismiss")}
        onClick={dismiss}
      >
        <X size={16} />
      </button>
      <span className="toast-progress" aria-hidden="true" />
    </div>
  );
}
