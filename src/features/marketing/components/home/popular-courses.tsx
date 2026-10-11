"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CourseTile } from "../course-tile";
import type { CourseTileData } from "../../lib/course-tile";
import { roleSlugs, type RoleSlug } from "../../model/course";
import type { MarketingMessages } from "../../lib/messages";

type PopularCoursesProps = {
  courses: CourseTileData[];
  copy: MarketingMessages["home"]["courses"];
  roles: MarketingMessages["roles"];
};

export function PopularCourses({ courses, copy, roles }: PopularCoursesProps) {
  const [role, setRole] = useState<RoleSlug | "all">("all");
  const [edges, setEdges] = useState({ start: true, end: false });
  const trackRef = useRef<HTMLUListElement>(null);

  const visible = role === "all" ? courses : courses.filter((course) => course.roles.includes(role));

  const updateEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const offset = Math.abs(track.scrollLeft);
    setEdges({ start: offset < 2, end: offset + track.clientWidth >= track.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: 0 });
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(track);
    return () => observer.disconnect();
  }, [role, updateEdges]);

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("li");
    const step = (card?.getBoundingClientRect().width ?? track.clientWidth) + 24;
    const rtl = getComputedStyle(track).direction === "rtl";
    track.scrollBy({ left: direction * step * (rtl ? -1 : 1), behavior: "smooth" });
  }

  if (courses.length === 0) return null;

  return (
    <section className="mk-section mk-section--courses" aria-labelledby="mk-courses-title">
      <div className="mk-container">
        <div className="mk-section-head mk-section-head--row">
          <div className="mk-section-head-text">
            <span className="mk-eyebrow mk-eyebrow--neutral">{copy.eyebrow}</span>
            <h2 id="mk-courses-title" className="mk-h2 mk-h2--md">
              {copy.title}
            </h2>
            <p className="mk-body">{copy.lead}</p>
          </div>
          <Link href="/catalog" className="mk-link-arrow">
            {copy.browseAll}
            <ArrowUpRight size={16} className="mk-flip-rtl" aria-hidden="true" />
          </Link>
        </div>

        <div className="mk-tabs-bar">
          <div className="mk-tabs" role="group" aria-label={copy.filterLabel}>
            <button type="button" aria-pressed={role === "all"} onClick={() => setRole("all")}>
              {copy.all}
            </button>
            {roleSlugs.map((slug) => (
              <button key={slug} type="button" aria-pressed={role === slug} onClick={() => setRole(slug)}>
                {roles[slug]}
              </button>
            ))}
          </div>

          <div className="mk-carousel-buttons">
            <button type="button" onClick={() => scrollByCard(-1)} disabled={edges.start} aria-label={copy.previous}>
              <ChevronLeft size={16} className="mk-flip-rtl" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => scrollByCard(1)} disabled={edges.end} aria-label={copy.next}>
              <ChevronRight size={16} className="mk-flip-rtl" aria-hidden="true" />
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="mk-empty">
            <p className="mk-empty-title">{copy.emptyTitle}</p>
            <p className="mk-body">{copy.emptyHint}</p>
            <button type="button" className="mk-btn mk-btn--outline mk-btn--sm" onClick={() => setRole("all")}>
              {copy.showAll}
            </button>
          </div>
        ) : (
          <>
            <ul
              ref={trackRef}
              className="mk-carousel"
              onScroll={updateEdges}
              aria-label={copy.carousel}
              tabIndex={0}
            >
              {visible.map((course) => (
                <li key={course.slug}>
                  <CourseTile course={course} actionLabel={copy.view} />
                </li>
              ))}
            </ul>
            <Link href="/catalog" className="mk-btn mk-btn--outline mk-btn--block mk-carousel-more">
              {copy.exploreAll}
              <ArrowUpRight size={16} className="mk-flip-rtl" aria-hidden="true" />
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
