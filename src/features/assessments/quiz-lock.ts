"use client";
import { useEffect, useSyncExternalStore } from "react";

/**
 * Whether a learner is inside an active assessment attempt, so the app shell can pause
 * sidebar navigation. A UX guard only: the attempt deadline is enforced on the server.
 */
let locked = false;
const listeners = new Set<() => void>();

export function setQuizLock(value: boolean) {
  if (locked === value) return;
  locked = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useQuizLock() {
  return useSyncExternalStore(
    subscribe,
    () => locked,
    () => false,
  );
}

/**
 * While `active`, warn before a reload/close and intercept the browser Back button.
 * Back first lands on a same-URL guard entry (a no-op for the App Router, which copies its
 * own state into entries pushed via history.pushState), then asks before really leaving.
 */
export function useLeaveGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return;
    let leaving = false;
    const guard = () => window.history.pushState({ quizGuard: true }, "", window.location.href);
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onPopState = (event: PopStateEvent) => {
      if (leaving || (event.state as { quizGuard?: boolean } | null)?.quizGuard) return;
      if (window.confirm(message)) {
        leaving = true;
        window.removeEventListener("beforeunload", onBeforeUnload);
        window.history.back();
      } else guard();
    };
    guard();
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, [active, message]);
}
