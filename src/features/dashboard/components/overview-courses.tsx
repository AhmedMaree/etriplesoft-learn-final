import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { ArrowRight, BookOpen, Box, ChartNoAxesColumn, Clock, CodeXml, FileText, Server, Settings, TrendingUp, Workflow } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/config';
import { ASSET_BASE } from '@/lib/assets';
import type { CatalogCourse } from '@/features/courses/server/course-repository';
import type { LearningSummary } from '@/features/learning/server/summary';
import { courseImage } from '@/features/courses/components/course-image';
import { courseHref, lessonHref } from '@/features/courses/components/course-links';
import { getMarketingMessages } from '@/features/marketing/lib/messages';
import type { AreaLevel, Recommendation } from '@/features/placement/recommend';
import { getAreaOptions } from '@/features/placement/server/areas';
import { TrackedCard } from '@/features/placement/components/tracked-card';

export type OverviewCourse = CatalogCourse & { lessonCount: number | null };

const COURSE_ICONS: Record<string, LucideIcon> = {
  'crash-course-odoo-erp': Box,
  'python-fundamentals': CodeXml,
  'odoo-development': Settings,
  'odoo-implementation': Workflow,
  'odoo-user-guide': BookOpen,
  'odoo-system-admin': Server,
};

function SectionHeader({ id, eyebrow, title, copy, href, action }: { id: string; eyebrow: string; title: string; copy: string; href: string; action: string }) {
  return (
    <header className="ov-head">
      <div>
        <p className="ov-eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        <p className="ov-copy">{copy}</p>
      </div>
      <Link className="ov-more" href={href}>
        {action} <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />
      </Link>
    </header>
  );
}

type CourseCardItem = {
  course: OverviewCourse;
  /** Badge for the first recommendation. */
  startHere?: string;
  /** Why the course is recommended. */
  reason?: string;
  /** Record clicks for recommendation measurement. */
  tracked?: boolean;
};

async function CourseGrid({ items, locale }: { items: CourseCardItem[]; locale: Locale }) {
  const t = await getTranslations('realLearning');
  const c = await getTranslations('courses');
  const categoryNames = getMarketingMessages(locale).catalog.categoryNames as Record<string, string>;
  const level = (value: string | null) =>
    value === 'beginner' || value === 'intermediate' || value === 'advanced' ? c(value) : null;
  const duration = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return null;
    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return c('durationM', { m: String(Math.max(minutes, 1)) });
    return rest === 0 ? c('durationHours', { h: String(hours) }) : c('durationHm', { h: String(hours), m: String(rest) });
  };

  return (
    <div className="ov-grid">
      {items.map(({ course, startHere, reason, tracked }) => {
        const Icon = COURSE_ICONS[course.slug] ?? BookOpen;
        const meta = [
          duration(course.durationSeconds) && { icon: Clock, text: duration(course.durationSeconds)! },
          level(course.level) && { icon: ChartNoAxesColumn, text: level(course.level)! },
          course.lessonCount ? { icon: FileText, text: c('lessonsTotal', { n: course.lessonCount }) } : null,
        ].filter((item): item is { icon: LucideIcon; text: string } => Boolean(item));
        const content = (
          <>
            <div className="ov-media">
              <Link href={courseHref(course.slug)} className="ov-thumb" tabIndex={-1} aria-hidden="true">
                <Image src={courseImage(course.slug)} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 30vw" />
              </Link>
              {course.category && <span className="ov-badge">{categoryNames[course.category] ?? course.category}</span>}
              {startHere && <span className="ov-start">{startHere}</span>}
              <span className="ov-tile" aria-hidden="true"><Icon /></span>
            </div>
            <div className="ov-body">
              <h3 dir="auto"><Link href={courseHref(course.slug)}>{course.title}</Link></h3>
              {reason && <p className="ov-reason">{reason}</p>}
              <p dir="auto">{course.summary}</p>
              {meta.length > 0 && (
                <ul className="ov-meta" aria-label={t('courseMeta')}>
                  {meta.map(({ icon: MetaIcon, text }) => (
                    <li key={text}><MetaIcon size={18} aria-hidden="true" />{text}</li>
                  ))}
                </ul>
              )}
              <Link className="btn ov-btn" href={courseHref(course.slug)} aria-label={`${t('viewCourse')}: ${course.title}`}>
                {t('viewCourse')} <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />
              </Link>
            </div>
          </>
        );
        const className = `ov-card${startHere ? ' ov-card--start' : ''}`;
        return tracked ? (
          <TrackedCard className={className} courseId={course.id} key={course.id}>{content}</TrackedCard>
        ) : (
          <article className={className} key={course.id}>{content}</article>
        );
      })}
    </div>
  );
}

export async function AvailableCourses({ courses, locale }: { courses: OverviewCourse[]; locale: Locale }) {
  const t = await getTranslations('realLearning');
  return (
    <section className="ov-section ov-available" aria-labelledby="ov-available-title">
      <span className="ov-dots" aria-hidden="true" />
      <SectionHeader
        id="ov-available-title"
        eyebrow={t('availableEyebrow')}
        title={t('availableCourses')}
        copy={t('availableCopy')}
        href="/courses"
        action={t('viewAllCourses')}
      />
      <CourseGrid items={courses.map((course) => ({ course }))} locale={locale} />
    </section>
  );
}

