"use client";

import { useSyncExternalStore } from "react";

export type DemoStorageKey =
  | "assessment-answers"
  | "learner-name"
  | "preferences"
  | "profile-bio"
  | "profile-data"
  | "profile-photo";

const STORAGE_EVENT = "demo:storage";

export function saveStored(key: DemoStorageKey, value: string) {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function useStoredValue(key: DemoStorageKey, fallback: string) {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener(STORAGE_EVENT, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(STORAGE_EVENT, onChange);
      };
    },
    () => window.localStorage.getItem(key) ?? fallback,
    () => fallback,
  );
}
