import Image from "next/image";
import { ArrowRight, Award, Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CatalogCourse } from "../../lib/catalog-data";
import { contentAttrs } from "../../lib/content-lang";

type CourseCardProps = {
  course: CatalogCourse;
  labels: { view: string; preview: string; certificate: string };
};

const FALLBACK_IMAGE = "/marketing/all-courses-image.png";

export function CourseCard({ course, labels }: CourseCardProps) {
  const content = contentAttrs(course.contentLang);
  return (
    <Link href={`/catalog/${course.slug}`} className="mk-card">
      <div className="mk-card-media">
        <Image
          src={course.image || FALLBACK_IMAGE}
          alt=""
          fill
          sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw"
        />
        {course.badge && (
          <span className="mk-card-badge">
            <span className="mk-badge" data-kind={course.badge.kind}>
              {course.badge.label}
            </span>
          </span>
        )}
      </div>

      <div className="mk-card-body">
        <div className="mk-card-meta" {...content}>
          {course.track}
        </div>
        <h3 className="mk-card-title" {...content}>{course.title}</h3>
        <div className="mk-card-chips" {...content}>
          <span className="mk-card-chip" data-level={course.levelRank}>
            {course.levelText}
          </span>
          <span className="mk-card-chip">
            <Clock size={13} aria-hidden="true" />
            {course.durationLabel}
          </span>
        </div>
        <p className="mk-card-text" {...content}>{course.tagline}</p>

        <div className="mk-card-foot">
          <span className="mk-card-action">
            {course.comingSoon ? labels.preview : labels.view}
            <ArrowRight size={16} className="mk-flip-rtl" aria-hidden="true" />
          </span>
          {course.certificate && (
            <span className="mk-card-cert">
              <Award size={14} aria-hidden="true" />
              {labels.certificate}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
