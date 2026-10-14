import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { BookOpen, Users, CalendarDays, Award, ChevronRight, ArrowRight, BarChart3, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Panel, Title, IconBox } from '@/components/ui/primitives';
import { Community } from '@/components/shared/community-promo';
import { ASSET_BASE } from '@/lib/assets';
import { ScrollToLearningPaths } from '@/features/dashboard/components/scroll-to-learning-paths';
import { useTranslations } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/config';
import { createClient } from '@/lib/supabase/server';
import { listCatalogCourses } from '@/features/courses/server/course-repository';
import { courseImage } from '@/features/courses/components/learner-courses';
import { courseHref } from '@/features/courses/components/course-links';
import { getLearningSummary } from '@/features/learning/server/summary';
import { LearningSummaryPanel } from '@/features/learning/components/learning-summary';

export function AICard() {
  const t = useTranslations("dashboard");
  return (
    <Panel className="ai-small">
      <Title link="">
        {t("aiTitle")} <b className="badge">New</b>
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
  const [summary, catalog] = await Promise.all([getLearningSummary(locale),listCatalogCourses(await createClient(),{locale,limit:3})]);
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
        <Title href="/courses">{learningT('availableCourses')}</Title>
        <div className="course-grid">
          {catalog.courses.map((course) => (
            <article className="course-card panel compact" key={course.id}><Link href={courseHref(course.slug)} className="course-image"><Image src={courseImage(course.slug)} alt="" fill sizes="(max-width:700px) 100vw,33vw" /></Link><div className="course-body"><h3 dir="auto"><Link href={courseHref(course.slug)}>{course.title}</Link></h3><p dir="auto">{course.summary}</p><Link className="btn outline" href={courseHref(course.slug)}>{learningT('viewCourse')}</Link></div></article>
          ))}
        </div>
        <div id="learning-paths">
          <Title href="/courses?view=mine">{learningT('yourCourses')}</Title>
          <div className="paths">{summary.courses.slice(0,3).map(course=><Link className="path panel" href={courseHref(course.slug)} key={course.slug}><IconBox icon={BookOpen}/><div><strong dir="auto">{course.title}</strong><p>{learningT('lessons',{finished:course.finished,required:course.required})}</p></div></Link>)}</div>
        </div>
        <Community />
      </div>
      <aside className="right-rail">
        <LearningSummaryPanel summary={summary} />
        <AICard />
        <Panel>
          <Title>{t("quickLinks")}</Title>
          {[
            [BookOpen, t("browseCourses"), "courses"],
            [Users, t("joinCommunity"), "community"],
            [Award, t("certifications"), "certificates"],
            [CalendarDays, t("calendar"), "calendar"],
          ].map(([I, t, p]) => {
            const Icon = I as LucideIcon;
            return (
              <Link className="quick-link" href={`/${p}`} key={t as string}>
                <Icon size={20} />
                <span>{t as string}</span>
                <ChevronRight size={17} />
              </Link>
            );
          })}
        </Panel>
      </aside>
    </div>
  );
}