export async function RecommendedCourses({
  recommendations,
  levels,
  locale,
}: {
  recommendations: Recommendation<OverviewCourse>[];
  levels: AreaLevel[];
  locale: Locale;
}) {
  const t = await getTranslations('placement');
  const learning = await getTranslations('realLearning');
  const c = await getTranslations('courses');
  const areas = await getAreaOptions(locale, [
    ...new Set([...levels.map((item) => item.area), ...recommendations.flatMap(({ area }) => (area ? [area] : []))]),
  ]);
  const areaName = (key: string | null) => (key && areas.find((area) => area.key === key)?.title) || key || '';
  const levelOf = (key: string | null) => levels.find((item) => item.area === key)?.level ?? 'beginner';
  const raised = levels.some((item) => item.raised);
  return (
    <section className="ov-section ov-available" aria-labelledby="ov-recommended-title">
      <span className="ov-dots" aria-hidden="true" />
      <SectionHeader
        id="ov-recommended-title"
        eyebrow={t('overview.eyebrow')}
        title={t('overview.title')}
        copy={t('overview.copy')}
        href="/courses"
        action={learning('viewAllCourses')}
      />
      {levels.length > 0 && (
        <div className="ov-levels">
          <span className="ov-levels-label" id="ov-levels-label">{t('overview.levelsLabel')}</span>
          <ul aria-labelledby="ov-levels-label">
            {levels.map((item) => (
              <li key={item.area}>
                <span dir="auto">{areaName(item.area)}</span>
                <b>{c(item.level)}</b>
                {item.raised && <TrendingUp size={16} className="ov-up" role="img" aria-label={t('overview.raised')} />}
              </li>
            ))}
          </ul>
          <span className="ov-levels-links">
            <Link href="/placement">{t('overview.retake')}</Link>
            <Link href="/placement?mode=goals">{t('overview.changeGoals')}</Link>
          </span>
        </div>
      )}
      {raised && (
        <p className="ov-retake">
          {t('overview.retakeSuggestion')} <Link href="/placement">{t('overview.retake')}</Link>
        </p>
      )}
      {recommendations.length === 0 ? (
        <div className="ov-progress-card ov-recs-empty">
          <p>{t('overview.empty')}</p>
          <div>
            <Link className="btn ov-btn" href="/courses">
              {learning('viewAllCourses')} <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />
            </Link>
            <Link className="btn outline ov-btn" href="/learning-paths">{t('overview.learningPaths')}</Link>
          </div>
        </div>
      ) : (
        <CourseGrid
          locale={locale}
          items={recommendations.map(({ course, area, reason }, index) => ({
            course,
            tracked: true,
            startHere: index === 0 ? t('overview.startHere') : undefined,
            reason: t(`overview.reasons.${reason}`, { area: areaName(area), level: c(levelOf(area)) }),
          }))}
        />
      )}
    </section>
  );
}

/** Shown on the overview to learners who skipped the level check or were never asked. */
export async function PlacementPrompt() {
  const t = await getTranslations('placement');
  return (
    <section className="ov-prompt" aria-labelledby="ov-prompt-title">
      <div>
        <h2 id="ov-prompt-title">{t('overview.promptTitle')}</h2>
        <p>{t('overview.promptCopy')}</p>
      </div>
      <Link className="btn" href="/placement">
        {t('overview.promptAction')} <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />
      </Link>
    </section>
  );
}

export async function YourCourses({ courses }: { courses: LearningSummary['courses'] }) {
  const t = await getTranslations('realLearning');
  const dashboard = await getTranslations('dashboard');
  return (
    <section className="ov-section ov-yours" id="learning-paths" aria-labelledby="ov-yours-title">
      <span className="ov-dots" aria-hidden="true" />
      <Image className="ov-art" src={ASSET_BASE + 'learning-books-art.png'} alt="" aria-hidden="true" width={640} height={529} sizes="240px" />
      <SectionHeader
        id="ov-yours-title"
        eyebrow={t('yourEyebrow')}
        title={t('yourCourses')}
        copy={t('yourCopy')}
        href="/courses?view=mine"
        action={t('viewAll')}
      />
      {courses.length === 0 ? (
        <div className="ov-progress-card ov-empty">
          <span className="ov-book" aria-hidden="true"><BookOpen /></span>
          <p>{t('empty')}</p>
          <Link className="btn ov-btn" href="/courses">
            {dashboard('browseCourses')} <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <ul className="ov-progress-list">
          {courses.slice(0, 3).map((course) => {
            const percent = Math.min(100, Math.floor((course.finished / Math.max(course.required, 1)) * 100));
            const href = course.resumeLessonId ? lessonHref(course.slug, course.resumeLessonId) : courseHref(course.slug);
            return (
              <li className="ov-progress-card" key={course.slug}>
                <span className="ov-book" aria-hidden="true"><BookOpen /></span>
                <div className="ov-progress-body">
                  <h3 dir="auto">{course.title}</h3>
                  <p>{t('lessons', { finished: course.finished, required: course.required })}</p>
                  <div className="ov-bar-row">
                    <div className="ov-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t('percentComplete', { percent })}>
                      <span style={{ width: `${percent}%` }} />
                    </div>
                    <span className="ov-percent" dir="ltr">{percent}%</span>
                  </div>
                </div>
                <Link className="btn ov-btn" href={href} aria-label={`${t('continue')}: ${course.title}`}>
                  {t('continue')} <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
