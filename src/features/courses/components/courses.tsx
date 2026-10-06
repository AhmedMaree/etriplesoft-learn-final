"use client";

import { useState } from "react";
import { BookOpen, Sparkles, ChevronRight, GraduationCap, BarChart3, FileText, Flame } from "lucide-react";
import { Button, Panel, Title, IconBox } from "@/components/ui/primitives";
import { Community } from "@/components/shared/community-promo";
import { Paths } from "@/features/learning/components/learning-widgets";
import { courses } from "@/features/courses/data/demo-courses";
import { CourseCard } from "@/features/courses/components/course-card";
import { useTranslations } from "next-intl";

const filters = [
  ["All", "allCourses"],
  ["Functional", "functional"],
  ["Technical", "technical"],
  ["Beginner", "beginner"],
  ["Popular", "popular"],
  ["Newest", "newest"],
] as const;

const sortOptions = [
  ["popular", "mostPopular"],
  ["rating", "highestRated"],
  ["name", "nameSort"],
] as const;

export function Courses({ query }: { query: string }) {
  const t = useTranslations("courses");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("popular");
  let shown = courses.filter(
    (course, index) =>
      (filter === "All" ||
        (filter === "Popular" && index < 4) ||
        (filter === "Newest" && index > 3) ||
        (filter === "Beginner" && [0, 1, 4].includes(index)) ||
        course.category === filter) &&
      course.name.toLowerCase().includes(query.toLowerCase()),
  );

  if (sort === "name") {
    shown = [...shown].sort((a, b) => a.name.localeCompare(b.name));
  }
  if (sort === "rating") {
    shown = [...shown].sort((a, b) => +b.rating - +a.rating);
  }

  return (
    <div className="columns courses-columns">
      <div>
        <div className="filter-bar">
          <div className="pills">
            {filters.map(([value, messageKey]) => (
              <button
                className={filter === value ? "selected" : ""}
                onClick={() => setFilter(value)}
                key={value}
              >
                {t(messageKey)}
              </button>
            ))}
          </div>
          <label className="sort">
            {t("sort")} {" "}
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              {sortOptions.map(([value, messageKey]) => (
                <option key={value} value={value}>{t(messageKey)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="course-grid">
          {shown.map((course) => (
            <CourseCard course={course} index={courses.indexOf(course)} key={course.name} />
          ))}
        </div>
        {!shown.length && (
          <Panel>
            <h3>{t("noCoursesTitle")}</h3>
            <p>{t("trySearchCategory")}</p>
            <Button onClick={() => setFilter("All")}>{t("clearCategory")}</Button>
          </Panel>
        )}
      </div>
      <aside className="right-rail">
        <Panel>
          <Title>{t("categories")}</Title>
          {filters.map(([value, messageKey], index) => (
            <button
              className="category-row"
              onClick={() => setFilter(value)}
              key={value}
            >
              <IconBox
                icon={[BookOpen, BarChart3, FileText, GraduationCap, Flame, Sparkles][index]}
                color={["red", "blue", "purple", "green", "orange", "pink"][index]}
              />
              <span>
                <strong>{t(messageKey)}</strong>
                <small>{[6, 2, 3, 3, 4, 2][index]} {t("courseUnit")}</small>
              </span>
              <ChevronRight size={19} />
            </button>
          ))}
        </Panel>
        <Panel className="rail-paths">
          <Paths />
        </Panel>
        <Community />
      </aside>
    </div>
  );
}
