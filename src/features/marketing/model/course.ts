export const roleSlugs = [
  "end-user",
  "system-admin",
  "implementer",
  "developer",
  "automation",
] as const;

export const levels = ["Beginner", "Intermediate", "Advanced"] as const;
export const statuses = ["published", "coming-soon"] as const;
export const badges = ["Best Seller", "New", "None"] as const;

export type RoleSlug = (typeof roleSlugs)[number];
export type CourseLevel = (typeof levels)[number];
export type CourseStatus = (typeof statuses)[number];
export type CourseBadge = (typeof badges)[number];

export type CurriculumModule = { number: string; title: string; description: string };
export type CourseProject = { title: string; description: string };
export type CourseFaq = { question: string; answer: string };
export type Instructor = { name: string; role: string; bio: string; initials: string };

/**
 * Course records are editorial content kept in English (see docs/I18N.md: LMS content
 * is localized later from the database, not from UI message files).
 */
export type Course = {
  slug: string;
  title: string;
  image: string;
  tagline: string;
  description: string[];
  status: CourseStatus;
  badge: CourseBadge;
  level: CourseLevel;
  levelLabel?: string;
  language: string;
  durationHours: number;
  durationLabel: string;
  track: string;
  format: string;
  externalCourseUrl: string | null;
  price: number | null;
  roles: RoleSlug[];
  moduleTags: string[];
  coveredModuleSlugs: string[];
  learningOutcomes: string[];
  whoItsFor: string[];
  requirements: string[];
  curriculum: CurriculumModule[];
  curriculumNotice?: string;
  projects: CourseProject[];
  relatedCourseSlugs: string[];
  faq: CourseFaq[];
  instructor: Instructor | null;
  studentCount: number;
  rating: number;
  resourcesCount: number;
  certificate: boolean;
  /** Language of the editorial text; set by the repository so Arabic pages mark untranslated text as English. */
  contentLang?: "en" | "ar";
};

/** Translated editorial fields for one course; everything structural stays on the English record. */
export type CourseTranslation = {
  title: string;
  tagline: string;
  description: string[];
  levelLabel?: string;
  language: string;
  durationLabel: string;
  track: string;
  format: string;
  moduleTags: string[];
  learningOutcomes: string[];
  whoItsFor: string[];
  requirements: string[];
  curriculum: { title: string; description: string }[];
  curriculumNotice?: string;
  projects: CourseProject[];
  faq: CourseFaq[];
  instructor?: { role: string; bio: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === "string" && options.some((option) => option === value);
}

function isObjectArray(value: unknown, keys: readonly string[]): boolean {
  return (
    Array.isArray(value) &&
    value.every((item) => isRecord(item) && keys.every((key) => typeof item[key] === "string"))
  );
}

/** Build-time guard for course JSON; a malformed record fails the build with its slug. */
export function isCourse(value: unknown): value is Course {
  if (!isRecord(value)) return false;
  return (
    typeof value.slug === "string" &&
    typeof value.title === "string" &&
    typeof value.image === "string" &&
    typeof value.tagline === "string" &&
    isStringArray(value.description) &&
    isOneOf(statuses, value.status) &&
    isOneOf(badges, value.badge) &&
    isOneOf(levels, value.level) &&
    typeof value.durationHours === "number" &&
    typeof value.durationLabel === "string" &&
    typeof value.track === "string" &&
    Array.isArray(value.roles) &&
    value.roles.every((role) => isOneOf(roleSlugs, role)) &&
    isStringArray(value.moduleTags) &&
    isStringArray(value.coveredModuleSlugs) &&
    isStringArray(value.learningOutcomes) &&
    isStringArray(value.whoItsFor) &&
    isStringArray(value.requirements) &&
    isObjectArray(value.curriculum, ["number", "title", "description"]) &&
    isObjectArray(value.projects, ["title", "description"]) &&
    isStringArray(value.relatedCourseSlugs) &&
    isObjectArray(value.faq, ["question", "answer"]) &&
    (value.instructor === null || isObjectArray([value.instructor], ["name", "role", "bio", "initials"]))
  );
}

/** Build-time guard for a course translation; module counts must match the English curriculum. */
export function isCourseTranslation(value: unknown, course: Course): value is CourseTranslation {
  if (!isRecord(value)) return false;
  return (
    typeof value.title === "string" &&
    typeof value.tagline === "string" &&
    isStringArray(value.description) &&
    (value.levelLabel === undefined || typeof value.levelLabel === "string") &&
    typeof value.language === "string" &&
    typeof value.durationLabel === "string" &&
    typeof value.track === "string" &&
    typeof value.format === "string" &&
    isStringArray(value.moduleTags) &&
    isStringArray(value.learningOutcomes) &&
    isStringArray(value.whoItsFor) &&
    isStringArray(value.requirements) &&
    isObjectArray(value.curriculum, ["title", "description"]) &&
    Array.isArray(value.curriculum) &&
    value.curriculum.length === course.curriculum.length &&
    (value.curriculumNotice === undefined || typeof value.curriculumNotice === "string") &&
    isObjectArray(value.projects, ["title", "description"]) &&
    isObjectArray(value.faq, ["question", "answer"]) &&
    (value.instructor === undefined || isObjectArray([value.instructor], ["role", "bio"]))
  );
}
