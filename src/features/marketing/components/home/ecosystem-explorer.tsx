"use client";

import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ModuleIcon } from "../module-icon";
import type { ModuleAccent, ModuleIconKey } from "../../data/odoo-modules";
import type { MarketingMessages } from "../../lib/messages";

export type ExplorerModule = {
  slug: string;
  name: string;
  shortDescription: string;
  icon: ModuleIconKey;
  accent: ModuleAccent;
  workflow: string[];
  skills: string[];
  relatedRole: string | null;
  featuredCourse: { slug: string; title: string } | null;
};

type EcosystemExplorerProps = {
  modules: ExplorerModule[];
  copy: MarketingMessages["home"]["ecosystem"];
  /** Pre-formatted "{name} Module" titles keyed by module slug. */
  titles: Record<string, string>;
};

const DEFAULT_MODULE_SLUG = "sales";

function ModuleDetails({
  mod,
  copy,
  title,
  mobile = false,
  revealed = true,
}: {
  mod: ExplorerModule;
  copy: EcosystemExplorerProps["copy"];
  title: string;
  mobile?: boolean;
  revealed?: boolean;
}) {
  const course = mod.featuredCourse;
  return (
    <div className="mk-eco-details" data-mobile={mobile || undefined} data-accent={mod.accent}>
      {!mobile && (
        <div className="mk-eco-details-head">
          <span className="mk-eco-icon mk-eco-icon--lg">
            <ModuleIcon icon={mod.icon} size={26} />
          </span>
          <div>
            <h3>{title}</h3>
            <p dir="auto">{mod.shortDescription}</p>
          </div>
        </div>
      )}

      <div className="mk-eco-block">
        <p className="mk-eco-label">{copy.workflow}</p>
        <ol className="mk-eco-flow" dir="auto">
          {mod.workflow.map((step, index) => (
            <li key={step}>
              <span>{step}</span>
              {index < mod.workflow.length - 1 && <ArrowRight size={14} className="mk-flip-rtl" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </div>

      <div className="mk-eco-block">
        <p className="mk-eco-label">{copy.skills}</p>
        <ul className="mk-eco-skills" dir="auto">
          {mod.skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      </div>

      <div className="mk-eco-facts">
        <div>
          <p className="mk-eco-label">{copy.relatedPath}</p>
          <p className="mk-eco-fact" dir="auto">{mod.relatedRole ?? "—"}</p>
        </div>
        <div>
          <p className="mk-eco-label">{copy.featuredCourse}</p>
          <p className="mk-eco-fact" dir="auto">{course?.title ?? copy.comingSoon}</p>
        </div>
      </div>

      <Link
        href={course ? `/catalog/${course.slug}` : "/catalog"}
        tabIndex={mobile && !revealed ? -1 : undefined}
        className="mk-eco-cta"
      >
        {course ? copy.viewCourse : copy.exploreCourses}
        <ArrowRight size={16} className="mk-flip-rtl" aria-hidden="true" />
      </Link>
    </div>
  );
}

export function EcosystemExplorer({ modules, copy, titles }: EcosystemExplorerProps) {
  const [selectedSlug, setSelectedSlug] = useState(DEFAULT_MODULE_SLUG);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const selected = modules.find((mod) => mod.slug === selectedSlug) ?? modules[0];
  if (!selected) return null;

  return (
    <div className="mk-eco">
      <div>
        {/* Tablet and mobile: accordion */}
        <ul className="mk-eco-accordion" aria-label={copy.list}>
          {modules.map((mod) => {
            const isExpanded = expandedSlug === mod.slug;
            const detailsId = `mk-eco-mobile-${mod.slug}`;
            return (
              <li key={mod.slug} className="mk-eco-item" data-expanded={isExpanded || undefined} data-accent={mod.accent}>
                <button
                  type="button"
                  onClick={() => {
                    setExpandedSlug(isExpanded ? null : mod.slug);
                    setSelectedSlug(mod.slug);
                  }}
                  aria-expanded={isExpanded}
                  aria-controls={detailsId}
                >
                  <span className="mk-eco-icon">
                    <ModuleIcon icon={mod.icon} size={22} />
                  </span>
                  <span className="mk-eco-item-text">
                    <span className="mk-eco-item-name" dir="auto">{mod.name}</span>
                    <span className="mk-eco-item-desc" dir="auto">{mod.shortDescription}</span>
                  </span>
                  <span className="mk-eco-plus" aria-hidden="true">
                    <Plus size={16} />
                  </span>
                </button>
                <div id={detailsId} className="mk-eco-collapse" aria-hidden={!isExpanded} inert={!isExpanded}>
                  <div>
                    <ModuleDetails mod={mod} copy={copy} title={titles[mod.slug] ?? mod.name} mobile revealed={isExpanded} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Desktop: selector grid */}
        <div className="mk-eco-grid" role="group" aria-label={copy.list}>
          {modules.map((mod) => {
            const isSelected = mod.slug === selected.slug;
            return (
              <button
                key={mod.slug}
                type="button"
                className="mk-eco-card"
                data-accent={mod.accent}
                data-selected={isSelected || undefined}
                aria-pressed={isSelected}
                onClick={() => setSelectedSlug(mod.slug)}
              >
                <span className="mk-eco-icon">
                  <ModuleIcon icon={mod.icon} size={20} />
                </span>
                <span className="mk-eco-card-name" dir="auto">{mod.name}</span>
                <span className="mk-eco-card-desc" dir="auto">{mod.shortDescription}</span>
              </button>
            );
          })}
        </div>

        <div className="mk-eco-intro">
          <p>{copy.intro}</p>
          <ul>
            <li data-dot="primary">{copy.coreModules}</li>
            <li data-dot="secondary">{copy.workflowMapping}</li>
            <li data-dot="tertiary">{copy.handsOn}</li>
          </ul>
        </div>
      </div>

      <div className="mk-eco-panel" data-accent={selected.accent} role="region" aria-live="polite" aria-label={copy.details}>
        <div className="mk-eco-panel-bar" aria-hidden="true" />
        <ModuleDetails mod={selected} copy={copy} title={titles[selected.slug] ?? selected.name} />
      </div>
    </div>
  );
}
