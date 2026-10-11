import crashCourse from "../content/courses/crash-course-odoo-erp.json";
import automation from "../content/courses/odoo-automation.json";
import development from "../content/courses/odoo-development.json";
import implementation from "../content/courses/odoo-implementation.json";
import systemAdmin from "../content/courses/odoo-system-admin.json";
import userGuide from "../content/courses/odoo-user-guide.json";
import pythonDevelopment from "../content/courses/python-development-for-odoo.json";
import { isCourse, type Course, type RoleSlug } from "../model/course";

const rawCourses: readonly unknown[] = [
  crashCourse,
  automation,
  development,
  implementation,
  systemAdmin,
  userGuide,
  pythonDevelopment,
];

function loadCourses(): Course[] {
  const courses = rawCourses.map((raw) => {
    if (!isCourse(raw)) {
      const slug = typeof raw === "object" && raw !== null && "slug" in raw ? String(raw.slug) : "unknown";
      throw new Error(`Invalid course data for "${slug}"`);
    }
    return raw;
  });

  // Published first, then coming-soon; within each, by student count desc.
  return courses.sort((a, b) => {
    if (a.status !== b.status) return a.status === "published" ? -1 : 1;
    return b.studentCount - a.studentCount;
  });
}

const courses = loadCourses();

export function getAllCourses(): Course[] {
  return courses;
}

export function getPublishedCourses(): Course[] {
  return courses.filter((course) => course.status === "published");
}

export function getCourseBySlug(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug);
}

export function getCoursesByRole(role: RoleSlug): Course[] {
  return courses.filter((course) => course.roles.includes(role));
}

export function getRelatedCourses(course: Course, limit = 3): Course[] {
  return courses
    .filter((other) => other.slug !== course.slug && other.status === "published")
    .filter((other) => other.roles.some((role) => course.roles.includes(role)))
    .slice(0, limit);
}
