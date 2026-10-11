"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lightbulb, Search, SearchX } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { roleSlugs, type RoleSlug } from "../../model/course";
import type { CatalogCourse } from "../../lib/catalog-data";
import { formatMessage, type MarketingMessages } from "../../lib/messages";
import { CourseCard } from "./course-card";

type SortKey = keyof MarketingMessages["catalog"]["sort"];
const sortKeys: SortKey[] = ["relevant", "beginner-first", "advanced-first", "shortest-duration", "name"];

function isRoleSlug(value: string | null): value is RoleSlug {
  return roleSlugs.some((slug) => slug === value);
}

function isSortKey(value: string): value is SortKey {
  return sortKeys.some((key) => key === value);
}

type CourseCatalogProps = {
  courses: CatalogCourse[];
  copy: MarketingMessages["catalog"];
  roles: MarketingMessages["roles"];
};

export function CourseCatalog({ courses, copy, roles }: CourseCatalogProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const role: RoleSlug | "all" = isRoleSlug(roleParam) ? roleParam : "all";

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("relevant");
  const searchRef = useRef<HTMLInputElement>(null);

  function setRole(next: RoleSlug | "all") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("role");
    else params.set("role", next);
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  const counts = useMemo(
    () => Object.fromEntries(roleSlugs.map((slug) => [slug, courses.filter((c) => c.roles.includes(slug)).length])),
    [courses],
  );

  const filtered = useMemo(() => {
    let list = role === "all" ? courses : courses.filter((c) => c.roles.includes(role));
    const needle = query.trim().toLowerCase();
    if (needle) list = list.filter((c) => c.searchText.includes(needle));

    const sorted = [...list];
    if (sort === "beginner-first") sorted.sort((a, b) => a.levelRank - b.levelRank);
    else if (sort === "advanced-first") sorted.sort((a, b) => b.levelRank - a.levelRank);
    else if (sort === "shortest-duration")
      sorted.sort((a, b) => (a.durationHours || Infinity) - (b.durationHours || Infinity));
    else if (sort === "name") sorted.sort((a, b) => a.title.localeCompare(b.title));
    return sorted;
  }, [courses, role, query, sort]);

  const resultsLabel =
    filtered.length === 0
      ? copy.noResults
      : formatMessage(locale, copy.results, { n: filtered.length, count: String(filtered.length) });

  function clearFilters() {
    setQuery("");
    setRole("all");
    searchRef.current?.focus();
  }

  const cardLabels = { view: copy.view, preview: copy.preview, certificate: copy.certificate };

  return (
    <div>
      <div className="mk-toolbar">
        <div className="mk-search">
          <Search size={16} aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchLabel}
          />
        </div>
        <label className="mk-sort">
          <span>{copy.sortBy}</span>
          <select
            value={sort}
            onChange={(event) => {
              if (isSortKey(event.target.value)) setSort(event.target.value);
            }}
            aria-label={copy.sortLabel}
          >
            {sortKeys.map((key) => (
              <option key={key} value={key}>
                {copy.sort[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mk-results" aria-live="polite">
        {resultsLabel}
      </p>

      <div className="mk-guide">
        <div className="mk-guide-text">
          <span className="mk-guide-icon">
            <Lightbulb size={16} aria-hidden="true" />
          </span>
          <div>
            <p className="mk-guide-title">{copy.newTitle}</p>
            <p className="mk-body">{copy.newText}</p>
          </div>
        </div>
        <button type="button" className="mk-btn mk-btn--outline mk-btn--sm" onClick={() => setRole("end-user")}>
          {copy.newCta}
        </button>
      </div>

      <div className="mk-catalog-layout">
        <aside className="mk-role-aside">
          <p className="mk-aside-title">{copy.chooseRole}</p>
          <div className="mk-role-list">
            <RoleButton active={role === "all"} onClick={() => setRole("all")} label={copy.allRoles} count={courses.length} />
            {roleSlugs.map((slug) => (
              <RoleButton
                key={slug}
                active={role === slug}
                onClick={() => setRole(slug)}
                label={roles[slug]}
                count={counts[slug] ?? 0}
              />
            ))}
          </div>
        </aside>

        <label className="mk-role-select">
          <span className="mk-aside-title">{copy.chooseRole}</span>
          <select
            value={role}
            onChange={(event) => {
              const value = event.target.value;
              setRole(isRoleSlug(value) ? value : "all");
            }}
            aria-label={copy.filterByRole}
          >
            <option value="all">
              {copy.allRoles} ({courses.length})
            </option>
            {roleSlugs.map((slug) => (
              <option key={slug} value={slug}>
                {roles[slug]} ({counts[slug] ?? 0})
              </option>
            ))}
          </select>
        </label>

        <div>
          {filtered.length === 0 ? (
            <div className="mk-empty">
              <SearchX size={24} aria-hidden="true" />
              <p className="mk-empty-title">{copy.emptyTitle}</p>
              <p className="mk-body">{copy.emptyText}</p>
              <button type="button" className="mk-btn mk-btn--outline mk-btn--sm" onClick={clearFilters}>
                {copy.clear}
              </button>
            </div>
          ) : (
            <div className="mk-card-grid">
              {filtered.map((course) => (
                <CourseCard key={course.slug} course={course} labels={cardLabels} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RoleButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="mk-role-button">
      {label}
      <span>{count}</span>
    </button>
  );
}
