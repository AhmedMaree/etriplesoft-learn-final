"use client";

import { useState } from "react";
import { Bookmark, Ellipsis, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function CourseDetailActions({ slug }: { slug: string }) {
  const t = useTranslations("courses");
  const [saved, setSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function toggleSaved() {
    setSaved(!saved);
  }

  async function shareCourse() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch {
        // A dismissed share sheet should not trigger a fallback copy.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard access may be unavailable in insecure contexts.
    }
  }

  return (
    <div className="detail-actions">
      <button type="button" aria-pressed={saved} onClick={toggleSaved}>
        <Bookmark fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        <small>{saved ? t("saved") : t("save")}</small>
      </button>
      <button type="button" onClick={shareCourse}>
        <Share2 aria-hidden="true" />
        <small>{t("share")}</small>
      </button>
      <div className="course-more-wrap">
        <button
          type="button"
          aria-label={t("moreCourseActions")}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Ellipsis aria-hidden="true" />
        </button>
        {menuOpen && (
          <div className="course-more-menu" role="menu">
            <Link role="menuitem" href={`/catalog/${slug}`} onClick={() => setMenuOpen(false)}>{t("publicCoursePage")}</Link>
            <Link role="menuitem" href="/courses" onClick={() => setMenuOpen(false)}>{t("allCourses")}</Link>
          </div>
        )}
      </div>
    </div>
  );
}
