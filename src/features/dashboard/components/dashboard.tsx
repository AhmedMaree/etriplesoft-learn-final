import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { BookOpen, Users, CalendarDays, Award, ArrowRight, BarChart3, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Panel, Title, IconBox } from '@/components/ui/primitives';
import { Community } from '@/components/shared/community-promo';
import { ASSET_BASE } from '@/lib/assets';
import { ScrollToLearningPaths } from '@/features/dashboard/components/scroll-to-learning-paths';
import { useTranslations } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { isLocale, type Locale } from '@/i18n/config';
import { demoFeaturesEnabled } from '@/lib/features';
import { createClient } from '@/lib/supabase/server';
import type { CatalogCourse } from '@/features/courses/server/course-repository';
import { getCatalogCourseDurations, getCatalogCourseOutline, listCatalogCourses } from '@/features/courses/server/course-repository';
import { AvailableCourses, YourCourses, type OverviewCourse } from '@/features/dashboard/components/overview-courses';
import { getLearningSummary } from '@/features/learning/server/summary';
import { LearningSummaryPanel, QuickLinksCard } from '@/features/learning/components/learning-summary';

export function AICard() {
  const t = useTranslations("dashboard");
  if (!demoFeaturesEnabled) return null;
  return (
    <Panel className="ai-small">
      <Title link="">
        {t("aiTitle")} <b className="badge">{t("newBadge")}</b>
      </Title>
      <div className="ai-small-body">
        <Image
          src={ASSET_BASE + "ai-character.png"}
            alt={t("aiTitle")}
          width={512}
          height={512}
        />
        <div>
          <p>
            {t("aiCopy")}
          </p>
          <Link className="btn outline" href="/ai-page">
            {t("askAi")} <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </Panel>
  );
}

export async function Overview() {
  const t = await getTranslations("dashboard");
  const learningT = await getTranslations('realLearning');
  const locale = await getLocale();
  if (!isLocale(locale)) throw new Error('Unsupported locale.');
  const client = await createClient();
  const [summary, catalog] = await Promise.all([getLearningSummary(locale),listCatalogCourses(client,{locale,limit:3})]);
  const courses = await withCardDetails(client, locale, catalog.courses);
  return (
    <div className="columns">
      <div className="primary">
        <section className="hero overview-hero">
          <Image
            className="hero-photo"
            src={ASSET_BASE + "learner-hero.png"}
            alt={t("heroEyebrow")}
            width={1536}
            height={1024}
            sizes="(max-width: 900px) 100vw, 53vw"
            priority
            loading="eager"
          />
          <div className="hero-copy">
            <div className="eyebrow">{t("heroEyebrow")}</div>
            <h2>
              {t("heroTitleStart")} <span>{t("heroTitleHighlight")}</span>
            </h2>
            <p>
              {t("heroCopy")}
            </p>
            <div className="button-row">
              <Link className="btn" href="/courses">
                {t("startLearning")} <ArrowRight size={19} />
              </Link>
              <ScrollToLearningPaths />
            </div>
          </div>
          <div className="hero-features">
            {[
              [BookOpen, t("expertInstructors"), t("expertCopy")],
              [Briefcase, t("projects"), t("projectsCopy")],
              [BarChart3, t("certified"), t("certifiedCopy")],
            ].map(([I, h, p], i) => {
              const Icon = I as LucideIcon;
              return (
                <div key={i}>
                  <IconBox icon={Icon} color={i === 2 ? "green" : "blue"} />
                  <div>
                    <strong>{h as string}</strong>
                    <small>{p as string}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <div className="ov-courses">
          <AvailableCourses courses={courses} locale={locale} />
          <YourCourses courses={summary.courses} />
        </div>
        <Community />
      </div>
      <aside className="right-rail">
        <LearningSummaryPanel summary={summary} />
        <AICard />
        <QuickLinksCard
          links={[
            { href: "/courses", icon: BookOpen, title: t("browseCourses"), subtitle: learningT("browseSubtitle"), tone: "blue" },
            ...(demoFeaturesEnabled ? [{ href: "/community", icon: Users, title: t("joinCommunity"), subtitle: learningT("communitySubtitle"), tone: "green" }] : []),
            { href: "/certificates", icon: Award, title: t("certifications"), subtitle: learningT("certificatesSubtitle"), tone: "purple" },
            ...(demoFeaturesEnabled ? [{ href: "/calendar", icon: CalendarDays, title: t("calendar"), subtitle: learningT("calendarSubtitle"), tone: "orange" }] : []),
          ]}
        />
      </aside>
    </div>
  );
}

/** Real duration and published lesson counts for the three overview cards; missing values are simply omitted. */
async function withCardDetails(
  client: Awaited<ReturnType<typeof createClient>>,
  locale: Locale,
  courses: CatalogCourse[],
): Promise<OverviewCourse[]> {
  const [durations, outlines] = await Promise.all([
    getCatalogCourseDurations(client, locale, courses.map((course) => course.id)).catch(() => ({} as Record<string, number>)),
    Promise.all(courses.map((course) => getCatalogCourseOutline(client, locale, course.slug).catch(() => null))),
  ]);
  return courses.map((course, index) => ({
    ...course,
    durationSeconds: durations[course.id] ?? course.durationSeconds,
    lessonCount: outlines[index]?.length || null,
  }));
}
