"use client";

import { useEffect, useMemo, useState } from "react";

type NavItem = { id: string; label: string };

export function CourseSectionNav({ items, label }: { items: NavItem[]; label: string }) {
  const [activeId, setActiveId] = useState(items[0]?.id);
  const ids = useMemo(() => items.map((item) => item.id), [items]);

  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-140px 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [ids]);

  return (
    <nav className="mk-section-nav" aria-label={label}>
      <ul className="mk-container">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} data-active={activeId === item.id || undefined} aria-current={activeId === item.id ? "true" : undefined}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
