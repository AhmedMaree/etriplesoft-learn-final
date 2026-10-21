"use client";

import { useSyncExternalStore } from "react";

export type ToastOptions = {
  tone?: "success" | "error";
  /** An in-app link shown beside the message, such as "View cart". */
  action?: { href: string; label: string };
};
type Toast = ToastOptions & { message: string };

const EMPTY: Toast = { message: "" };
let current: Toast = EMPTY;
let timeout: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getToast() {
  return current;
}

function publish(toast: Toast) {
  current = toast;
  for (const listener of listeners) listener();
}

export function notifyDemoToast(message: string, options: ToastOptions = {}) {
  publish({ message, ...options });
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => publish(EMPTY), 4500);
}

export function useDemoToast() {
  return notifyDemoToast;
}

export function useDemoToastMessage() {
  const toast = useSyncExternalStore(subscribe, getToast, () => EMPTY);
  return { ...toast, dismiss: () => publish(EMPTY) };
}
