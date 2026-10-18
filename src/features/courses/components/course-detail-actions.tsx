"use client";

import { useState } from "react";
import { Check, Ellipsis, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function CourseDetailActions({ slug }: { slug: string }) {
  const t = useTranslations("courses");
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function shareCourse() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
      } catch {
        // A dismissed share sheet should not trigger a fallback copy.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard access may be unavailable in insecure contexts.
    }
  }

  return (
    <div className="detail-actions">
      <button type="button" onClick={shareCourse}>
        {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
        <small>{copied ? t("linkCopied") : t("share")}</small>
      </button>
      <span className="visually-hidden" role="status">{copied ? t("linkCopied") : ""}</span>
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
