import { ASSET_BASE } from "@/lib/assets";

const IMAGES = [
  "course-0.webp",
  "course-1.webp",
  "course-2.webp",
  "course-3.webp",
  "course-4.webp",
  "course-5.webp",
];
const KNOWN_SLUGS = [
  "crash-course-odoo-erp",
  "python-fundamentals",
  "odoo-development",
  "odoo-implementation",
  "odoo-user-guide",
  "odoo-system-admin",
];

/** User-supplied course artwork; takes precedence over the demo thumbnails. */
const ARTWORK: Record<string, string> = {
  "crash-course-odoo-erp": "odoo-erp.webp",
  "python-fundamentals": "python.webp",
  "odoo-development": "odoo-developement.webp",
  "odoo-system-admin": "odoo-system-admin.webp",
};

export function hasCourseThumbnail(slug: string) {
  return KNOWN_SLUGS.includes(slug);
}

/** Approved demo thumbnails; unknown slugs get a stable choice. */
export function courseImage(slug: string) {
  if (ARTWORK[slug]) return ASSET_BASE + ARTWORK[slug];
  const known = KNOWN_SLUGS.indexOf(slug);
  if (known >= 0) return ASSET_BASE + IMAGES[known];
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ASSET_BASE + IMAGES[hash % IMAGES.length];
}
