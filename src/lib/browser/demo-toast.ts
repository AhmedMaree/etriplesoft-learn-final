"use client";

import { useSyncExternalStore } from "react";

let currentMessage = "";
let timeout: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getMessage() {
  return currentMessage;
}

function publish(message: string) {
  currentMessage = message;
  for (const listener of listeners) listener();
}

export function notifyDemoToast(message: string) {
  publish(message);
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => publish(""), 4500);
}

export function useDemoToast() {
  return notifyDemoToast;
}

export function useDemoToastMessage() {
  const message = useSyncExternalStore(subscribe, getMessage, () => "");
  return { message, dismiss: () => publish("") };
}
