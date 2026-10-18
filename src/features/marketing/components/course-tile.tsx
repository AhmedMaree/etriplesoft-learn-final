import Image from "next/image";
import { ArrowUpRight, Clock, Layers } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CourseTileData } from "../lib/course-tile";
import { contentAttrs } from "../lib/content-lang";

export function CourseTile({ course, actionLabel }: { course: CourseTileData; actionLabel: string }) {
  const content = contentAttrs(course.contentLang);
  return (
    <Link href={`/catalog/${course.slug}`} className="mk-tile" aria-label={course.ariaLabel}>
      <div className="mk-tile-media">
        <Image
          src={course.image}
          alt=""
          fill
          sizes="(max-width: 639px) 85vw, (max-width: 1023px) 45vw, 25vw"
        />
        <div className="mk-tile-flags">
          <span className="mk-tile-level">{course.levelLabel}</span>
          {course.badge && (
            <span className="mk-tile-badge" data-kind={course.badge.kind}>
              {course.badge.label}
            </span>
          )}
        </div>
      </div>

      <div className="mk-tile-body">
        <div className="mk-tile-tag" {...content}>{course.tag}</div>
        <h3 className="mk-tile-title" {...content}>{course.title}</h3>
        <div className="mk-tile-meta">
          <span>
            <Clock size={12} aria-hidden="true" />
            {course.hoursLabel}
          </span>
          <span>
            <Layers size={14} aria-hidden="true" />
            {course.modulesLabel}
          </span>
        </div>

        {course.moduleTags.length > 0 && (
          <ul className="mk-tile-tags" {...content}>
            {course.moduleTags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}

        <div className="mk-tile-foot">
          <div className="mk-tile-instructor" {...content}>
            <span aria-hidden="true">{course.instructorInitials}</span>
            {course.instructorName}
          </div>
          <span className="mk-tile-action">
            {actionLabel}
            <ArrowUpRight size={14} className="mk-flip-rtl" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
