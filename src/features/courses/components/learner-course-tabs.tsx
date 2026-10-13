"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type CourseTab = { id: string; label: string; content: ReactNode };

/** Overview / Curriculum tabs for the in-page course detail. Content is rendered on the server. */
export function LearnerCourseTabs({ tabs }: { tabs: CourseTab[] }) {
  const base = useId();
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  return (
    <section className="panel course-tabs">
      <div className="tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${base}-${tab.id}`}
            aria-selected={tab.id === current?.id}
            aria-controls={`${base}-panel`}
            className={tab.id === current?.id ? "selected" : ""}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content" role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-${current?.id}`}>
        {current?.content}
      </div>
    </section>
  );
}

export type ModuleGroup = {
  id: string;
  title: string;
  meta: string;
  lessons: { id: string; title: string; preview: boolean; previewLabel: string }[];
};

/** Collapsible module list for the right rail; the first module starts open. */
export function CourseContentList({ modules, expandLabel, collapseLabel }: { modules: ModuleGroup[]; expandLabel: string; collapseLabel: string }) {
  const [open, setOpen] = useState<string[]>(modules[0] ? [modules[0].id] : []);
  const allOpen = open.length === modules.length;
  return (
    <>
      <button type="button" className="text-link content-toggle" onClick={() => setOpen(allOpen ? [] : modules.map((module) => module.id))}>
        {allOpen ? collapseLabel : expandLabel}
      </button>
      {modules.map((module, index) => {
        const expanded = open.includes(module.id);
        return (
          <div key={module.id}>
            <button
              type="button"
              className={`curriculum-row ${index === 0 ? "current" : ""}`}
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? open.filter((id) => id !== module.id) : [...open, module.id])}
            >
              <b>{index + 1}</b>
              <span>
                <strong dir="auto">{module.title}</strong>
                <small>{module.meta}</small>
              </span>
              <ChevronDown size={18} aria-hidden="true" />
            </button>
            {expanded && (
              <ul className="lesson-expanded lesson-list">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <span dir="auto">{lesson.title}</span>
                    {lesson.preview && <em className="badge">{lesson.previewLabel}</em>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </>
  );
}
