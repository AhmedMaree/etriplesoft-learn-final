import Image from "next/image";
import { ArrowRight, GraduationCap } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import type { CatalogCourse } from "@/features/courses/server/course-repository";

export function DatabaseCourses({
  courses,
  locale,
  labels,
}: {
  courses: CatalogCourse[];
  locale: Locale;
  labels: { view: string; instructor: string; noCourses: string; category: (value: string) => string; level: (value: string | null) => string | null };
}) {
  if (courses.length === 0) {
    return <div className="panel"><h2>{labels.noCourses}</h2></div>;
  }

  return (
    <div className="course-grid">
      {courses.map((course, index) => (
        <article className="course-card panel" key={course.id}>
          <Link href={`/catalog/${course.slug}`} className="course-image" tabIndex={-1} aria-hidden="true">
            <Image src="/marketing/all-courses-image.png" alt="" fill loading={index === 0 ? "eager" : "lazy"} sizes="(max-width: 700px) 100vw, (max-width: 1350px) 50vw, 33vw" />
          </Link>
          <div className="course-body">
            <h2 dir="auto"><Link href={`/catalog/${course.slug}`}>{course.title}</Link></h2>
            <p dir="auto">{course.summary}</p>
            {(course.category || course.level) && (
              <div className="course-meta" dir={locale === "ar" ? "rtl" : "ltr"}>
                {course.category && <span>{labels.category(course.category)}</span>}
                {course.level && <span>{labels.level(course.level)}</span>}
              </div>
            )}
            {course.instructors.length > 0 && (
              <p dir="auto"><GraduationCap size={16} aria-hidden="true" /> {labels.instructor}: {course.instructors.join(", ")}</p>
            )}
            <Link className="btn outline" href={`/catalog/${course.slug}`}>
              {labels.view}<ArrowRight size={18} className="mk-flip-rtl" />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export function DatabaseCoursesError({ message }: { message: string }) {
  return <div className="panel" role="alert"><p>{message}</p></div>;
}
