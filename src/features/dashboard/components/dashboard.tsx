import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { BookOpen, Users, CalendarDays, Award, ChevronRight, ArrowRight, BarChart3, Briefcase, Play } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Panel, Title, IconBox, Progress } from '@/components/ui/primitives';
import { Community } from '@/components/shared/community-promo';
import { ProgressPanel, Paths } from '@/features/learning/components/learning-widgets';
import { CourseCard } from '@/features/courses/components/course-card';
import { ASSET_BASE } from '@/lib/assets';
import { courses } from '@/features/courses/data/demo-courses';
import { ScrollToLearningPaths } from '@/features/dashboard/components/scroll-to-learning-paths';
import { useTranslations } from 'next-intl';

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

export function Overview() {
  const t = useTranslations("dashboard");
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
        <Title href="/courses">{t("popularCourses")}</Title>
        <div className="course-grid">
          {courses.slice(0, 3).map((c, i) => (
            <CourseCard key={c.name} course={c} index={i} compact />
          ))}
        </div>
        <div id="learning-paths">
          <Paths />
        </div>
        <Community />
      </div>
      <aside className="right-rail">
        <ProgressPanel />
        <Panel>
          <Title href="/detail-course">{t("continueTitle")}</Title>
          {[
            "Business Workflows & ERP",
            "Introduction to Models",
            "Working with Views",
          ].map((n, i) => (
            <Link href="/detail-course" className="lesson-preview" key={n}>
              <div className="lesson-thumb">
                <Image
                  src={ASSET_BASE + "course-2.svg"}
                  alt=""
                  fill
                  sizes="96px"
                />
                <Play fill="white" />
              </div>
              <div>
                <strong dir="ltr">{n}</strong>
                <small dir="ltr">Odoo Development</small>
                <div className="inline-progress">
                  <Progress value={35 - i * 3} />
                  <small>
                    {[12, 8, 6][i]} / {45 - i * 10} min
                  </small>
                </div>
              </div>
            </Link>
          ))}
        </Panel>
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
