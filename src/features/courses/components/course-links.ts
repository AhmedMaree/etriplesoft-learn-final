/** The course detail lives on the same learner route: /courses?course=<slug>. */
export const courseHref = (slug: string) => `/courses?course=${encodeURIComponent(slug)}`;

/** One lesson inside a course: /courses/<slug>/lessons/<lessonId>. */
export const lessonHref = (slug: string, lessonId: string) =>
  `/courses/${encodeURIComponent(slug)}/lessons/${encodeURIComponent(lessonId)}`;
