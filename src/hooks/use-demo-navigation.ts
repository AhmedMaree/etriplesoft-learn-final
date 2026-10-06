"use client";

import { useRouter } from "@/i18n/navigation";
import type { DemoRoute } from "@/lib/routes";

export function useDemoNavigation() {
  const router = useRouter();
  return (route: DemoRoute) => router.push(route === "overview" ? "/" : `/${route}`);
}
