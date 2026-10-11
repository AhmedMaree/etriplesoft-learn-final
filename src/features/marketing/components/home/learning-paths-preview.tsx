"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, Clock, Compass } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PathRoleIcon } from "../path-role-icon";
import type { RoleSlug } from "../../model/course";
import type { MarketingMessages } from "../../lib/messages";

export type FeaturedPath = {
  role: RoleSlug;
  title: string;
  description: string;
  levelKey: string;
  levelLabel: string;
  duration: string;
  tags: string[];
};

type LearningPathsProps = {
  paths: FeaturedPath[];
  copy: MarketingMessages["home"]["paths"];
};

export function LearningPaths({ paths, copy }: LearningPathsProps) {
  const [activeRole, setActiveRole] = useState<RoleSlug | null>(null);
  const [openMobileRole, setOpenMobileRole] = useState<RoleSlug | null>(paths[0]?.role ?? null);

  return (
    <section className="mk-section mk-section--paths" aria-labelledby="mk-paths-title">
      <div className="mk-paths-glow" aria-hidden="true" />
      <div className="mk-container mk-paths-wrap">
        <div className="mk-section-head mk-section-head--lg">
          <span className="mk-eyebrow">{copy.eyebrow}</span>
          <h2 id="mk-paths-title" className="mk-h2">
            {copy.title}
          </h2>
          <p className="mk-lead">{copy.lead}</p>
        </div>

        <div className="mk-paths-layout" onMouseLeave={() => setActiveRole(null)}>
          <div className="mk-paths-intro">
            <div className="mk-paths-count">
              <span className="mk-paths-number">{paths.length}</span>
              <span>
                {copy.career} <strong>{copy.profiles}</strong>
              </span>
            </div>

            <div className="mk-paths-legend" role="group" aria-label={copy.tabs}>
              {paths.map((path) => {
                const isActive = path.role === activeRole;
                return (
                  <button
                    key={path.role}
                    type="button"
                    aria-pressed={isActive}
                    data-active={isActive || undefined}
                    onMouseEnter={() => setActiveRole(path.role)}
                    onFocus={() => setActiveRole(path.role)}
                    onClick={() => setActiveRole(path.role)}
                  >
                    <span className="mk-legend-icon">
                      <PathRoleIcon role={path.role} size={16} />
                    </span>
                    <span className="mk-legend-title">{path.title}</span>
                    <ArrowRight size={14} className="mk-legend-arrow mk-flip-rtl" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tablet and mobile: accordion */}
          <ul className="mk-paths-accordion" aria-label={copy.list}>
            {paths.map((path, index) => {
              const isOpen = openMobileRole === path.role;
              return (
                <li key={path.role} className="mk-path-card" data-open={isOpen || undefined}>
                  <button
                    type="button"
                    onClick={() => setOpenMobileRole(isOpen ? null : path.role)}
                    aria-expanded={isOpen}
                    aria-controls={`mk-path-${path.role}-mobile`}
                  >
                    <span className="mk-path-index">{String(index + 1).padStart(2, "0")}</span>
                    <PathRoleIcon role={path.role} size={20} />
                    <span className="mk-path-heading">
                      <span className="mk-path-name">{path.title}</span>
                      <span className="mk-path-sub">
                        {path.levelLabel} · {path.duration}
                      </span>
                    </span>
                    <ChevronDown size={20} className="mk-path-chevron" aria-hidden="true" />
                  </button>
                  <div id={`mk-path-${path.role}-mobile`} className="mk-path-detail" hidden={!isOpen}>
                    <p className="mk-body">{path.description}</p>
                    <ul className="mk-chip-list">
                      {path.tags.map((tag) => (
                        <li key={tag}>{tag}</li>
                      ))}
                    </ul>
                    <Link href={`/learning-paths#${path.role}`} className="mk-btn mk-btn--primary mk-btn--block">
                      {copy.explore}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop: numbered rows */}
          <ul className="mk-paths-rows" aria-label={copy.list}>
            {paths.map((path, index) => {
              const isActive = path.role === activeRole;
              return (
                <li
                  key={path.role}
                  className="mk-path-row"
                  data-active={isActive || undefined}
                  onMouseEnter={() => setActiveRole(path.role)}
                >
                  <span className="mk-path-bar" aria-hidden="true" />
                  <button
                    type="button"
                    className="mk-path-row-button"
                    onFocus={() => setActiveRole(path.role)}
                    onClick={() => setActiveRole(path.role)}
                    aria-expanded={isActive}
                    aria-controls={`mk-path-${path.role}-detail`}
                  >
                    <span className="mk-path-row-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="mk-path-row-icon">
                      <PathRoleIcon role={path.role} size={20} />
                    </span>
                    <span className="mk-path-row-main">
                      <span className="mk-path-row-top">
                        <span className="mk-path-row-name">{path.title}</span>
                        <span className="mk-path-row-meta">
                          <span className="mk-level" data-level={path.levelKey}>
                            {path.levelLabel}
                          </span>
                          <span className="mk-duration">
                            <Clock size={14} aria-hidden="true" />
                            {path.duration}
                          </span>
                        </span>
                      </span>
                      <ul className="mk-chip-list mk-chip-list--round">
                        {path.tags.map((tag) => (
                          <li key={tag}>{tag}</li>
                        ))}
                      </ul>
                    </span>
                  </button>
                  <div id={`mk-path-${path.role}-detail`} className="mk-path-row-detail">
                    <div>
                      <p className="mk-body">{path.description}</p>
                      <Link href={`/learning-paths#${path.role}`} className="mk-link-arrow mk-link-arrow--sm">
                        {copy.viewFull}
                        <ArrowRight size={14} className="mk-flip-rtl" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mk-help-bar mk-help-bar--tinted">
          <div className="mk-help-lead">
            <span className="mk-help-icon">
              <Compass size={26} aria-hidden="true" />
            </span>
            <div>
              <p className="mk-help-title">{copy.helpTitle}</p>
              <p className="mk-help-text">{copy.helpText}</p>
            </div>
          </div>
          <Link href="/learning-paths" className="mk-btn mk-btn--primary">
            {copy.helpCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
