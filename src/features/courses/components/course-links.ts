/** The course detail lives on the same learner route: /courses?course=<slug>. */
export const courseHref = (slug: string) => `/courses?course=${encodeURIComponent(slug)}`;

/** One lesson inside a course: /courses/<slug>/lessons/<lessonId>. */
export const lessonHref = (slug: string, lessonId: string) =>
  `/courses/${encodeURIComponent(slug)}/lessons/${encodeURIComponent(lessonId)}`;

/**
 * Optional assessment lessons placed directly after a video in the same module are that video's practice
 * check: learners answer them inside the video panel, so lesson lists hide them. Returns video id → check id.
 */
export function pairedVideoChecks(
  outline: { lessonId: string; moduleId: string; lessonType: string; isRequired: boolean }[],
) {
  const pairs = new Map<string, string>();
  outline.forEach((item, index) => {
    const before = outline[index - 1];
    if (item.lessonType === "assessment" && !item.isRequired && before?.lessonType === "video" && before.moduleId === item.moduleId)
      pairs.set(before.lessonId, item.lessonId);
  });
  return pairs;
}
