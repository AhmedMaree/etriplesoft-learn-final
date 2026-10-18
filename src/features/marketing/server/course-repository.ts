import crashCourse from "../content/courses/crash-course-odoo-erp.json";
import automation from "../content/courses/odoo-automation.json";
import development from "../content/courses/odoo-development.json";
import implementation from "../content/courses/odoo-implementation.json";
import systemAdmin from "../content/courses/odoo-system-admin.json";
import userGuide from "../content/courses/odoo-user-guide.json";
import pythonDevelopment from "../content/courses/python-development-for-odoo.json";
import crashCourseAr from "../content/courses/ar/crash-course-odoo-erp.json";
import automationAr from "../content/courses/ar/odoo-automation.json";
import developmentAr from "../content/courses/ar/odoo-development.json";
import implementationAr from "../content/courses/ar/odoo-implementation.json";
import systemAdminAr from "../content/courses/ar/odoo-system-admin.json";
import userGuideAr from "../content/courses/ar/odoo-user-guide.json";
import pythonDevelopmentAr from "../content/courses/ar/python-development-for-odoo.json";
import { isCourse, isCourseTranslation, type Course, type CourseTranslation, type RoleSlug } from "../model/course";
import { courseImage, hasCourseThumbnail } from "@/features/courses/components/course-image";
import type { Locale } from "@/i18n/config";

/** Marketing slugs whose platform course uses a different slug. */
const PLATFORM_SLUG: Record<string, string> = {
  "python-development-for-odoo": "python-fundamentals",
};

/** The learning platform's slug for a marketing course. */
export function platformSlug(course: Pick<Course, "slug">): string {
  return PLATFORM_SLUG[course.slug] ?? course.slug;
}

/** Use the platform course thumbnail when one exists; otherwise keep the marketing artwork. */
function realImage(course: Course): string {
  const slug = platformSlug(course);
  return hasCourseThumbnail(slug) ? courseImage(slug) : course.image;
}

const rawCourses: readonly unknown[] = [
  crashCourse,
  automation,
  development,
  implementation,
  systemAdmin,
  userGuide,
  pythonDevelopment,
];

/** Arabic editorial text per course slug; structure (numbers, slugs, prices, roles) always comes from the English record. */
const rawArabic: Record<string, unknown> = {
  "crash-course-odoo-erp": crashCourseAr,
  "odoo-automation": automationAr,
  "odoo-development": developmentAr,
  "odoo-implementation": implementationAr,
  "odoo-system-admin": systemAdminAr,
  "odoo-user-guide": userGuideAr,
  "python-development-for-odoo": pythonDevelopmentAr,
};

function loadCourses(): Course[] {
  const courses = rawCourses.map((raw) => {
    if (!isCourse(raw)) {
      const slug = typeof raw === "object" && raw !== null && "slug" in raw ? String(raw.slug) : "unknown";
      throw new Error(`Invalid course data for "${slug}"`);
    }
    return { ...raw, image: realImage(raw), contentLang: "en" as const };
  });

  // Published first, then coming-soon; within each, by student count desc.
  return courses.sort((a, b) => {
    if (a.status !== b.status) return a.status === "published" ? -1 : 1;
    return b.studentCount - a.studentCount;
  });
}

function translate(course: Course, raw: unknown): Course {
  if (!isCourseTranslation(raw, course)) throw new Error(`Invalid Arabic course data for "${course.slug}"`);
  const ar: CourseTranslation = raw;
  return {
    ...course,
    title: ar.title,
    tagline: ar.tagline,
    description: ar.description,
    levelLabel: ar.levelLabel ?? course.levelLabel,
    language: ar.language,
    durationLabel: ar.durationLabel,
    track: ar.track,
    format: ar.format,
    moduleTags: ar.moduleTags,
    learningOutcomes: ar.learningOutcomes,
    whoItsFor: ar.whoItsFor,
    requirements: ar.requirements,
    curriculum: course.curriculum.map((module, index) => ({ ...module, ...ar.curriculum[index] })),
    curriculumNotice: ar.curriculumNotice ?? course.curriculumNotice,
    projects: ar.projects,
    faq: ar.faq,
    instructor: course.instructor && ar.instructor ? { ...course.instructor, ...ar.instructor } : course.instructor,
    contentLang: "ar",
  };
}

const coursesByLocale: Record<Locale, Course[]> = (() => {
  const en = loadCourses();
  // A course without an Arabic record keeps its English text and is marked as English content.
  const ar = en.map((course) => (rawArabic[course.slug] ? translate(course, rawArabic[course.slug]) : course));
  return { en, ar };
})();

export function getAllCourses(locale: Locale = "en"): Course[] {
  return coursesByLocale[locale];
}

export function getPublishedCourses(locale: Locale = "en"): Course[] {
  return coursesByLocale[locale].filter((course) => course.status === "published");
}

export function getCourseBySlug(slug: string, locale: Locale = "en"): Course | undefined {
  return coursesByLocale[locale].find((course) => course.slug === slug);
}

export function getCoursesByRole(role: RoleSlug, locale: Locale = "en"): Course[] {
  return coursesByLocale[locale].filter((course) => course.roles.includes(role));
}

export function getRelatedCourses(course: Course, limit = 3, locale: Locale = "en"): Course[] {
  return coursesByLocale[locale]
    .filter((other) => other.slug !== course.slug && other.status === "published")
    .filter((other) => other.roles.some((role) => course.roles.includes(role)))
    .slice(0, limit);
}
