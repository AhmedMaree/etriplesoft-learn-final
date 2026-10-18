"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, FileText, ListChecks, Lock, Paperclip, CirclePlay } from "lucide-react";
import { Link } from "@/i18n/navigation";

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

export type ModuleLesson = {
  id: string;
  title: string;
  preview: boolean;
  previewLabel: string;
  type: "video" | "article" | "assessment" | "resource" | string;
  typeLabel: string;
  duration: string | null;
  href: string | null;
  lockedLabel: string;
};

export type ModuleGroup = {
  id: string;
  title: string;
  meta: string;
  lessons: ModuleLesson[];
};

const LESSON_ICONS: Record<string, typeof CirclePlay> = {
  video: CirclePlay,
  article: FileText,
  assessment: ListChecks,
  resource: Paperclip,
};

/** Collapsible module list with lesson type, duration and access state; the first module starts open. */
export function CourseContentList({ modules, expandLabel, collapseLabel, summary }: { modules: ModuleGroup[]; expandLabel: string; collapseLabel: string; summary?: string }) {
  const [open, setOpen] = useState<string[]>(modules[0] ? [modules[0].id] : []);
  const allOpen = open.length === modules.length;
  return (
    <div className="cd-curriculum">
      <div className="cd-curriculum-bar">
        {summary && <span>{summary}</span>}
        <button type="button" className="text-link content-toggle" onClick={() => setOpen(allOpen ? [] : modules.map((module) => module.id))}>
          {allOpen ? collapseLabel : expandLabel}
        </button>
      </div>
      {modules.map((module, index) => {
        const expanded = open.includes(module.id);
        const panelId = `cd-module-${module.id}`;
        return (
          <section key={module.id} className={`cd-module ${expanded ? "open" : ""}`}>
            <button
              type="button"
              className="cd-module-head"
              aria-expanded={expanded}
              aria-controls={panelId}
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
              <ol className="cd-lessons" id={panelId}>
                {module.lessons.map((lesson) => {
                  const Icon = LESSON_ICONS[lesson.type] ?? FileText;
                  return (
                    <li key={lesson.id}>
                      <Icon className="cd-lesson-type" size={18} aria-label={lesson.typeLabel} />
                      {lesson.href ? (
                        <Link className="cd-lesson-title" href={lesson.href} dir="auto">{lesson.title}</Link>
                      ) : (
                        <span className="cd-lesson-title" dir="auto">{lesson.title}</span>
                      )}
                      {lesson.preview && <em className="cd-preview">{lesson.previewLabel}</em>}
                      {lesson.duration && <span className="cd-lesson-time">{lesson.duration}</span>}
                      {!lesson.href && <Lock className="cd-lesson-lock" size={15} aria-label={lesson.lockedLabel} />}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
