import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";

const SITE_URL = "https://learn.etriplesoft.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private areas already answer noindex; this also keeps crawlers from spending budget on them.
      disallow: ["/api/", ...locales.map((locale) => `/${locale}/admin`)],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
