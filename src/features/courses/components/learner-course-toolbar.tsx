"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { ArrowUpDown, BarChart3, GraduationCap, LayoutGrid, LoaderCircle, Search, X, type LucideIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

/** Delay after the last keystroke before the results refresh. */
const SEARCH_DEBOUNCE_MS = 350;

type LearnerCourseToolbarProps = {
  query: string;
  category: string;
  level: string;
  instructor: string;
  sort: string;
  categories: { value: string; label: string }[];
  levels: { value: string; label: string }[];
  instructors: string[];
  labels: {
    search: string;
    clearSearch: string;
    categories: string;
    levels: string;
    instructors: string;
    sort: string;
    relevance: string;
    newest: string;
  };
};

export function LearnerCourseToolbar({
  query,
  category,
  level,
  instructor,
  sort,
  categories,
  levels,
  instructors,
  labels,
}: LearnerCourseToolbarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);
  // Adopt a query that changed from elsewhere (e.g. a reset link) without clobbering typing
  // when our own, older request lands.
  const [sentQuery, setSentQuery] = useState(query);
  const [seenQuery, setSeenQuery] = useState(query);
  if (query !== seenQuery) {
    setSeenQuery(query);
    if (query !== sentQuery) {
      setSearch(query);
      setSentQuery(query);
    }
  }
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function update(form: HTMLFormElement) {
    if (timer.current) clearTimeout(timer.current);
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const key of ["q", "category", "level", "instructor", "sort", "view"] as const) {
      const value = data.get(key)?.toString().trim();
      if (value) params.set(key, value);
    }
    setSentQuery(params.get("q") ?? "");
    const href = `/courses${params.size ? `?${params}` : ""}`;
    // Replace rather than push so typing does not add a history entry per keystroke.
    startTransition(() => router.replace(href, { scroll: false }));
  }

  function scheduleUpdate() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (formRef.current) update(formRef.current);
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.currentTarget.value;
    setSearch(next);
    // Whitespace-only edits do not change the trimmed query, so skip the round trip.
    if (next.trim() !== search.trim()) scheduleUpdate();
  }

  function clearSearch() {
    setSearch("");
    const form = formRef.current;
    if (!form) return;
    form.q.value = "";
    form.q.focus();
    update(form);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update(event.currentTarget);
  }

  function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const form = event.currentTarget.form;
    if (form) update(form);
  }

  return (
    <form
      ref={formRef}
      className={`learner-course-toolbar${pending ? " is-pending" : ""}`}
      role="search"
      onSubmit={handleSubmit}
      aria-busy={pending}
    >
      <label className="course-search-field">
        {pending ? (
          <LoaderCircle size={19} className="course-search-spinner" aria-hidden="true" />
        ) : (
          <Search size={19} aria-hidden="true" />
        )}
        <span className="sr-only">{labels.search}</span>
        <input
          type="search"
          name="q"
          value={search}
          onChange={handleSearchChange}
          maxLength={100}
          placeholder={labels.search}
          autoComplete="off"
          enterKeyHint="search"
        />
        {search && (
          <button type="button" className="course-search-clear" onClick={clearSearch} aria-label={labels.clearSearch}>
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </label>
      <FilterSelect name="category" icon={LayoutGrid} label={labels.categories} value={category} onChange={handleSelectChange}>
        <option value="">{labels.categories}</option>
        {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </FilterSelect>
      <FilterSelect name="level" icon={BarChart3} label={labels.levels} value={level} onChange={handleSelectChange}>
        <option value="">{labels.levels}</option>
        {levels.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </FilterSelect>
      <FilterSelect
        name="instructor"
        icon={GraduationCap}
        label={labels.instructors}
        value={instructor}
        onChange={handleSelectChange}
        className="instructor-filter"
      >
        <option value="">{labels.instructors}</option>
        {instructors.map((item) => <option key={item} value={item}>{item}</option>)}
      </FilterSelect>
      <FilterSelect
        name="sort"
        icon={ArrowUpDown}
        label={labels.sort}
        value={sort}
        onChange={handleSelectChange}
        className="course-sort-field"
        active={sort !== "relevant"}
      >
        <option value="relevant">{labels.relevance}</option>
        <option value="newest">{labels.newest}</option>
      </FilterSelect>
      <input type="hidden" name="view" value="all" />
    </form>
  );
}

function FilterSelect({
  name,
  icon: Icon,
  label,
  value,
  onChange,
  className,
  active = Boolean(value),
  children,
}: {
  name: string;
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`course-filter-field${className ? ` ${className}` : ""}`} data-active={active || undefined}>
      <Icon size={16} className="course-filter-icon" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select name={name} defaultValue={value} onChange={onChange}>
        {children}
      </select>
    </label>
  );
}
