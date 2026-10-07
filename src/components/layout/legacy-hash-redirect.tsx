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
      const query = new URLSearchParams(window.location.search);
      query.delete("next");
      const search = query.size > 0 ? `?${query.toString()}` : "";
      router.replace(`${target}${search}`);
    }
    window.scrollTo(0, 0);
  }, [router]);

  return null;
}
