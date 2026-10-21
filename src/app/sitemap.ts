import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { getPathname } from "@/i18n/navigation";
import { getAllCourses } from "@/features/marketing/server/course-repository";

const SITE_URL = "https://learn.etriplesoft.com";

// Public marketing pages; signed-in learner and admin pages stay out of the index.
const PAGES = ["/", "/catalog", "/learning-paths", "/odoo-modules", "/about", "/help", "/contact", "/privacy", "/terms", "/refund-policy"];

// Every locale's URL is listed, each naming its translations.
function entries(href: string): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((locale) => [locale, new URL(getPathname({ locale, href }), SITE_URL).href]));
  const alternates = { languages: { ...languages, "x-default": languages.en } };
  return locales.map((locale) => ({ url: languages[locale], alternates }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const courses = getAllCourses().map((course) => `/catalog/${course.slug}`);
  return [...PAGES, ...courses].flatMap(entries);
}
