import Image from "next/image";
import { ArrowRight, Award } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CatalogCourse } from "../../lib/catalog-data";
import { EN } from "../../lib/content-lang";

type CourseCardProps = {
  course: CatalogCourse;
  labels: { view: string; preview: string; certificate: string };
};

const FALLBACK_IMAGE = "/marketing/all-courses-image.png";

export function CourseCard({ course, labels }: CourseCardProps) {
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
        <div className="mk-card-meta" {...EN}>
          {course.track} &middot; {course.levelText} &middot; {course.durationLabel}
        </div>
        <h3 className="mk-card-title" {...EN}>{course.title}</h3>
        <p className="mk-card-text" {...EN}>{course.tagline}</p>

        <div className="mk-card-foot">
          <span className="mk-card-action">
            {course.comingSoon ? labels.preview : labels.view}
            <ArrowRight size={16} className="mk-flip-rtl" aria-hidden="true" />
          </span>
          {course.certificate && (
            <span className="mk-card-cert">
              <Award size={16} aria-hidden="true" />
              {labels.certificate}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
