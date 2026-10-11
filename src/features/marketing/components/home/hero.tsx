import { ArrowRight, CheckCircle2, Layers, Lock, Pause, Play, PlayCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getMarketing } from "../../lib/get-marketing";
import type { MarketingMessages } from "../../lib/messages";

type LessonState = "done" | "active" | "locked";
const lessonStates: LessonState[] = ["done", "active", "locked", "locked", "locked"];

function LessonIcon({ state, size }: { state: LessonState; size: number }) {
  if (state === "done") return <CheckCircle2 size={size} aria-hidden="true" />;
  if (state === "active") return <PlayCircle size={size} aria-hidden="true" />;
  return <Lock size={size} aria-hidden="true" />;
}

function LessonList({ lessons, size }: { lessons: readonly string[]; size: number }) {
  return (
    <ul className="mk-mock-lessons">
      {lessons.map((label, index) => {
        const state = lessonStates[index] ?? "locked";
        return (
          <li key={label} className="mk-mock-lesson" data-state={state}>
            <LessonIcon state={state} size={size} />
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function KnowledgeCheck({ mock, compact = false }: { mock: MarketingMessages["home"]["hero"]["mockup"]; compact?: boolean }) {
  return (
    <div className="mk-mock-quiz" data-compact={compact || undefined}>
      <div className="mk-mock-quiz-head">
        <span className="mk-mock-quiz-icon" aria-hidden="true">
          ?
        </span>
        <div>
          <div className="mk-mock-quiz-title">{mock.knowledgeCheck}</div>
          <div className="mk-mock-quiz-topic">{mock.knowledgeTopic}</div>
        </div>
        {compact && <span className="mk-mock-quiz-percent">75%</span>}
      </div>
      <div className="mk-mock-bar">
        <span className="mk-mock-bar-fill" />
      </div>
      {!compact && <div className="mk-mock-quiz-done">{mock.completed}</div>}
    </div>
  );
}

function ModuleActive({ mock }: { mock: MarketingMessages["home"]["hero"]["mockup"] }) {
  return (
    <div className="mk-mock-module">
      <span className="mk-mock-module-icon" aria-hidden="true">
        <Layers size={20} />
      </span>
      <div>
        <div className="mk-mock-module-title">{mock.moduleActive}</div>
        <div className="mk-mock-module-sub">{mock.moduleConnected}</div>
      </div>
    </div>
  );
}

export async function Hero() {
  const { m } = await getMarketing();
  const hero = m.home.hero;
  const mock = hero.mockup;

  return (
    <section className="mk-hero" aria-labelledby="mk-hero-title">
      <div className="mk-container mk-hero-grid">
        <div className="mk-hero-copy">
          <h1 id="mk-hero-title" className="mk-hero-title">
            {hero.titleLead}
            <br />
            {hero.titleTail} <span className="mk-accent">{hero.titleAccent}</span>.
          </h1>
          <p className="mk-lead mk-hero-lead">{hero.lead}</p>
          <p className="mk-hero-benefits">{hero.benefits}</p>
          <div className="mk-hero-actions">
            <Link href="/catalog" className="mk-btn mk-btn--primary">
              {hero.explore}
              <ArrowRight size={18} className="mk-flip-rtl" aria-hidden="true" />
            </Link>
            <Link href="/learning-paths" className="mk-btn mk-btn--outline">
              {hero.paths}
            </Link>
          </div>
        </div>

        {/* Decorative course-player preview (desktop) */}
        <div className="mk-mock-desktop" role="img" aria-label={mock.previewLabel}>
          <div className="mk-mock-glow" aria-hidden="true" />
          <div className="mk-mock-window">
            <div className="mk-mock-chrome">
              <span className="mk-mock-dots">
                <i />
                <i />
                <i />
              </span>
              <span className="mk-mock-url" />
            </div>
            <div className="mk-mock-body">
              <div className="mk-mock-side">
                <div>
                  <div className="mk-mock-kicker">{mock.course}</div>
                  <div className="mk-mock-course">{mock.courseName}</div>
                </div>
                <div>
                  <div className="mk-mock-section">{mock.section}</div>
                  <LessonList lessons={mock.lessons} size={16} />
                </div>
              </div>
              <div className="mk-mock-main">
                <div className="mk-mock-lesson-title">{mock.lessonTitle}</div>
                <div className="mk-mock-video">
                  <span className="mk-mock-play">
                    <Play size={24} fill="currentColor" aria-hidden="true" />
                  </span>
                  <div className="mk-mock-controls">
                    <Pause size={16} fill="currentColor" aria-hidden="true" />
                    <span className="mk-mock-track">
                      <span />
                    </span>
                    <span className="mk-mock-time">03:42 / 12:15</span>
                  </div>
                </div>
                <div className="mk-mock-lines">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="mk-mock-float mk-mock-float--quiz">
                  <KnowledgeCheck mock={mock} />
                </div>
              </div>
            </div>
          </div>
          <div className="mk-mock-float mk-mock-float--module">
            <ModuleActive mock={mock} />
          </div>
        </div>

        {/* Decorative course-player preview (tablet and mobile) */}
        <div className="mk-mock-mobile" role="img" aria-label={mock.previewLabel}>
          <div className="mk-mock-m-head">
            <div>
              <div className="mk-mock-m-kicker">
                <PlayCircle size={16} aria-hidden="true" />
                {mock.currentLesson}
              </div>
              <p className="mk-mock-m-name">{mock.courseName}</p>
            </div>
            <span className="mk-mock-m-pill">{mock.modulesProgress}</span>
          </div>
          <div className="mk-mock-m-video" dir="ltr">
            <p className="mk-mock-m-title">{mock.lessonTitle}</p>
            <span className="mk-mock-play mk-mock-play--sm">
              <Play size={20} fill="currentColor" aria-hidden="true" />
            </span>
            <div className="mk-mock-controls mk-mock-controls--sm">
              <Pause size={12} fill="currentColor" aria-hidden="true" />
              <span className="mk-mock-track">
                <span />
              </span>
              <span className="mk-mock-time">03:42 / 12:15</span>
            </div>
          </div>
          <div className="mk-mock-m-body">
            <div className="mk-mock-m-row">
              <span className="mk-mock-section">{mock.section}</span>
              <span className="mk-mock-m-count">{mock.lessonCount}</span>
            </div>
            <LessonList lessons={mock.lessons} size={14} />
            <KnowledgeCheck mock={mock} compact />
            <ModuleActive mock={mock} />
          </div>
        </div>
      </div>
    </section>
  );
}
