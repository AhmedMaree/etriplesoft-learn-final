import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { PathExplorer, type RolePath } from "@/features/marketing/components/paths/path-explorer";
import { learningPaths } from "@/features/marketing/lib/learning-paths";
import { formatMessage, getMarketingMessages } from "@/features/marketing/lib/messages";
import { marketingMetadata } from "@/features/marketing/lib/page-meta";
import { levels, type CourseLevel, type RoleSlug } from "@/features/marketing/model/course";
import { getCourseBySlug } from "@/features/marketing/server/course-repository";

type PageProps = { params: Promise<{ locale: string }> };

const pathImages: Record<RoleSlug, string> = {
  "end-user": "/marketing/odoo-end-user-learning-path.png",
  "system-admin": "/marketing/odoo-system-admin-learning-path.png",
  implementer: "/marketing/odoo-implementor-learning-path.png",
  developer: "/marketing/odoo-developer-learning-path.png",
  automation: "/marketing/odoo-automation-learning-path.png",
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { paths } = getMarketingMessages(locale);
  return marketingMetadata(locale, paths.metaTitle, paths.metaDescription, "/learning-paths");
}

export default async function LearningPathsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const m = getMarketingMessages(locale);

  const paths: RolePath[] = learningPaths.map(({ role, stages }) => {
    const courses = stages
      .map((slug) => getCourseBySlug(slug, locale))
      .filter((course): course is NonNullable<typeof course> => course !== undefined);
    const totalHours = Math.round(courses.reduce((sum, course) => sum + course.durationHours, 0));
    const highest = courses.reduce<CourseLevel>(
      (top, course) => (levels.indexOf(course.level) > levels.indexOf(top) ? course.level : top),
      "Beginner",
    );
    const title = m.roles[role];
    const courseCount = formatMessage(locale, m.paths.courses, { n: courses.length, count: String(courses.length) });
    const courseEditorial = (slug: string) => m.paths.courseEditorial[slug as keyof typeof m.paths.courseEditorial];
    return {
      role,
      title,
      description: m.home.pathMeta[role].description,
      image: pathImages[role],
      imageAlt: formatMessage(locale, m.paths.pathAlt, { title }),
      summary: formatMessage(locale, m.paths.summary, {
        level: m.levels[highest],
        hours: String(totalHours),
        courses: courseCount,
      }),
      shortSummary: formatMessage(locale, m.paths.shortSummary, { level: m.levels[highest], hours: String(totalHours) }),
      moduleTags: Array.from(new Set(courses.flatMap((course) => course.moduleTags)))
        .slice(0, 4)
        .map((tag) => m.paths.moduleTags[tag as keyof typeof m.paths.moduleTags] ?? tag),
      courses: courses.map((course) => {
        const copy = courseEditorial(course.slug);
        return { slug: course.slug, title: copy?.title ?? course.title, tagline: copy?.tagline ?? course.tagline };
      }),
    };
  });

  return (
    <section className="mk-paths-page">
      <div className="mk-container">
        <div className="mk-paths-page-head">
          <span className="mk-eyebrow mk-eyebrow--neutral">{m.paths.eyebrow}</span>
          <h1 className="mk-page-title mk-page-title--md">{m.paths.title}</h1>
          <p className="mk-lead">{m.paths.lead}</p>
        </div>
        <PathExplorer paths={paths} copy={m.paths} />
      </div>
    </section>
  );
}
