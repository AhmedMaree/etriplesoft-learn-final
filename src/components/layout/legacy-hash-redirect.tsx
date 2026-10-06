"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { isDemoRoute } from "@/lib/routes";

export function LegacyHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const legacyPage = window.location.hash.slice(1);
    if (isDemoRoute(legacyPage)) {
      const target = legacyPage === "overview" ? "/" : `/${legacyPage}`;
      router.replace(`${target}${window.location.search}`);
    }
    window.scrollTo(0, 0);
  }, [router]);

  return null;
}
