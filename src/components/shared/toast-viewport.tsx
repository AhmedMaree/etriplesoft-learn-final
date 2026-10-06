"use client";

import { Check, X } from "lucide-react";
import { useDemoToastMessage } from "@/lib/browser/demo-toast";

export function ToastViewport() {
  const { message, dismiss } = useDemoToastMessage();
  if (!message) return null;

  return (
    <div role="status" className="toast">
      <Check size={20} />
      {message}
      <button aria-label="Dismiss" onClick={dismiss}>
        <X size={16} />
      </button>
    </div>
  );
}
