"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Thin bar at the top of the viewport that starts the moment an internal link is clicked,
// so a slow server render never looks like a missed click. It finishes when the URL changes.
function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  // The route the click happened on; once the rendered route differs, the navigation has landed.
  const [startedOn, setStartedOn] = useState<string | null>(null);
  const state = startedOn === null ? "idle" : startedOn === routeKey ? "loading" : "done";

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page (or only the hash changes): no navigation will happen.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setStartedOn(`${window.location.pathname}?${window.location.search.slice(1)}`);
    }
    // Capture phase: next/link calls preventDefault() to route client-side, so a bubbling listener can't tell it from a cancelled click.
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (state === "idle") return;
    // Finish shortly after landing; give up after 20s if the navigation was cancelled or redirected back.
    const timer = window.setTimeout(() => setStartedOn(null), state === "done" ? 400 : 20000);
    return () => window.clearTimeout(timer);
  }, [state]);

  if (state === "idle") return null;
  return <div className={`nav-progress nav-progress-${state}`} aria-hidden="true" />;
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBar />
    </Suspense>
  );
}
