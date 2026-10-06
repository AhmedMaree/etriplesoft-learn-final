"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpen, Settings, ChevronDown, ArrowRight, BarChart3, Clock, ListChecks, Star, Play, Share2, Bookmark, Check, CreditCard, X, Volume2, Maximize } from "lucide-react";
import { Button, Panel, Title, Progress } from "@/components/ui/primitives";
import { Field } from "@/components/ui/field";
import { Avatar } from "@/components/shared/profile-avatar";
import { ProgressPanel } from "@/features/learning/components/learning-widgets";
import { useDemoToast } from "@/lib/browser/demo-toast";
import { useDemoNavigation } from "@/hooks/use-demo-navigation";
import { ASSET_BASE } from "@/lib/assets";
import { featuredCourse, lessonNames } from "@/features/courses/data/demo-courses";
import { useTranslations } from "next-intl";

export function CourseDetail() {
  const t = useTranslations("courses");
  const navigate = useDemoNavigation();
  const notify = useDemoToast();

  const [tab, setTab] = useState("Overview");
  const tabLabels: Record<string, string> = {
    Overview: t("overviewTab"), Curriculum: t("curriculumTab"),
    "Reviews (1.2K)": t("tabReviewsCount"), "Q&A (126)": t("tabQuestionsCount"),
    Resources: t("resourcesTab"),
  };
  const [expanded, setExpanded] = useState<number[]>([]);
  const [saved, setSaved] = useState(false);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="columns detail-columns">
      <div className="primary">
        <div className="detail-heading">
          <span className="badge">{t("bestseller")}</span>
          <div className="detail-actions">
            <button
              onClick={() => {
                setSaved(!saved);
                notify(
                  saved
                    ? t("removedToast")
                    : t("savedToast"),
                );
              }}
            >
              <Bookmark fill={saved ? "#06f" : "none"} />
              <small>{saved ? t("saved") : t("save")}</small>
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(location.href);
                notify(t("copiedToast"));
              }}
            >
              <Share2 />
              <small>{t("share")}</small>
            </button>
            <button onClick={() => navigate("payment")}>
              <CreditCard />
              <small>{t("enrollNow")}</small>
            </button>
          </div>
          <h1>{featuredCourse.name}</h1>
          <p>
            A practical, hands-on introduction to Odoo ERP with real-world
            examples.
          </p>
          <div className="detail-meta">
            <span>
              <Star className="star" /> <b>{featuredCourse.rating}</b> <small>(1.2K reviews)</small>
            </span>
            <span>
              <Clock />
              {featuredCourse.time}
            </span>
            <span>
              <ListChecks />
              {featuredCourse.lessons} Lessons
            </span>
            <span>
              <BarChart3 color="#009e70" />
              {featuredCourse.category}
            </span>
          </div>
        </div>
        <div className="video-poster">
          <Image
            src={ASSET_BASE + "learner-hero.png"}
            alt="Course instructor demonstrating Odoo"
            width={1536}
            height={1024}
            sizes="(max-width: 900px) 100vw, 50vw"
            loading="eager"
          />
          <div className="video-copy">
            <h2>
              Master Odoo
              <br />
              <span>
                Build Real Skills
                <br />
                for Real Business.
              </span>
            </h2>
            <p>
              <Check />
              Hands-on Learning
            </p>
            <p>
              <Check />
              Real-World Examples
            </p>
            <p>
              <Check />
              Career-Ready Skills
            </p>
          </div>
          <button
            className="big-play"
            aria-label="Play course preview"
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <X /> : <Play fill="white" />}
          </button>
          {playing && (
            <div className="video-notice">
              <b>{t("preview")}</b>
              <p>{t("previewUnavailable")}</p>
              <Button
                onClick={() => {
                  setPlaying(false);
                  setTab("Curriculum");
                }}
              >
                {t("exploreCurriculum")} <ArrowRight size={16} />
              </Button>
            </div>
          )}
          <div className="video-controls">
            <button aria-label="Play" onClick={() => setPlaying(!playing)}>
              <Play fill="white" size={20} />
            </button>
            <Progress value={22} />
            <span>0:00 / 30:45</span>
            <Volume2 size={21} />
            <span>á´„á´„</span>
            <Settings size={21} />
            <Maximize size={20} />
          </div>
        </div>
        <div className="instructor-row">
          <Avatar />
          <div>
            <h3>{featuredCourse.teacher}</h3>
            <p>{featuredCourse.role}</p>
          </div>
          <div className="detail-meta">
            <span>
              <Star className="star" />
              {featuredCourse.rating}
            </span>
            <span>
              <Clock color="#c3484c" />
              {featuredCourse.time}
            </span>
            <span>
              <BookOpen color="#c3484c" />
              {featuredCourse.lessons} Lessons
            </span>
          </div>
        </div>
        <Panel className="course-tabs">
          <div className="tabs">
            {[
              "Overview",
              "Curriculum",
              "Reviews (1.2K)",
              "Q&A (126)",
              "Resources",
            ].map((tabName) => (
              <button
                className={tab === tabName ? "selected" : ""}
                onClick={() => setTab(tabName)}
                key={tabName}
              >
                {tabLabels[tabName]}
              </button>
            ))}
          </div>
          <div className="tab-content">
            {tab === "Overview" ? (
              <>
                <h2>{t("aboutCourse")}</h2>
                <p>
                  This crash course gives you a practical, hands-on introduction
                  to Odoo ERP. Learn the core concepts of ERP and understand how
                  Odoo integrates different business functions into one powerful
                  system.
                </p>
                <p>
                  You’ll explore Accounting, CRM, Sales, Purchase, and Inventory
                  through real-world examples and guided demonstrations from
                  etriple.odoo.com.
                </p>
                <p>
                  By the end of this course, you’ll be able to configure key
                  modules, run essential business processes, work through a
                  complete business case, and complete a final assessment to
                  validate your learning.
                </p>
                <div className="tags">
                  {[
                    "Odoo",
                    "ERP",
                    "Accounting",
                    "CRM",
                    "Sales",
                    "Purchase",
                    "Inventory",
                    "Business Case",
                  ].map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </>
            ) : tab === "Curriculum" ? (
              <>
                <h2>{t("courseCurriculum")}</h2>
                {lessonNames.map((l, i) => (
                  <button
                    className="quick-link"
                    key={l}
                    onClick={() =>
                      i === 4
                        ? navigate("assessment")
                        : notify(t("lessonSelected", { lesson: l }))
                    }
                  >
                    <span>
                      {i + 1}. {l}
                    </span>
                    <ArrowRight size={17} />
                  </button>
                ))}
              </>
            ) : tab.startsWith("Reviews") ? (
              <>
                <h2>{t("learnerReviews")}</h2>
                <p>
                  <Star className="star" size={18} /> 4.7 {t("averageRating")}
                  Â· 1.2K reviews
                </p>
                <p>
                  {t("reviewsPlaceholder")}
                </p>
              </>
            ) : tab.startsWith("Q&A") ? (
              <>
                <h2>{t("courseQuestions")}</h2>
                <Field
                  label={t("askQuestion")}
                  placeholder={t("questionPlaceholder")}
                />
                <Button onClick={() => navigate("ai-page")}>
                  {t("askAi")} <ArrowRight size={18} />
                </Button>
              </>
            ) : (
              <>
                <h2>{t("courseResources")}</h2>
                <p>
                  {t("resourcesCopy")}
                </p>
                <Button onClick={() => navigate("assessment")}>
                  {t("takeAssessment")} <ArrowRight size={18} />
                </Button>
              </>
            )}
          </div>
        </Panel>
      </div>
      <aside className="right-rail">
        <ProgressPanel completed={3} />
        <Panel>
          <Title
            link={expanded.length === 5 ? t("collapseAll") : t("expandAll")}
            onClick={() =>
              setExpanded(expanded.length === 5 ? [] : [0, 1, 2, 3, 4])
            }
          >
            Course Content
          </Title>
          {lessonNames.map((l, i) => (
            <div key={l}>
              <button
                className={"curriculum-row " + (i === 0 ? "current" : "")}
                onClick={() =>
                  setExpanded(
                    expanded.includes(i)
                      ? expanded.filter((x) => x !== i)
                      : [...expanded, i],
                  )
                }
              >
                <b>{i + 1}</b>
                <span>
                  <strong>{l}</strong>
                  <small>
                    {["45 min", "1h 30m", "2h 12m", "1h 8m", "45 min"][i]}
                  </small>
                </span>
                <ChevronDown size={18} />
              </button>
              {expanded.includes(i) && (
                <div className="lesson-expanded">
                  <button
                    className="text-link"
                    onClick={() =>
                      i === 4
                        ? navigate("assessment")
                        : notify(t("lessonSelected", { lesson: l }))
                    }
                  >
                    <Play size={15} />
                    {i === 4 ? t("startAssessment") : t("openLesson")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </Panel>
        <Panel className="ai-small">
          <Title>
            {t("courseAi")} <b className="badge">New</b>
          </Title>
          <p>{t("courseContext")}</p>
          <div className="course-ai">
            <Image
              src={ASSET_BASE + "ai-character.png"}
              alt="AI assistant"
              width={512}
              height={512}
            />
            <div>
              {[
                "What is ERP?",
                "Explain the Accounting module",
                "Summarize this lesson",
                "Give me practice questions",
              ].map((t) => (
                <button onClick={() => navigate("ai-page")} key={t}>
                  {t}
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          </div>
          <Button outline onClick={() => navigate("ai-page")}>
            Ask anything about this course... <ArrowRight size={18} />
          </Button>
        </Panel>
      </aside>
    </div>
  );
}
