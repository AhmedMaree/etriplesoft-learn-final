"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CurriculumModule } from "../../model/course";
import { EN } from "../../lib/content-lang";

type CurriculumProps = {
  modules: CurriculumModule[];
  notice?: string;
  title: string;
  countLabel: string;
};

export function CourseCurriculum({ modules, notice, title, countLabel }: CurriculumProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(modules[0] ? [modules[0].number] : []));

  if (modules.length === 0) return null;

  function toggle(number: string) {
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }

  return (
    <div id="curriculum" className="mk-anchor">
      <h2 className="mk-h2-sm">{title}</h2>
      <p className="mk-body mk-count">{countLabel}</p>
      {notice && <div className="mk-notice" {...EN}>{notice}</div>}

      <div className="mk-curriculum">
        {modules.map((mod) => {
          const isOpen = open.has(mod.number);
          const panelId = `mk-curriculum-panel-${mod.number}`;
          return (
            <div key={mod.number} className="mk-curriculum-item">
              <h3>
                <button type="button" onClick={() => toggle(mod.number)} aria-expanded={isOpen} aria-controls={panelId}>
                  <span className="mk-curriculum-title" {...EN}>
                    <span className="mk-curriculum-number">{mod.number}</span>
                    {mod.title}
                  </span>
                  <ChevronDown size={20} data-open={isOpen || undefined} aria-hidden="true" />
                </button>
              </h3>
              {isOpen && (
                <div id={panelId} className="mk-curriculum-panel" {...EN}>
                  <p className="mk-body">{mod.description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
