import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Clock, ListChecks, Star } from "lucide-react";
import { Avatar } from "@/components/shared/profile-avatar";
import type { Course } from "@/features/courses/data/demo-courses";
import { ASSET_BASE } from "@/lib/assets";
import { useTranslations, useFormatter } from "next-intl";

export function CourseCard({
  course,
  index,
  compact = false,
}: {
  course: Course;
  index: number;
  compact?: boolean;
}) {
  const t = useTranslations("courses");
  const format = useFormatter();
  return (
    <article className={`course-card panel ${compact ? "compact" : ""}`}>
      <Link href="/detail-course" className="course-image">
        <Image
          src={ASSET_BASE + course.image}
          alt={course.name}
          fill
          sizes="(max-width: 700px) 100vw, (max-width: 1350px) 50vw, 33vw"
        />
        {index === 0 && <span className="badge">{t("bestseller")}</span>}
      </Link>
      <div className="course-body">
        <h3 dir="ltr">
          <Link href="/detail-course">{course.name}</Link>
        </h3>
        <p dir="ltr">{course.description}</p>
        {!compact && (
          <div className="teacher">
            <Avatar />
            <div>
              <b dir="ltr">{course.teacher}</b>
              <small dir="ltr">{course.role}</small>
            </div>
          </div>
        )}
        <div className="course-meta">
          {!compact && (
            <span>
              <Star className="star" size={16} />
              {course.rating}
            </span>
          )}
          <span>
            <Clock size={15} />
            {course.time}
          </span>
          <span>
            <ListChecks size={15} />
            {format.number(course.lessons, { numberingSystem: "latn" })} {compact ? t("steps") : t("lessons")}
          </span>
          {compact && (
            <span>
              <Star className="star" size={16} />
              {course.rating}
            </span>
          )}
        </div>
        {!compact && (
          <Link
            className={`btn ${index !== 0 ? "outline" : ""}`}
            href="/detail-course"
          >
            {t("viewCourse")} <ArrowRight size={18} />
          </Link>
        )}
      </div>
    </article>
  );
}
