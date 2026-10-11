import Image from "next/image";
import { ArrowDown, ArrowRight, ArrowUpRight, Award, CheckCircle2, ChevronDown, ClipboardCheck, ShieldCheck, User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import type { Course } from "../../model/course";
import { formatMessage, getMarketingMessages, type MarketingMessages } from "../../lib/messages";
import { toCatalogCourse } from "../../lib/catalog-data";
import { getModulesForCourse } from "../../lib/module-queries";
import { getCourseBySlug } from "../../server/course-repository";
import { teamAnchorId } from "../../lib/team";
import { CourseCard } from "../catalog/course-card";
import { ModuleIcon } from "../module-icon";
import { CourseCurriculum } from "./curriculum";
import { CourseSectionNav } from "./section-nav";
import { EN } from "../../lib/content-lang";

const FALLBACK_IMAGE = "/marketing/all-courses-image.png";

type Cta = { label: string; href: string; external: boolean };

function primaryCta(course: Course, c: MarketingMessages["course"]): Cta {
  if (course.status === "coming-soon") return { label: c.askLaunch, href: "/contact", external: false };
  if (course.externalCourseUrl) return { label: c.startLearning, href: course.externalCourseUrl, external: true };
  return { label: c.exploreCourse, href: "/catalog", external: false };
}

function CtaLink({ cta, className, children }: { cta: Cta; className: string; children: React.ReactNode }) {
  if (cta.external) {
    return (
      <a href={cta.href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={cta.href} className={className}>
      {children}
    </Link>
  );
}

export function CourseDetail({ course, locale }: { course: Course; locale: Locale }) {
  const m = getMarketingMessages(locale);
  const c = m.course;
  const isComingSoon = course.status === "coming-soon";
  const cta = primaryCta(course, c);
  const levelText = course.levelLabel ?? m.levels[course.level];
  const moduleCount = course.curriculum.length;
  const modulesLabel = formatMessage(locale, c.moduleCount, { n: moduleCount, count: String(moduleCount) });
  const related = course.relatedCourseSlugs
    .map((slug) => getCourseBySlug(slug))
    .filter((item): item is Course => item !== undefined)
    .map((item) => toCatalogCourse(item, locale, m));
  const modules = getModulesForCourse(course);

  const navItems = [
    { id: "overview", label: c.nav.overview },
    { id: "outcomes", label: c.nav.outcomes },
    { id: "curriculum", label: c.nav.curriculum },
    { id: "who-its-for", label: c.nav.who },
    ...(course.certificate ? [{ id: "certificate", label: c.nav.certificate }] : []),
    ...(course.instructor ? [{ id: "instructor", label: c.nav.instructor }] : []),
    { id: "faq", label: c.nav.faq },
  ];

  const facts: { label: string; value: string; content?: boolean }[] = [
    { label: c.level, value: levelText, content: true },
    { label: c.duration, value: course.durationLabel, content: true },
    { label: c.format, value: course.format, content: true },
    { label: c.language, value: course.language, content: true },
  ];
  if (moduleCount > 0) facts.push({ label: c.modules, value: String(moduleCount) });
  if (course.certificate) facts.push({ label: c.certificate, value: c.included });

  const statusClass = isComingSoon ? "mk-status mk-status--dark" : "mk-status";

  return (
    <>
      <section className="mk-page-hero mk-page-hero--grid mk-course-hero">
        <div className="mk-container mk-course-hero-grid">
          <div>
            <div className="mk-course-kicker">
              <span className="mk-kicker" {...EN}>{course.track}</span>
              <span aria-hidden="true">&bull;</span>
              <span className={statusClass}>{isComingSoon ? c.comingSoon : c.available}</span>
            </div>
            <h1 className="mk-page-title" {...EN}>{course.title}</h1>
            <p className="mk-lead" {...EN}>{course.tagline}</p>

            <dl className="mk-course-facts">
              <div>
                <dt>{c.level}</dt>
                <dd {...EN}>{levelText}</dd>
              </div>
              <div>
                <dt>{c.duration}</dt>
                <dd {...EN}>{course.durationLabel}</dd>
              </div>
              <div>
                <dt>{c.format}</dt>
                <dd {...EN}>{course.format}</dd>
              </div>
              {course.instructor && (
                <div>
                  <dt>{c.instructor}</dt>
                  <dd>
                    <Link href={`/about#${teamAnchorId(course.instructor.name)}`}>{course.instructor.name}</Link>
                  </dd>
                </div>
              )}
            </dl>

            <a href="#curriculum" className="mk-link-arrow">
              {c.viewCurriculum}
              <ArrowDown size={18} aria-hidden="true" />
            </a>
          </div>

          <div className="mk-course-image">
            <Image
              src={course.image || FALLBACK_IMAGE}
              alt={formatMessage(locale, c.thumbnailAlt, { title: course.title })}
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 40vw"
            />
          </div>
        </div>
      </section>

      <CourseSectionNav items={navItems} label={c.sections} />

      <div className="mk-container mk-course-body">
        <div className="mk-course-layout">
          <div className="mk-course-main">
            <div id="overview" className="mk-anchor">
              <h2 className="mk-h2-sm">{c.overview}</h2>
              <div className="mk-prose" {...EN}>
                {course.description.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            {modules.length > 0 && (
              <div>
                <p className="mk-label">{c.modulesCovered}</p>
                <ul className="mk-module-chips">
                  {modules.map((mod) => (
                    <li key={mod.slug}>
                      <Link href={`/odoo-modules?module=${mod.slug}`}>
                        <ModuleIcon icon={mod.icon} size={16} />
                        {mod.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {course.learningOutcomes.length > 0 && (
              <div id="outcomes" className="mk-anchor">
                <h2 className="mk-h2-sm">{c.outcomes}</h2>
                <ul className="mk-checklist" {...EN}>
                  {course.learningOutcomes.map((outcome) => (
                    <li key={outcome}>
                      <CheckCircle2 size={18} aria-hidden="true" />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <CourseCurriculum
              modules={course.curriculum}
              notice={course.curriculumNotice}
              title={c.curriculum}
              countLabel={modulesLabel}
            />

            {(course.whoItsFor.length > 0 || course.requirements.length > 0) && (
              <div id="who-its-for" className="mk-anchor mk-two-col">
                {course.whoItsFor.length > 0 && (
                  <div>
                    <h2 className="mk-h3-sm">{c.whoFor}</h2>
                    <ul className="mk-checklist mk-checklist--person" {...EN}>
                      {course.whoItsFor.map((item) => (
                        <li key={item}>
                          <User size={18} aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {course.requirements.length > 0 && (
                  <div>
                    <h2 className="mk-h3-sm">{c.prerequisites}</h2>
                    <ul className="mk-checklist mk-checklist--tertiary" {...EN}>
                      {course.requirements.map((item) => (
                        <li key={item}>
                          <ClipboardCheck size={18} aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {course.projects.length > 0 && (
              <div>
                <h2 className="mk-h3-sm">{c.practical}</h2>
                <div className="mk-projects" {...EN}>
                  {course.projects.map((project) => (
                    <div key={project.title}>
                      <p className="mk-project-title">{project.title}</p>
                      <p className="mk-body">{project.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {course.certificate && (
              <div id="certificate" className="mk-anchor">
                <h2 className="mk-h2-sm">{c.certificateTitle}</h2>
                <div className="mk-panel mk-cert">
                  <span className="mk-cert-icon">
                    <Award size={28} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="mk-prose-lg">
                      {formatMessage(locale, isComingSoon ? c.certificateLaunch : c.certificateNow, {
                        title: course.title,
                      })}
                    </p>
                    <ul className="mk-checklist">
                      {c.certificatePoints.map((point) => (
                        <li key={point}>
                          <CheckCircle2 size={18} aria-hidden="true" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {course.instructor && (
              <div id="instructor" className="mk-anchor">
                <h2 className="mk-h2-sm">{c.instructorTitle}</h2>
                <div className="mk-panel mk-instructor">
                  <span className="mk-instructor-icon">
                    <User size={28} aria-hidden="true" />
                  </span>
                  <div {...EN}>
                    <Link href={`/about#${teamAnchorId(course.instructor.name)}`} className="mk-instructor-name">
                      {course.instructor.name}
                      <ArrowUpRight size={16} className="mk-flip-rtl" aria-hidden="true" />
                    </Link>
                    <p className="mk-small">{course.instructor.role}</p>
                    <p className="mk-body">{course.instructor.bio}</p>
                  </div>
                </div>
              </div>
            )}

            {course.faq.length > 0 && (
              <div id="faq" className="mk-anchor">
                <h2 className="mk-h2-sm">{c.faq}</h2>
                <div className="mk-faq-list" {...EN}>
                  {course.faq.map((item) => (
                    <details key={item.question} className="mk-faq-item mk-faq-item--sm">
                      <summary>
                        {item.question}
                        <ChevronDown size={18} aria-hidden="true" />
                      </summary>
                      <p className="mk-body">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="mk-course-side">
            <div className="mk-side-card">
              <span className={statusClass}>{isComingSoon ? c.comingSoon : c.available}</span>
              <dl className="mk-side-facts">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd {...(fact.content ? EN : {})}>{fact.value}</dd>
                  </div>
                ))}
              </dl>

              {course.certificate && (
                <a href="#certificate" className="mk-side-cert">
                  <Award size={20} aria-hidden="true" />
                  <span>{c.certificateSidebar}</span>
                </a>
              )}

              {!isComingSoon && (
                <div className="mk-guarantee">
                  <ShieldCheck size={16} aria-hidden="true" />
                  <p>
                    {c.guarantee}{" "}
                    <Link href="/refund-policy" target="_blank">
                      {c.viewPolicy}
                      <span className="mk-visually-hidden"> {c.opensNewTab}</span>
                    </Link>
                    .
                  </p>
                </div>
              )}

              <CtaLink cta={cta} className="mk-btn mk-btn--primary mk-btn--block mk-side-cta">
                {cta.label}
                <ArrowRight size={18} className="mk-flip-rtl" aria-hidden="true" />
              </CtaLink>
            </div>
          </aside>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mk-related">
          <div className="mk-container">
            <h2 className="mk-h2-sm">{c.related}</h2>
            <div className="mk-card-grid mk-card-grid--related">
              {related.map((item) => (
                <CourseCard
                  key={item.slug}
                  course={item}
                  labels={{ view: m.catalog.view, preview: m.catalog.preview, certificate: m.catalog.certificate }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mk-container mk-course-cta-wrap">
        <div className="mk-course-cta">
          <span className="mk-cta-kicker">{c.finalKicker}</span>
          <h2>{formatMessage(locale, c.finalTitle, { title: course.title })}</h2>
          <p>{c.finalText}</p>
          <div className="mk-cta-actions">
            <CtaLink cta={cta} className="mk-btn mk-btn--white">
              {cta.label}
              <ArrowRight size={18} className="mk-flip-rtl" aria-hidden="true" />
            </CtaLink>
            <Link href="/catalog" className="mk-btn mk-btn--ghost-light">
              {c.exploreAll}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
