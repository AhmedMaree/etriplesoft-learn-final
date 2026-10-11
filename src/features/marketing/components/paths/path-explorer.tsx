"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, ChevronDown, Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PathRoleIcon } from "../path-role-icon";
import { roleSlugs, type RoleSlug } from "../../model/course";
import type { MarketingMessages } from "../../lib/messages";
import { EN } from "../../lib/content-lang";

export type RolePath = {
  role: RoleSlug;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  summary: string;
  shortSummary: string;
  moduleTags: string[];
  courses: { slug: string; title: string; tagline: string }[];
};

export function PathExplorer({ paths, copy }: { paths: RolePath[]; copy: MarketingMessages["paths"] }) {
  const [activeRole, setActiveRole] = useState<RoleSlug>(paths[0].role);
  const [openRole, setOpenRole] = useState<RoleSlug | null>(paths[0]?.role ?? null);
  // Deep links such as /learning-paths#developer select that role.
  useEffect(() => {
    const select = () => {
      const hash = window.location.hash.slice(1);
      const role = roleSlugs.find((slug) => slug === hash);
      if (role) {
        setActiveRole(role);
        setOpenRole(role);
      }
    };
    select();
    window.addEventListener("hashchange", select);
    return () => window.removeEventListener("hashchange", select);
  }, []);

  const active = paths.find((path) => path.role === activeRole) ?? paths[0];

  return (
    <>
      <div className="mk-pe-desktop">
        <div className="mk-pe-tabs" role="tablist" aria-label={copy.tabs}>
          {paths.map((path) => (
            <button
              key={path.role}
              type="button"
              role="tab"
              id={`mk-pe-tab-${path.role}`}
              aria-selected={path.role === activeRole}
              aria-controls={`mk-pe-panel-${path.role}`}
              onClick={() => setActiveRole(path.role)}
            >
              {path.title}
            </button>
          ))}
        </div>

        <div
          id={`mk-pe-panel-${active.role}`}
          role="tabpanel"
          aria-labelledby={`mk-pe-tab-${active.role}`}
          className="mk-pe-panel"
        >
          <div className="mk-pe-panel-main">
            <h2 className="mk-h2-sm">{active.title}</h2>
            <p className="mk-body">{active.description}</p>
            <p className="mk-pe-summary">{active.summary}</p>

            <div>
              <span className="mk-label">{copy.fullPath}</span>
              <ol className="mk-pe-steps">
                {active.courses.map((course, index) => (
                  <li key={course.slug}>
                    <Link href={`/catalog/${course.slug}`} className="mk-pe-step">
                      <span className="mk-pe-step-number">{index + 1}</span>
                      <span>
                        <span className="mk-pe-step-title" {...EN}>{course.title}</span>
                        <span className="mk-pe-step-text" {...EN}>{course.tagline}</span>
                        <span className="mk-pe-step-cta">
                          {copy.viewCourse}
                          <ArrowRight size={12} className="mk-flip-rtl" aria-hidden="true" />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="mk-pe-image">
            <Image src={active.image} alt={active.imageAlt} fill sizes="(max-width: 767px) 100vw, 40vw" />
          </div>
        </div>

        <p className="mk-pe-note">
          <Info size={16} aria-hidden="true" />
          {copy.note}
        </p>
      </div>

      <ul className="mk-pe-mobile" aria-label={copy.list}>
        {paths.map((path, index) => {
          const isOpen = openRole === path.role;
          return (
            <li key={path.role} className="mk-path-card" data-open={isOpen || undefined}>
              <button
                type="button"
                onClick={() => setOpenRole(isOpen ? null : path.role)}
                aria-expanded={isOpen}
                aria-controls={`mk-pe-mobile-${path.role}`}
              >
                <span className="mk-path-index">{String(index + 1).padStart(2, "0")}</span>
                <PathRoleIcon role={path.role} size={20} />
                <span className="mk-path-heading">
                  <span className="mk-path-name">{path.title}</span>
                  <span className="mk-path-sub">{path.shortSummary}</span>
                </span>
                <ChevronDown size={20} className="mk-path-chevron" aria-hidden="true" />
              </button>
              <div id={`mk-pe-mobile-${path.role}`} className="mk-path-detail" hidden={!isOpen}>
                <div className="mk-pe-mobile-image">
                  <Image src={path.image} alt={path.imageAlt} fill sizes="100vw" />
                </div>
                <p className="mk-body">{path.description}</p>
                {path.moduleTags.length > 0 && (
                  <ul className="mk-chip-list">
                    {path.moduleTags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                )}
                <span className="mk-label">{copy.fullPath}</span>
                <ol className="mk-pe-mobile-steps">
                  {path.courses.map((course, courseIndex) => (
                    <li key={course.slug}>
                      <Link href={`/catalog/${course.slug}`}>
                        <span>{courseIndex + 1}</span>
                        <bdi {...EN}>{course.title}</bdi>
                      </Link>
                    </li>
                  ))}
                </ol>
                <Link
                  href={path.courses[0] ? `/catalog/${path.courses[0].slug}` : "/catalog"}
                  className="mk-btn mk-btn--primary mk-btn--block"
                >
                  {copy.explore}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
