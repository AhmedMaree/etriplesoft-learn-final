/** The course detail lives on the same learner route: /courses?course=<slug>. */
export const courseHref = (slug: string) => `/courses?course=${encodeURIComponent(slug)}`;
