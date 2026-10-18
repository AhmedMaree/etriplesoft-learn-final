import { ASSET_BASE } from "@/lib/assets";

const IMAGES = [
  "course-0.svg",
  "course-1.svg",
  "course-2.svg",
  "course-3.svg",
  "course-4.svg",
  "course-5.svg",
];
const KNOWN_SLUGS = [
  "crash-course-odoo-erp",
  "python-fundamentals",
  "odoo-development",
  "odoo-implementation",
  "odoo-user-guide",
  "odoo-system-admin",
];

export function hasCourseThumbnail(slug: string) {
  return KNOWN_SLUGS.includes(slug);
}

/** Approved demo thumbnails; unknown slugs get a stable choice. */
export function courseImage(slug: string) {
  const known = KNOWN_SLUGS.indexOf(slug);
  if (known >= 0) return ASSET_BASE + IMAGES[known];
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ASSET_BASE + IMAGES[hash % IMAGES.length];
}
