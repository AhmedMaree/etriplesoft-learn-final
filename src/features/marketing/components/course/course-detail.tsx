import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Award,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Layers,
  MonitorPlay,
  ShieldCheck,
  Signal,
  User,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import type { Course } from "../../model/course";
import { formatMessage, getMarketingMessages, type MarketingMessages } from "../../lib/messages";
import { toCatalogCourse } from "../../lib/catalog-data";
import { getModulesForCourse } from "../../lib/module-queries";
import { getCourseBySlug, platformSlug } from "../../server/course-repository";
import { CourseCartButton } from "./course-cart-button";
import { teamAnchorId } from "../../lib/team";
import { CourseCard } from "../catalog/course-card";
import { ModuleIcon } from "../module-icon";
import { CourseCurriculum } from "./curriculum";
import { CourseSectionNav } from "./section-nav";
import { contentAttrs } from "../../lib/content-lang";

const FALLBACK_IMAGE = "/marketing/all-courses-image.png";

type Cta = { label: string; href: string; external: boolean };

function primaryCta(course: Course, c: MarketingMessages["course"]): Cta {
  if (course.status === "coming-soon") return { label: c.askLaunch, href: "/contact", external: false };
  // The start route signs the visitor in if needed, then opens the course on the platform.
  return { label: c.startLearning, href: `/catalog/${course.slug}/start`, external: false };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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
    <Link href={cta.href} className={className} prefetch={false}>
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
    .map((slug) => getCourseBySlug(slug, locale))
    .filter((item): item is Course => item !== undefined)
    .map((item) => toCatalogCourse(item, locale, m));
  const modules = getModulesForCourse(course, locale);
  const content = contentAttrs(course.contentLang);

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

  const heroFacts: { Icon: LucideIcon; label: string; value: string; content?: boolean }[] = [
    { Icon: Signal, label: c.level, value: levelText, content: true },
    { Icon: Clock, label: c.duration, value: course.durationLabel, content: true },
    { Icon: MonitorPlay, label: c.format, value: course.format, content: true },
  ];
  if (moduleCount > 0) heroFacts.push({ Icon: Layers, label: c.modules, value: String(moduleCount) });

  const statusClass = isComingSoon ? "mk-status mk-status--dark" : "mk-status";

  return (
    <>
      <section className="mk-page-hero mk-page-hero--grid mk-course-hero">
        <div className="mk-container mk-course-hero-grid">
          <div>
            <div className="mk-course-kicker">
              <span className="mk-kicker" {...content}>{course.track}</span>
              <span aria-hidden="true">&bull;</span>
              <span className={statusClass}>{isComingSoon ? c.comingSoon : c.available}</span>
            </div>
            <h1 className="mk-page-title" {...content}>{course.title}</h1>
            <p className="mk-lead" {...content}>{course.tagline}</p>

            <dl className="mk-course-facts">
              {heroFacts.map(({ Icon, label, value, content: isContent }) => (
                <div key={label}>
                  <span className="mk-course-fact-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span>
                    <dt>{label}</dt>
                    <dd {...(isContent ? content : {})}>{value}</dd>
                  </span>
                </div>
              ))}
            </dl>

            {course.instructor && (
              <div className="mk-course-byline">
                <span className="mk-course-avatar" aria-hidden="true">
                  {initials(course.instructor.name)}
                </span>
                <span>
                  <small>{c.instructor}</small>
                  <Link href={`/about#${teamAnchorId(course.instructor.name)}`}>{course.instructor.name}</Link>
                </span>
              </div>
            )}

            <div className="mk-course-actions">
              <CtaLink cta={cta} className="mk-btn mk-btn--primary">
                {cta.label}
                <ArrowRight size={18} className="mk-flip-rtl" aria-hidden="true" />
              </CtaLink>
              {!isComingSoon && (
                <CourseCartButton
                  slug={platformSlug(course)}
                  title={course.title}
                  locale={locale}
                  className="mk-btn mk-btn--outline"
                />
              )}
              <a href="#curriculum" className="mk-btn mk-btn--outline">
                {c.viewCurriculum}
                <ArrowDown size={18} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="mk-course-art">
            <div className="mk-course-image">
              <Image
                src={course.image || FALLBACK_IMAGE}
                alt={formatMessage(locale, c.thumbnailAlt, { title: course.title })}
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 40vw"
              />
            </div>
            {course.certificate && (
              <div className="mk-course-art-badge" aria-hidden="true">
                <span>
                  <Award size={20} />
                </span>
                <span>
                  <strong>{c.certificate}</strong>
                  <small>{c.included}</small>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <CourseSectionNav items={navItems} label={c.sections} />

      <div className="mk-container mk-course-body">
        <div className="mk-course-layout">
          <div className="mk-course-main">
            <div id="overview" className="mk-anchor">
              <h2 className="mk-h2-sm">{c.overview}</h2>
              <div className="mk-prose" {...content}>
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
                <ul className="mk-checklist mk-checklist--grid" {...content}>
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
              contentLang={course.contentLang}
              title={c.curriculum}
              countLabel={modulesLabel}
            />

            {(course.whoItsFor.length > 0 || course.requirements.length > 0) && (
              <div id="who-its-for" className="mk-anchor mk-two-col mk-two-col--cards">
                {course.whoItsFor.length > 0 && (
                  <div>
                    <h2 className="mk-h3-sm">{c.whoFor}</h2>
                    <ul className="mk-checklist mk-checklist--person" {...content}>
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
                    <ul className="mk-checklist mk-checklist--tertiary" {...content}>
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
                <div className="mk-projects" {...content}>
                  {course.projects.map((project, index) => (
                    <div key={project.title}>
                      <span className="mk-project-index" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
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
                  <div {...content}>
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
                <div className="mk-faq-list" {...content}>
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
                    <dd {...(fact.content ? content : {})}>{fact.value}</dd>
                  </div>
                ))}
              </dl>

              <CtaLink cta={cta} className="mk-btn mk-btn--primary mk-btn--block mk-side-cta">
                {cta.label}
                <ArrowRight size={18} className="mk-flip-rtl" aria-hidden="true" />
              </CtaLink>
              {!isComingSoon && (
                <CourseCartButton
                  slug={platformSlug(course)}
                  title={course.title}
                  locale={locale}
                  className="mk-btn mk-btn--outline mk-btn--block mk-side-cart"
                />
              )}

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
