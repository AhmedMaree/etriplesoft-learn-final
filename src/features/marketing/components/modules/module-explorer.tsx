"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { ModuleIcon } from "../module-icon";
import type { ModuleAccent, ModuleIconKey } from "../../data/odoo-modules";
import type { MarketingMessages } from "../../lib/messages";
import { EN } from "../../lib/content-lang";

export type ModuleView = {
  slug: string;
  name: string;
  shortDescription: string;
  overview: string;
  icon: ModuleIconKey;
  accent: ModuleAccent;
  workflow: string[];
  skills: string[];
  relatedRoles: string[];
  courses: { slug: string; title: string; levelLabel: string }[];
};

const DEFAULT_MODULE_SLUG = "sales";

export function ModuleExplorer({ modules, copy }: { modules: ModuleView[]; copy: MarketingMessages["modules"] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const detailRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const requested = searchParams.get("module");
  const selected =
    modules.find((mod) => mod.slug === requested) ??
    modules.find((mod) => mod.slug === DEFAULT_MODULE_SLUG) ??
    modules[0];
  const selectedSlug = selected?.slug;

  // On small screens the panel sits below the grid, so bring it into view after a selection.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    detailRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [selectedSlug]);

  if (!selected) return null;

  return (
    <div className="mk-eco mk-eco--page" data-accent={selected.accent}>
      <div>
        <div className="mk-mod-grid" role="group" aria-label={copy.list}>
          {modules.map((mod) => (
            <button
              key={mod.slug}
              type="button"
              className="mk-eco-card"
              data-accent={mod.accent}
              data-selected={mod.slug === selected.slug || undefined}
              aria-pressed={mod.slug === selected.slug}
              onClick={() => router.push(`${pathname}?module=${mod.slug}`, { scroll: false })}
            >
              <span className="mk-eco-icon">
                <ModuleIcon icon={mod.icon} size={22} />
              </span>
              <span className="mk-eco-card-name" {...EN}>{mod.name}</span>
              <span className="mk-eco-card-desc mk-eco-card-desc--2" {...EN}>{mod.shortDescription}</span>
            </button>
          ))}
        </div>
        <div className="mk-big-picture">
          <p className="mk-big-picture-title">{copy.bigPictureTitle}</p>
          <p className="mk-body">{copy.bigPictureText}</p>
        </div>
      </div>

      <div ref={detailRef} className="mk-eco-panel mk-eco-panel--page" data-accent={selected.accent} role="region" aria-live="polite" aria-label={copy.details}>
        <div className="mk-eco-panel-bar" aria-hidden="true" />
        <div className="mk-eco-details">
          <div className="mk-eco-details-head">
            <span className="mk-eco-icon mk-eco-icon--lg">
              <ModuleIcon icon={selected.icon} size={26} />
            </span>
            <div {...EN}>
              <h3>{selected.name}</h3>
              <p>{selected.shortDescription}</p>
            </div>
          </div>

          <p className="mk-body mk-eco-overview" {...EN}>{selected.overview}</p>

          <div className="mk-eco-block">
            <p className="mk-eco-label">{copy.workflow}</p>
            <ol className="mk-eco-flow" {...EN}>
              {selected.workflow.map((step, index) => (
                <li key={step}>
                  <span>{step}</span>
                  {index < selected.workflow.length - 1 && (
                    <ArrowRight size={14} className="mk-flip-rtl" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>
          </div>

          <div className="mk-eco-block">
            <p className="mk-eco-label">{copy.skills}</p>
            <ul className="mk-eco-skills" {...EN}>
              {selected.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          </div>

          <div className="mk-eco-block">
            <p className="mk-eco-label">{copy.roles}</p>
            <ul className="mk-eco-skills mk-eco-skills--soft" {...EN}>
              {selected.relatedRoles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          </div>

          {selected.courses.length > 0 && (
            <div className="mk-eco-block">
              <p className="mk-eco-label">{copy.courses}</p>
              <ul className="mk-eco-courses">
                {selected.courses.map((course) => (
                  <li key={course.slug}>
                    <Link href={`/catalog/${course.slug}`}>
                      <span {...EN}>{course.title}</span>
                      <span className="mk-eco-course-level">
                        {course.levelLabel}
                        <ArrowRight size={14} className="mk-flip-rtl" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link href="/catalog" className="mk-eco-cta">
            {copy.exploreRelated}
            <ArrowUpRight size={16} className="mk-flip-rtl" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
