import type { Course, CourseLevel, RoleSlug } from "../model/course";
import { toCourseTile, type CourseTileData } from "./course-tile";
import type { Locale } from "@/i18n/config";
import type { MarketingMessages } from "./messages";

const levelRank: Record<CourseLevel, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };

export type CatalogCourse = CourseTileData & {
  tagline: string;
  track: string;
  levelText: string;
  durationLabel: string;
  durationHours: number;
  levelRank: number;
  certificate: boolean;
  comingSoon: boolean;
  searchText: string;
};

/** Serializable catalog records; the search haystack is built server-side so the client stays small. */
export function toCatalogCourse(course: Course, locale: Locale, m: MarketingMessages): CatalogCourse {
  const roleNames = course.roles.map((role: RoleSlug) => m.roles[role]);
  return {
    ...toCourseTile(course, locale, m),
    tagline: course.tagline,
    track: course.track,
    levelText: course.levelLabel ?? m.levels[course.level],
    durationLabel: course.durationLabel,
    durationHours: course.durationHours,
    levelRank: levelRank[course.level],
    certificate: course.certificate,
    comingSoon: course.status === "coming-soon",
    searchText: [
      course.title,
      course.tagline,
      course.track,
      course.level,
      course.levelLabel ?? "",
      ...course.moduleTags,
      ...course.roles,
      ...roleNames,
      ...course.description,
      ...course.learningOutcomes,
    ]
      .join(" ")
      .toLowerCase(),
  };
}
