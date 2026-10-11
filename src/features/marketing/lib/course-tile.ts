import type { Locale } from "@/i18n/config";
import type { Course, RoleSlug } from "../model/course";
import { formatMessage, type MarketingMessages } from "./messages";

export type BadgeKind = "best-seller" | "new" | "coming-soon";

/** Pre-formatted, serializable course summary so client carousels never receive full course records. */
export type CourseTileData = {
  slug: string;
  title: string;
  image: string;
  roles: RoleSlug[];
  levelLabel: string;
  badge: { kind: BadgeKind; label: string } | null;
  tag: string;
  moduleTags: string[];
  hoursLabel: string;
  modulesLabel: string;
  instructorName: string;
  instructorInitials: string;
  ariaLabel: string;
};

export function toCourseTile(course: Course, locale: Locale, m: MarketingMessages): CourseTileData {
  const copy = m.home.courses;
  let badge: CourseTileData["badge"] = null;
  if (course.status === "coming-soon") badge = { kind: "coming-soon", label: m.badges.comingSoon };
  else if (course.badge === "Best Seller") badge = { kind: "best-seller", label: m.badges["Best Seller"] };
  else if (course.badge === "New") badge = { kind: "new", label: m.badges.New };

  const moduleCount = course.curriculum.length;

  return {
    slug: course.slug,
    title: course.title,
    image: course.image,
    roles: course.roles,
    levelLabel: m.levels[course.level],
    badge,
    tag: course.moduleTags[0] ?? "General",
    moduleTags: course.moduleTags.slice(0, 3),
    hoursLabel: formatMessage(locale, copy.hours, { hours: String(Math.round(course.durationHours)) }),
    modulesLabel: formatMessage(locale, copy.modules, { n: moduleCount, count: String(moduleCount) }),
    instructorName: course.instructor?.name ?? copy.defaultInstructor,
    instructorInitials: course.instructor?.initials ?? "ET",
    ariaLabel: formatMessage(locale, copy.viewNamed, { title: course.title }),
  };
}
