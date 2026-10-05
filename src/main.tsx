import React, { useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  BookOpen,
  Sparkles,
  Users,
  MessageSquare,
  CalendarDays,
  Award,
  Settings,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  GraduationCap,
  BarChart3,
  Briefcase,
  Clock,
  ListChecks,
  Star,
  Play,
  Trophy,
  Download,
  Share2,
  Bookmark,
  Check,
  Send,
  Paperclip,
  Lightbulb,
  FileText,
  Target,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Globe,
  Languages,
  Camera,
  Pencil,
  CreditCard,
  ShieldCheck,
  Zap,
  Menu,
  X,
  Flame,
  Video,
  Info,
  LogOut,
  Plus,
  Volume2,
  Maximize,
  MapPin,
  Phone,
  type LucideIcon,
} from "lucide-react";
import "./styles.css";
import "./refinements.css";

const A = "/assets/";
function stored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

const courses = [
  {
    name: "Crash Course Odoo ERP",
    image: "course-0.svg",
    description:
      "A practical, hands-on introduction to Odoo ERP and how it integrates business functions.",
    teacher: "Ahmed Raza",
    role: "Odoo Functional Consultant",
    rating: "4.7",
    time: "10h 46m",
    lessons: 10,
    category: "Functional",
  },
  {
    name: "Python Fundamentals",
    image: "course-1.svg",
    description:
      "Learn Python from scratch and build the skills for Odoo development with real-world examples.",
    teacher: "Usman Ali",
    role: "Software Engineer",
    rating: "4.6",
    time: "8h 20m",
    lessons: 12,
    category: "Technical",
  },
  {
    name: "Odoo Development",
    image: "course-2.svg",
    description:
      "Build custom modules, extend functionalities, and become an Odoo developer.",
    teacher: "Fahad Khan",
    role: "Odoo Technical Consultant",
    rating: "4.8",
    time: "12h 15m",
    lessons: 14,
    category: "Technical",
  },
  {
    name: "Odoo Implementation",
    image: "course-3.svg",
    description:
      "Learn the complete implementation process from planning to go-live with best practices.",
    teacher: "Bilal Hussain",
    role: "Implementation Consultant",
    rating: "4.5",
    time: "9h 30m",
    lessons: 11,
    category: "Functional",
  },
  {
    name: "Odoo User Guide",
    image: "course-4.svg",
    description:
      "A step-by-step guide to using Odoo for everyday business operations across all modules.",
    teacher: "Ahmed Raza",
    role: "Odoo Functional Consultant",
    rating: "4.6",
    time: "6h 10m",
    lessons: 10,
    category: "Beginner",
  },
  {
    name: "Odoo System Admin",
    image: "course-5.svg",
    description:
      "Learn how to install, configure, secure, and maintain your Odoo instance.",
    teacher: "Usman Ali",
    role: "System Administrator",
    rating: "4.7",
    time: "7h 40m",
    lessons: 11,
    category: "Technical",
  },
];
type Course = (typeof courses)[number];
const nav: [string, string, LucideIcon][] = [
  ["overview", "Overview", Home],
  ["courses", "Our Courses", BookOpen],
  ["ai-page", "AI Assistant", Sparkles],
  ["community", "Community", Users],
  ["messages", "Messages", MessageSquare],
  ["calendar", "Calendar", CalendarDays],
  ["certificates", "Certifications", Award],
  ["settings", "Settings", Settings],
];
function go(page: string) {
  location.hash = page;
}
function Button({
  children,
  onClick,
  outline = false,
  className = "",
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  outline?: boolean;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`btn ${outline ? "outline" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`panel ${className}`}>{children}</section>;
}
function Title({
  children,
  link = "View All",
  onClick,
}: {
  children: ReactNode;
  link?: string;
  onClick?: () => void;
}) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {onClick && (
        <button className="text-link" onClick={onClick}>
          {link}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
function IconBox({
  icon: Icon,
  color = "blue",
}: {
  icon: LucideIcon;
  color?: string;
}) {
  return (
    <span className={`icon-box ${color}`}>
      <Icon />
    </span>
  );
}
function Avatar({ large = false }: { large?: boolean }) {
  return (
    <img
      className={`avatar ${large ? "large" : ""}`}
      src={localStorage.getItem("profile-photo") || A + "profile-image.png"}
      alt="Ahmed Salah"
    />
  );
}
function Progress({ value = 30 }: { value?: number }) {
  return (
    <div className="progress">
      <span style={{ width: value + "%" }} />
    </div>
  );
}
function Field({
  label,
  icon: Icon,
  type = "text",
  value,
  placeholder,
  options,
  name,
  required = false,
}: {
  label: string;
  icon?: LucideIcon;
  type?: string;
  value?: string;
  placeholder?: string;
  options?: string[];
  name?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const saved =
    location.hash === "#settings"
      ? stored<Record<string, string>>("profile-data", {})
      : {};
  const initial = saved[name || label] ?? value;
  return (
    <label className="field">
      <span>
        {label}
        {required && <em aria-hidden="true"> *</em>}
      </span>
      <div className="input-wrap">
        {Icon && <Icon size={20} />}
        {options ? (
          <select
            aria-label={label}
            name={name || label}
            defaultValue={initial || ""}
            required={required}
          >
            {!initial && (
              <option value="" disabled>
                {placeholder || "Please select"}
              </option>
            )}
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : (
          <input
            aria-label={label}
            name={name || label}
            type={type === "password" && show ? "text" : type}
            defaultValue={initial}
            placeholder={placeholder}
            required={required}
            min={type === "number" ? 1 : undefined}
          />
        )}
        {type === "password" && (
          <button
            type="button"
            aria-label={show ? "Hide password" : "Show password"}
            onClick={() => setShow(!show)}
          >
            {show ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        )}
      </div>
    </label>
  );
}
function App() {
  const [page, setPage] = useState(location.hash.slice(1) || "overview");
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [notification, setNotification] = useState(false);
  React.useEffect(() => {
    const cb = () => {
      setPage(location.hash.slice(1) || "overview");
      setMobile(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", cb);
    return () => window.removeEventListener("hashchange", cb);
  }, []);
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 4500);
  };
  const active = ["detail-course", "assessment", "payment"].includes(page)
    ? "courses"
    : page;
  const title =
    page === "calendar"
      ? "Stay on track with your learning!"
      : page === "settings"
        ? "Settings"
        : page === "certificates"
          ? "Certifications"
          : page === "courses"
            ? "All Courses"
            : page === "payment"
              ? "Complete Your Enrollment"
              : "Let’s keep learning!";
  const subtitle =
    page === "calendar"
      ? "View your classes, live sessions, deadlines, and important events all in one place."
      : page === "settings"
        ? "Manage your account, preferences, and learning experience."
        : page === "certificates"
          ? "Track your learning journey and celebrate your achievements."
          : page === "courses"
            ? "Explore our comprehensive collection of Odoo courses and start your learning journey today."
            : page === "payment"
              ? "Secure your spot and start learning with ETripleSoft Learn."
              : "Build in-demand skills with expert-led Odoo courses and take your career to the next level.";
  return (
    <>
      {page === "sign-up" ? (
        <SignUp notify={notify} />
      ) : (
        <div className="app-shell">
          {mobile && (
            <button
              className="scrim"
              aria-label="Close navigation"
              onClick={() => setMobile(false)}
            />
          )}
          <aside className={`sidebar ${mobile ? "open" : ""}`}>
            <a className="brand" href="#overview">
              <img src={A + "logo-display.svg"} alt="ETripleSoft Learn" />
            </a>
            <button
              className="mobile-close icon-button"
              aria-label="Close navigation"
              onClick={() => setMobile(false)}
            >
              <X />
            </button>
            <nav>
              {nav.map(([id, label, Icon]) => (
                <a
                  key={id}
                  href={"#" + id}
                  className={active === id ? "active" : ""}
                >
                  <Icon />
                  <span>{label}</span>
                  {id === "ai-page" && <b className="badge">New</b>}
                  {id === "messages" && <i className="dot" />}
                </a>
              ))}
            </nav>
            <div className="app-promo">
              <IconBox icon={GraduationCap} />
              <h3>
                Learn Anywhere
                <br />
                with Our Mobile App
              </h3>
              <p>Access courses, track your progress, and learn on the go.</p>
              <button
                className="store"
                onClick={() =>
                  notify("The mobile app is not available in this demo.")
                }
              >
                <svg viewBox="0 0 24 28">
                  <path
                    fill="white"
                    d="M17 0c0 3-2 5-4 5-1-3 2-5 4-5M20 15c0-4 3-5 3-5-2-4-6-4-8-3-2 1-3 1-5 0C3 5 0 11 2 18c1 4 4 9 7 9 2 0 3-1 5-1s3 1 5 1c2-1 5-6 5-8-3-1-4-3-4-4"
                  />
                </svg>
                <span>
                  <small>Download on the</small>App Store
                </span>
              </button>
              <button
                className="store"
                onClick={() =>
                  notify("The mobile app is not available in this demo.")
                }
              >
                <Play fill="#00d591" color="#00b7ff" />
                <span>
                  <small>GET IT ON</small>Google Play
                </span>
              </button>
            </div>
          </aside>
          <main className="main">
            <header className="topbar">
              <button
                className="mobile-menu icon-button"
                aria-label="Open navigation"
                onClick={() => setMobile(true)}
              >
                <Menu />
              </button>
              <div className="greeting">
                {["courses", "payment", "detail-course"].includes(page) ? (
                  <div className="crumb">
                    <a href="#courses">Our Courses</a>
                    <ChevronRight size={17} />
                    <span>
                      {page === "payment"
                        ? "Checkout"
                        : page === "detail-course"
                          ? "All Courses  ›  Crash Course Odoo ERP"
                          : "All Courses"}
                    </span>
                  </div>
                ) : (
                  page !== "certificates" && <span>Good morning,</span>
                )}
              </div>
              <form
                className="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  go("courses");
                }}
              >
                <Search size={21} />
                <input
                  aria-label="Search courses"
                  placeholder="Search for courses, topics, or skills..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </form>
              <div className="header-action">
                <button
                  className="icon-button notification-button"
                  aria-label="Notifications"
                  onClick={() => setNotification(!notification)}
                >
                  <Bell />
                  <i className="dot" />
                </button>
                {notification && (
                  <div className="popover">
                    <strong>You’re making progress!</strong>
                    <p>Your next lesson is ready to start.</p>
                    <button
                      className="text-link"
                      onClick={() => {
                        go("detail-course");
                        setNotification(false);
                      }}
                    >
                      Continue learning <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="header-action">
                <button className="user-menu" onClick={() => setMenu(!menu)}>
                  <Avatar />
                  <span>
                    <strong>
                      {localStorage.getItem("learner-name") || "Ahmed Salah"}
                    </strong>
                    <small>Learner</small>
                  </span>
                  <ChevronDown size={18} />
                </button>
                {menu && (
                  <div className="popover">
                    <a href="#settings" onClick={() => setMenu(false)}>
                      <Settings size={16} />
                      Account settings
                    </a>
                    <a href="#sign-up" onClick={() => setMenu(false)}>
                      <LogOut size={16} />
                      Sign up / Log in
                    </a>
                  </div>
                )}
              </div>
            </header>
            {page !== "detail-course" && (
              <div
                className={`page-heading heading-${page} ${["courses", "payment", "certificates"].includes(page) ? "standalone" : ""}`}
              >
                <h1>{title}</h1>
                <p>{subtitle}</p>
              </div>
            )}
            {page === "overview" ? (
              <Overview />
            ) : page === "courses" ? (
              <Courses query={query} />
            ) : page === "ai-page" ? (
              <AIPage />
            ) : page === "assessment" ? (
              <Assessment notify={notify} />
            ) : page === "calendar" ? (
              <CalendarPage notify={notify} />
            ) : page === "certificates" ? (
              <Certificates notify={notify} />
            ) : page === "detail-course" ? (
              <CourseDetail notify={notify} />
            ) : page === "payment" ? (
              <Payment notify={notify} />
            ) : page === "settings" ? (
              <SettingsPage notify={notify} />
            ) : (
              <Panel>
                <h2>
                  {page === "community" ? "Learning Community" : "Messages"}
                </h2>
                <p>
                  {page === "community"
                    ? "Connect with other Odoo learners. Community conversations will appear here when a community service is connected."
                    : "You’re all caught up. Your instructor messages will appear here."}
                </p>
                <Button onClick={() => go("courses")}>
                  Explore Courses <ArrowRight size={18} />
                </Button>
              </Panel>
            )}
            <SiteFooter notify={notify} />
          </main>
        </div>
      )}
      {toast && (
        <div role="status" className="toast">
          <Check size={20} />
          {toast}
          <button aria-label="Dismiss" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}

function ProgressPanel({ completed = 2 }: { completed?: number }) {
  return (
    <Panel>
      <Title link="View Details" onClick={() => go("certificates")}>
        Your Progress
      </Title>
      <div className="progress-summary">
        <div className="ring">
          <strong>30%</strong>
        </div>
        <div>
          <h3>Keep going!</h3>
          <p>Complete more lessons to achieve your goals.</p>
        </div>
      </div>
      <div className="completion">
        <Trophy />
        <div>
          <b>{completed} / 10</b> lessons completed
          <Progress value={completed * 10} />
        </div>
      </div>
    </Panel>
  );
}
function Paths() {
  return (
    <>
      <Title onClick={() => go("courses")}>Learning Paths</Title>
      <div className="paths">
        {[
          "Odoo Functional Consultant",
          "Odoo Developer",
          "Odoo Implementation Specialist",
        ].map((n, i) => (
          <button className="path panel" key={n} onClick={() => go("courses")}>
            <IconBox
              icon={[Briefcase, Settings, BarChart3][i]}
              color={i === 0 ? "green" : "blue"}
            />
            <div>
              <strong>{n}</strong>
              <p>
                {
                  [
                    "Master Odoo business apps and implementation.",
                    "Learn technical development from basics to advanced.",
                    "End-to-end implementation skills for real projects.",
                  ][i]
                }
              </p>
            </div>
            <small>
              {i === 1 ? "6" : "5"} Courses　 |　{[40, 50, 35][i]} Hours
            </small>
            <ArrowRight size={18} />
          </button>
        ))}
      </div>
    </>
  );
}
function Community() {
  return (
    <div className="community-banner">
      <Users size={34} />
      <div>
        <strong>Join a growing community of Odoo learners</strong>
        <p>Ask questions, share knowledge, and grow together.</p>
      </div>
      <Button outline onClick={() => go("community")}>
        Visit Community <ArrowRight size={17} />
      </Button>
      <span className="community-count">
        <Users />{" "}
        <b>
          10K+<small>Active Learners</small>
        </b>
      </span>
    </div>
  );
}
function CourseCard({
  course,
  index,
  compact = false,
}: {
  course: Course;
  index: number;
  compact?: boolean;
}) {
  return (
    <article className={`course-card panel ${compact ? "compact" : ""}`}>
      <a href="#detail-course" className="course-image">
        <img src={A + course.image} alt={course.name} />
        {index === 0 && <span className="badge">Bestseller</span>}
      </a>
      <div className="course-body">
        <h3>
          <a href="#detail-course">{course.name}</a>
        </h3>
        <p>{course.description}</p>
        {!compact && (
          <div className="teacher">
            <Avatar />
            <div>
              <b>{course.teacher}</b>
              <small>{course.role}</small>
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
            {course.lessons} {compact ? "Steps" : "Lessons"}
          </span>
          {compact && (
            <span>
              <Star className="star" size={16} />
              {course.rating}
            </span>
          )}
        </div>
        {!compact && (
          <Button outline={index !== 0} onClick={() => go("detail-course")}>
            View Course <ArrowRight size={18} />
          </Button>
        )}
      </div>
    </article>
  );
}
function AICard() {
  return (
    <Panel className="ai-small">
      <Title link="">
        Meet Your AI Assistant <b className="badge">New</b>
      </Title>
      <div className="ai-small-body">
        <img src={A + "ai-character.png"} alt="AI learning assistant" />
        <div>
          <p>
            Get instant help, course recommendations, and answers to your Odoo
            questions.
          </p>
          <Button outline onClick={() => go("ai-page")}>
            Ask AI Assistant <ArrowRight size={17} />
          </Button>
        </div>
      </div>
    </Panel>
  );
}
function Overview() {
  return (
    <div className="columns">
      <div className="primary">
        <section className="hero overview-hero">
          <img
            className="hero-photo"
            src={A + "learner-hero.png"}
            alt="Odoo learner working on a laptop"
          />
          <div className="hero-copy">
            <div className="eyebrow">—　ODOO LEARNING PATHS</div>
            <h2>
              Learn It. <span>Build It. Own It.</span>
            </h2>
            <p>
              Practical Odoo courses. Real-world examples.
              <br />
              Career-ready skills.
            </p>
            <div className="button-row">
              <Button onClick={() => go("courses")}>
                Start Learning <ArrowRight size={19} />
              </Button>
              <Button
                outline
                onClick={() =>
                  document
                    .getElementById("learning-paths")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Explore Learning Paths
              </Button>
            </div>
          </div>
          <div className="hero-features">
            {[
              [BookOpen, "Expert Instructors", "Learn from real practitioners"],
              [Briefcase, "Hands-on Projects", "Practice with real data"],
              [BarChart3, "Get Certified", "Showcase your skills"],
            ].map(([I, h, p], i) => {
              const Icon = I as LucideIcon;
              return (
                <div key={i}>
                  <IconBox icon={Icon} color={i === 2 ? "green" : "blue"} />
                  <div>
                    <strong>{h as string}</strong>
                    <small>{p as string}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <Title onClick={() => go("courses")}>Most Popular Courses</Title>
        <div className="course-grid">
          {courses.slice(0, 3).map((c, i) => (
            <CourseCard key={c.name} course={c} index={i} compact />
          ))}
        </div>
        <div id="learning-paths">
          <Paths />
        </div>
        <Community />
      </div>
      <aside className="right-rail">
        <ProgressPanel />
        <Panel>
          <Title onClick={() => go("detail-course")}>Continue Learning</Title>
          {[
            "Business Workflows & ERP",
            "Introduction to Models",
            "Working with Views",
          ].map((n, i) => (
            <a href="#detail-course" className="lesson-preview" key={n}>
              <div className="lesson-thumb">
                <img src={A + "course-2.svg"} alt="" />
                <Play fill="white" />
              </div>
              <div>
                <strong>{n}</strong>
                <small>Odoo Development</small>
                <div className="inline-progress">
                  <Progress value={35 - i * 3} />
                  <small>
                    {[12, 8, 6][i]} / {45 - i * 10} min
                  </small>
                </div>
              </div>
            </a>
          ))}
        </Panel>
        <AICard />
        <Panel>
          <Title>Quick Links</Title>
          {[
            [BookOpen, "Browse All Courses", "courses"],
            [Users, "Join Our Community", "community"],
            [Award, "View My Certifications", "certificates"],
            [CalendarDays, "Learning Calendar", "calendar"],
          ].map(([I, t, p]) => {
            const Icon = I as LucideIcon;
            return (
              <a className="quick-link" href={"#" + p} key={t as string}>
                <Icon size={20} />
                <span>{t as string}</span>
                <ChevronRight size={17} />
              </a>
            );
          })}
        </Panel>
      </aside>
    </div>
  );
}
function Courses({ query }: { query: string }) {
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("Most Popular");
  let shown = courses.filter(
    (c, i) =>
      (filter === "All" ||
        (filter === "Popular" && i < 4) ||
        (filter === "Newest" && i > 3) ||
        (filter === "Beginner" && [0, 1, 4].includes(i)) ||
        c.category === filter) &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );
  if (sort === "Name A–Z")
    shown = [...shown].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "Highest Rated")
    shown = [...shown].sort((a, b) => +b.rating - +a.rating);
  return (
    <div className="columns courses-columns">
      <div>
        <div className="filter-bar">
          <div className="pills">
            {[
              "All",
              "Functional",
              "Technical",
              "Beginner",
              "Popular",
              "Newest",
            ].map((f) => (
              <button
                className={filter === f ? "selected" : ""}
                onClick={() => setFilter(f)}
                key={f}
              >
                {f}
              </button>
            ))}
          </div>
          <label className="sort">
            Sort by{" "}
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {["Most Popular", "Highest Rated", "Name A–Z"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="course-grid">
          {shown.map((c) => (
            <CourseCard course={c} index={courses.indexOf(c)} key={c.name} />
          ))}
        </div>
        {!shown.length && (
          <Panel>
            <h3>No courses found</h3>
            <p>Try another search or category.</p>
            <Button onClick={() => setFilter("All")}>Clear category</Button>
          </Panel>
        )}
      </div>
      <aside className="right-rail">
        <Panel>
          <Title>Course Categories</Title>
          {[
            "All Courses",
            "Functional",
            "Technical",
            "Beginner",
            "Popular",
            "Newest",
          ].map((n, i) => (
            <button
              className="category-row"
              onClick={() => setFilter(i === 0 ? "All" : n)}
              key={n}
            >
              <IconBox
                icon={
                  [
                    BookOpen,
                    BarChart3,
                    FileText,
                    GraduationCap,
                    Flame,
                    Sparkles,
                  ][i]
                }
                color={["red", "blue", "purple", "green", "orange", "pink"][i]}
              />
              <span>
                <strong>{n}</strong>
                <small>{[6, 2, 3, 3, 4, 2][i]} courses</small>
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

const prompts = [
  "Explain Odoo CRM",
  "Summarize this course",
  "Quiz me on Accounting",
  "Recommend my next course",
  "Help me prepare for the final assessment",
];
function AIPage() {
  const [context, setContext] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I’m your ETripleSoft Learn AI Assistant. 👋\nI can help you with course content, explain concepts, create practice quizzes, recommend courses, and more. What would you like to learn today?",
    },
    { role: "user", text: "Can you explain what Odoo CRM is?" },
    {
      role: "assistant",
      text: "Of course! Odoo CRM is a customer relationship management module in Odoo that helps manage leads, opportunities, and customer interactions in one place.",
    },
  ]);
  React.useEffect(() => {
    if (messages.length > 3) {
      const box = document.querySelector(".chat-messages");
      if (box) box.scrollTop = box.scrollHeight;
    }
  }, [messages]);
  function send(text = input) {
    if (!text.trim()) return;
    const reply = /quiz|assessment/i.test(text)
      ? "Let’s practice: Which Odoo module manages customer invoices and tracks payments? A. Accounting, B. Sales, C. Inventory, D. Purchase. You can also open the final assessment from your course."
      : /recommend/i.test(text)
        ? "Based on your current Odoo learning path, Python Fundamentals is a useful next step before Odoo Development. Explore both in Our Courses."
        : /summar/i.test(text)
          ? "This course introduces ERP workflows and the Accounting, CRM, Sales, Purchase, and Inventory modules. You will apply these concepts in a business case and complete a final assessment."
          : "Odoo CRM helps you organize leads and opportunities in a sales pipeline. Each opportunity can include contact information, planned activities, and expected revenue. This is a local demo answer based on the course topics.";
    setMessages((m) => [
      ...m,
      { role: "user", text },
      { role: "assistant", text: reply },
    ]);
    setInput("");
  }
  return (
    <div className="columns">
      <div className="primary">
        <section className="hero ai-hero">
          <img src={A + "ai-character.png"} alt="Friendly AI assistant" />
          <div className="hero-copy">
            <div className="eyebrow">ETRIPLESOFT LEARN AI ASSISTANT</div>
            <h2>
              Your AI <span>Learning Companion</span>
            </h2>
            <p>
              Get instant help, course recommendations, explanations, practice
              <br className="desktop-only" /> quizzes, and more — powered by AI,
              built for your learning journey.
            </p>
          </div>
          <div className="ai-features">
            {[Lightbulb, BarChart3, FileText, GraduationCap].map((I, i) => (
              <div key={i}>
                <IconBox icon={I} color={i % 3 === 0 ? "green" : "blue"} />
                <span>
                  {
                    [
                      "Get instant answers",
                      "Personalized recommendations",
                      "Step-by-step explanations",
                      "Support your learning goals",
                    ][i]
                  }
                </span>
              </div>
            ))}
          </div>
        </section>
        <Panel className="chat-panel">
          <span className="today-label">Today</span>
          <div className="chat-messages" aria-live="polite">
            {messages.map((m, i) => (
              <div className={"message " + m.role} key={i}>
                {m.role === "assistant" ? (
                  <img
                    className="bot-avatar"
                    src={A + "ai-character.png"}
                    alt="Assistant"
                  />
                ) : (
                  <Avatar />
                )}
                <div>
                  <div className="bubble">{m.text}</div>
                  <small>9:{41 + i} AM</small>
                </div>
              </div>
            ))}
          </div>
          <Title
            link="View more prompts"
            onClick={() => setInput("Help me with Odoo development")}
          >
            Try asking me...
          </Title>
          <div className="prompt-grid">
            {prompts.map((p, i) => (
              <button onClick={() => send(p)} key={p}>
                <IconBox
                  icon={
                    [BookOpen, FileText, GraduationCap, BarChart3, Target][i]
                  }
                  color={i % 2 ? "green" : "blue"}
                />
                {p}
              </button>
            ))}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <Paperclip size={22} />
            <input
              aria-label="Ask the AI assistant"
              placeholder="Ask me anything about your courses, topics, or learning goals..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              className="send-button"
              aria-label="Send message"
              disabled={!input.trim()}
            >
              <Send size={21} />
            </button>
          </form>
          <small className="ai-disclaimer">
            The AI Assistant can make mistakes. Always verify important
            information with your course materials.
          </small>
        </Panel>
      </div>
      <aside className="right-rail">
        <Panel>
          <Title onClick={() => go("courses")}>Current Course Context</Title>
          <div className="context-course">
            <span className="odoo-tile">odoo</span>
            <div>
              <b>Odoo Development</b>
              <small>Odoo Development</small>
              <Progress value={35} />
            </div>
          </div>
          <div className="context-info">
            <p>
              <Info />I can use your current course content to give more
              relevant and personalized answers.
            </p>
            <label>
              Use current course context
              <button
                role="switch"
                aria-checked={context}
                aria-label="Use current course context"
                className={"switch " + (context ? "on" : "")}
                onClick={() => setContext(!context)}
              />
            </label>
          </div>
        </Panel>
        <Panel>
          <Title
            link="View All"
            onClick={() => setMessages(messages.slice(0, 3))}
          >
            Recent Conversations
          </Title>
          {[
            "Explain Odoo CRM",
            "Summarize this course",
            "Help me with domains in Odoo",
            "Quiz me on Accounting",
            "Recommend my next course",
          ].map((p, i) => (
            <button className="recent-row" key={p} onClick={() => send(p)}>
              <MessageSquare size={21} />
              <div>
                <span>{p}</span>
                <small>
                  {
                    [
                      "Odoo CRM is a customer relation...",
                      "Here’s a summary of the key topi...",
                      "In Odoo, domains are used to filt...",
                      "Here are 10 practice questions...",
                      "Based on your progress and inte...",
                    ][i]
                  }
                </small>
              </div>
              <small>
                {["Today", "Yesterday", "Mar 10", "Mar 9", "Mar 8"][i]}
              </small>
            </button>
          ))}
        </Panel>
        <Panel>
          <Title link="View Details" onClick={() => go("certificates")}>
            Your Learning Insights
          </Title>
          {["Questions asked", "Topics explored", "Study sessions with AI"].map(
            (t, i) => (
              <div className="insight" key={t}>
                <IconBox icon={[Clock, BookOpen, GraduationCap][i]} />
                <b>{[27, 8, 4][i]}</b>
                <small>{t}</small>
                <span>↑ {12 + i * 19}%</span>
              </div>
            ),
          )}
          <div className="completion">
            <Trophy />
            <div>
              <b>Great curiosity!</b>
              <p>
                You’re actively exploring new topics.
                <br />
                Keep it up!
              </p>
            </div>
          </div>
        </Panel>
      </aside>
    </div>
  );
}

const lessonNames = [
  "Business Workflows & ERP",
  "Accounting",
  "CRM / Sales / Purchase / Inventory",
  "Business Case",
  "Final Assessment",
];
function CourseDetail({ notify }: { notify: (s: string) => void }) {
  const [tab, setTab] = useState("Overview");
  const [expanded, setExpanded] = useState<number[]>([]);
  const [saved, setSaved] = useState(false);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="columns detail-columns">
      <div className="primary">
        <div className="detail-heading">
          <span className="badge">Bestseller</span>
          <div className="detail-actions">
            <button
              onClick={() => {
                setSaved(!saved);
                notify(
                  saved
                    ? "Course removed from saved courses."
                    : "Course saved.",
                );
              }}
            >
              <Bookmark fill={saved ? "#06f" : "none"} />
              <small>{saved ? "Saved" : "Save"}</small>
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(location.href);
                notify("Course link copied.");
              }}
            >
              <Share2 />
              <small>Share</small>
            </button>
            <button onClick={() => go("payment")}>
              <CreditCard />
              <small>Enroll</small>
            </button>
          </div>
          <h1>Crash Course Odoo ERP</h1>
          <p>
            A practical, hands-on introduction to Odoo ERP with real-world
            examples.
          </p>
          <div className="detail-meta">
            <span>
              <Star className="star" /> <b>4.7</b> <small>(1.2K reviews)</small>
            </span>
            <span>
              <Clock />
              10h 46m
            </span>
            <span>
              <ListChecks />
              10 Lessons
            </span>
            <span>
              <BarChart3 color="#009e70" />
              Beginner
            </span>
          </div>
        </div>
        <div className="video-poster">
          <img
            src={A + "learner-hero.png"}
            alt="Course instructor demonstrating Odoo"
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
              <b>Course preview</b>
              <p>
                The lesson video will be available when course media is
                connected.
              </p>
              <Button
                onClick={() => {
                  setPlaying(false);
                  setTab("Curriculum");
                }}
              >
                Explore Curriculum <ArrowRight size={16} />
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
            <span>ᴄᴄ</span>
            <Settings size={21} />
            <Maximize size={20} />
          </div>
        </div>
        <div className="instructor-row">
          <Avatar />
          <div>
            <h3>Ahmed Raza</h3>
            <p>Odoo Functional Consultant</p>
          </div>
          <div className="detail-meta">
            <span>
              <Star className="star" />
              4.7
            </span>
            <span>
              <Clock color="#c3484c" />
              10h 46m
            </span>
            <span>
              <BookOpen color="#c3484c" />
              10 Lessons
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
            ].map((t) => (
              <button
                className={tab === t ? "selected" : ""}
                onClick={() => setTab(t)}
                key={t}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="tab-content">
            {tab === "Overview" ? (
              <>
                <h2>About This Course</h2>
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
                <h2>Course Curriculum</h2>
                {lessonNames.map((l, i) => (
                  <button
                    className="quick-link"
                    key={l}
                    onClick={() =>
                      i === 4
                        ? go("assessment")
                        : notify("Lesson selected: " + l)
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
                <h2>Learner Reviews</h2>
                <p>
                  <Star className="star" size={18} /> 4.7 average course rating
                  · 1.2K reviews
                </p>
                <p>
                  Detailed reviews will appear when the course service is
                  connected.
                </p>
              </>
            ) : tab.startsWith("Q&A") ? (
              <>
                <h2>Questions & Answers</h2>
                <Field
                  label="Ask a course question"
                  placeholder="What would you like to understand?"
                />
                <Button onClick={() => go("ai-page")}>
                  Ask AI Assistant <ArrowRight size={18} />
                </Button>
              </>
            ) : (
              <>
                <h2>Course Resources</h2>
                <p>
                  Review the course curriculum and practice in your own Odoo
                  instance.
                </p>
                <Button onClick={() => go("assessment")}>
                  Take Final Assessment <ArrowRight size={18} />
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
            link={expanded.length === 5 ? "Collapse All" : "Expand All"}
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
                        ? go("assessment")
                        : notify("Lesson selected: " + l)
                    }
                  >
                    <Play size={15} />
                    {i === 4 ? "Start assessment" : "Open lesson"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </Panel>
        <Panel className="ai-small">
          <Title>
            Course AI Assistant <b className="badge">New</b>
          </Title>
          <p>
            Get instant help about this course, concepts, or anything you’re
            learning.
          </p>
          <div className="course-ai">
            <img src={A + "ai-character.png"} alt="AI assistant" />
            <div>
              {[
                "What is ERP?",
                "Explain the Accounting module",
                "Summarize this lesson",
                "Give me practice questions",
              ].map((t) => (
                <button onClick={() => go("ai-page")} key={t}>
                  {t}
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          </div>
          <Button outline onClick={() => go("ai-page")}>
            Ask anything about this course... <ArrowRight size={18} />
          </Button>
        </Panel>
      </aside>
    </div>
  );
}

const SOCIALS: [string, string, string][] = [
  [
    "Facebook",
    "https://www.facebook.com/etriplesoft",
    "M15.1 8.5h-2v-1.3c0-.6.4-.7.7-.7h1.3V4.1h-1.8c-2 0-2.5 1.5-2.5 2.5v1.9H9.6v2.5h1.2V18h2.3v-7h1.7l.3-2.5Z",
  ],
  [
    "Instagram",
    "https://www.instagram.com/etriplesoft",
    "M12 4.6c2.4 0 2.7 0 3.6.1.9 0 1.4.2 1.7.3.4.2.7.4 1 .7.3.3.5.6.7 1 .1.3.3.8.3 1.7 0 .9.1 1.2.1 3.6s0 2.7-.1 3.6c0 .9-.2 1.4-.3 1.7-.2.4-.4.7-.7 1-.3.3-.6.5-1 .7-.3.1-.8.3-1.7.3-.9 0-1.2.1-3.6.1s-2.7 0-3.6-.1c-.9 0-1.4-.2-1.7-.3-.4-.2-.7-.4-1-.7-.3-.3-.5-.6-.7-1-.1-.3-.3-.8-.3-1.7 0-.9-.1-1.2-.1-3.6s0-2.7.1-3.6c0-.9.2-1.4.3-1.7.2-.4.4-.7.7-1 .3-.3.6-.5 1-.7.3-.1.8-.3 1.7-.3.9 0 1.2-.1 3.6-.1Zm0 3.6a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm0 6.3a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Zm4.8-6.4a.9.9 0 1 1-1.8 0 .9.9 0 0 1 1.8 0Z",
  ],
  [
    "LinkedIn",
    "https://www.linkedin.com/company/etriplesoft",
    "M7.6 18H5.2V9.7h2.4V18ZM6.4 8.6a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8ZM18.8 18h-2.4v-4.1c0-1-.4-1.7-1.3-1.7-.7 0-1.1.5-1.3 1-.1.2-.1.4-.1.7V18H11.3s0-7.5 0-8.3h2.4v1.2c.3-.5 1-1.3 2.4-1.3 1.7 0 3 1.1 3 3.6V18Z",
  ],
];
const FOOTER_LINKS: [string, [string, string][]][] = [
  [
    "Learn",
    [
      ["Courses", "#courses"],
      ["Learning Paths", "#courses"],
      ["Odoo Modules", "#courses"],
    ],
  ],
  [
    "Company",
    [
      ["About", ""],
      ["Contact", ""],
    ],
  ],
  [
    "Support",
    [
      ["Help Center", ""],
      ["Privacy Policy", ""],
      ["Terms of Service", ""],
      ["Refund & Course Exchange Policy", ""],
    ],
  ],
];

function SiteFooter({ notify }: { notify: (s: string) => void }) {
  const soon = (label: string) =>
    notify(`${label} will be available when the platform launches.`);
  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-about">
          <a className="site-footer-logo" href="#overview">
            <img src={A + "logo-display.svg"} alt="ETripleSoft Learn" />
          </a>
          <p>
            Providing highly intuitive, role-based Odoo &amp; ERP training
            models globally. Empowering enterprise teams toward absolute
            efficiency.
          </p>
          <p className="site-footer-quote">
            “Empower your future with real-world tech skills. Learn. Build.
            Grow.”
          </p>
          <ul className="site-footer-contact">
            <li>
              <MapPin size={17} />
              <span>New Cairo, Egypt</span>
            </li>
            <li>
              <Phone size={17} />
              <a href="tel:+201002106952">+20 100 210 6952</a>
            </li>
            <li>
              <Mail size={17} />
              <a href="mailto:info@etriplesoft.com">info@etriplesoft.com</a>
            </li>
          </ul>
          <div className="site-footer-social">
            {SOCIALS.map(([name, href, d]) => (
              <a
                key={name}
                href={href}
                aria-label={name}
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={d} />
                </svg>
              </a>
            ))}
          </div>
        </div>
        <nav className="site-footer-nav">
          {FOOTER_LINKS.map(([heading, links]) => (
            <div key={heading}>
              <h2>{heading}</h2>
              <ul>
                {links.map(([label, href]) => (
                  <li key={label}>
                    {href ? (
                      <a href={href}>{label}</a>
                    ) : (
                      <button type="button" onClick={() => soon(label)}>
                        {label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="site-footer-bottom">
        <small>© 2026 ETripleSoft Learn. All rights reserved.</small>
        <span className="partner-badge">
          <Star size={13} />
          Odoo Gold Partner · MENA Region
        </span>
        <button
          type="button"
          className="site-footer-lang"
          onClick={() => soon("Additional languages")}
        >
          <Globe size={17} />
          English (US)
        </button>
      </div>
    </footer>
  );
}

function SignUp({ notify }: { notify: (s: string) => void }) {
  const [role, setRole] = useState("Professional");
  const [login, setLogin] = useState(false);
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!login && data.get("Password") !== data.get("Confirm Password")) {
      notify("Passwords do not match. Please check both fields.");
      return;
    }
    localStorage.setItem(
      "learner-name",
      String(data.get("Your Name") || "Ahmed Salah"),
    );
    notify(login ? "Welcome back!" : "Your demo account is ready.");
    go("overview");
  }
  return (
    <div className="signup-page">
      <header>
        <a href="#overview">
          <img src={A + "logo-display.svg"} alt="ETripleSoft Learn" />
        </a>
        <div>
          <span>
            {login ? "New to ETripleSoft Learn?" : "Already have an account?"}
          </span>
          <Button outline onClick={() => setLogin(!login)}>
            {login ? "Sign up" : "Log in"} <ArrowRight size={19} />
          </Button>
        </div>
      </header>
      <div className="signup-layout">
        <section className="signup-intro">
          <img
            className="signup-photo"
            src={A + "learner-hero.png"}
            alt="Learner building skills with Odoo"
          />
          <div className="signup-copy">
            <div className="eyebrow">LEARN. PRACTICE. BUILD. GROW.</div>
            <h1>
              Built for
              <br />
              <span>the Builders.</span>
            </h1>
            <p>
              Gain in-demand skills with expert-led Odoo courses
              <br />
              and take your career to the next level.
            </p>
          </div>
          <div className="signup-benefits">
            {[BookOpen, BarChart3, FileText, Award, Sparkles].map((I, i) => (
              <div key={i}>
                <IconBox icon={I} color={i % 2 ? "green" : "blue"} />
                <div>
                  <h3>
                    {
                      [
                        "Enroll in Courses",
                        "Track Your Progress",
                        "Take Quizzes",
                        "Earn Certificates",
                        "Get AI Assistant Support",
                      ][i]
                    }
                  </h3>
                  <p>
                    {
                      [
                        "Access expert-led content and real-world projects.",
                        "Monitor your learning journey and achieve your goals.",
                        "Test your knowledge and build confidence.",
                        "Showcase your skills to the world.",
                        "Get instant help, course recommendations, and more.",
                      ][i]
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="handwriting">
            More Skills
            <br />A Brighter You
          </div>
        </section>
        <form
          className={"signup-form panel" + (login ? " login-mode" : "")}
          onSubmit={submit}
        >
          <h1>{login ? "Welcome Back" : "Create Your Account"}</h1>
          <p>
            {login
              ? "Log in and continue your learning journey."
              : "Join ETripleSoft Learn and start building your future today."}
          </p>
          <div className="form-grid">
            <Field
              label="Your Email"
              icon={Mail}
              type="email"
              placeholder="e.g. john@domain.com"
              required
            />
            {!login && (
              <Field
                label="Your Name"
                icon={User}
                placeholder="e.g. John Doe"
                required
              />
            )}
            <Field
              label="Password"
              icon={Lock}
              type="password"
              placeholder={login ? "Enter your password" : "Create a password"}
              required
            />
            {!login && (
              <>
                <Field
                  label="Confirm Password"
                  icon={Lock}
                  type="password"
                  placeholder="Confirm your password"
                  required
                />
                <Field
                  label="Age"
                  icon={CalendarDays}
                  type="number"
                  placeholder="e.g. 21"
                  required
                />
                <Field
                  label="Gender"
                  icon={User}
                  options={["Male", "Female", "Prefer not to say"]}
                  required
                />
                <Field
                  label="University"
                  icon={Building2}
                  placeholder="Select your university"
                  options={[
                    "Cairo University",
                    "Ain Shams University",
                    "Alexandria University",
                    "Other",
                    "Not applicable",
                  ]}
                />
                <Field
                  label="Faculty"
                  icon={GraduationCap}
                  placeholder="Select your faculty"
                  options={[
                    "Faculty of Engineering",
                    "Computer Science",
                    "Business",
                    "Other",
                    "Not applicable",
                  ]}
                />
              </>
            )}
          </div>
          {!login && (
            <fieldset>
              <legend>I am a...</legend>
              {["Student", "Professional", "My company enrolled me"].map(
                (r, i) => (
                  <label
                    className={"role-option " + (role === r ? "chosen" : "")}
                    key={r}
                  >
                    <input
                      type="radio"
                      name="role"
                      checked={role === r}
                      onChange={() => setRole(r)}
                    />
                    <span>
                      <b>{r}</b> —{" "}
                      {
                        [
                          "currently enrolled at a university, or a recent graduate (within 2 years)",
                          "employed, self-funding my development",
                          "I received a company invitation",
                        ][i]
                      }
                    </span>
                  </label>
                ),
              )}
            </fieldset>
          )}
          {login && (
            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" name="remember" defaultChecked />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  notify("Password recovery is not available in this demo.")
                }
              >
                Forgot password?
              </button>
            </div>
          )}
          <Button type="submit" className="create-account">
            {login ? "Log in" : "Create Account"} <ArrowRight size={21} />
          </Button>
          <p className="login-link">
            {login ? "Don’t have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="text-link"
              onClick={() => setLogin(!login)}
            >
              {login ? "Sign up" : "Log in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function Assessment({ notify }: { notify: (s: string) => void }) {
  const [q, setQ] = useState(4);
  const [answers, setAnswers] = useState<Record<number, number>>(() =>
    stored("assessment-answers", { 1: 0, 2: 1, 3: 2, 4: 0 }),
  );
  const [submitted, setSubmitted] = useState(false);
  const [remaining, setRemaining] = useState(755);
  React.useEffect(() => {
    if (submitted) return;
    const timer = setInterval(
      () => setRemaining((t) => Math.max(0, t - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [submitted]);
  React.useEffect(() => {
    if (remaining === 0) setSubmitted(true);
  }, [remaining]);
  const options = ["Accounting", "Sales", "Inventory", "Purchase"];
  const questions = [
    "Which Odoo module helps manage customer relationships?",
    "Which module manages quotations and sales orders?",
    "Which module tracks stock levels and warehouse operations?",
    "Which module in Odoo is primarily used to manage customer invoices and track payments?",
    "Which module manages vendor purchases?",
    "Which module manages customer invoices?",
    "Which module tracks product movements?",
    "Which module manages sales orders?",
    "Which module manages incoming receipts?",
    "Which module tracks customer payments?",
  ];
  const choices = q === 1 ? ["CRM", "Sales", "Inventory", "Purchase"] : options;
  const correct = [0, 1, 2, 0, 3, 0, 2, 1, 3, 0];
  const score =
    Object.entries(answers).filter(([n, a]) => correct[+n - 1] === a).length *
    10;
  return (
    <Panel className="assessment-shell">
      <div className="crumb">
        <a href="#courses">Our Courses</a>
        <ChevronRight />
        <a href="#courses">All Courses</a>
        <ChevronRight />
        <a href="#detail-course">Crash Course Odoo ERP</a>
        <ChevronRight />
        <span>Final Assessment</span>
      </div>
      <div className="columns assessment-columns">
        <div className="primary">
          <Panel className="assessment-heading">
            <span className="odoo-tile">odoo</span>
            <div>
              <div className="eyebrow">FINAL ASSESSMENT</div>
              <h1>Crash Course Odoo ERP</h1>
              <p>
                Test your understanding of key concepts. Complete all questions
                to finish the course.
              </p>
            </div>
          </Panel>
          <div className="assessment-status">
            <Panel>
              <b>Question {q} of 10</b>
              <div className="inline-progress">
                <Progress value={q * 10} />
                <span>{q * 10}% Complete</span>
              </div>
            </Panel>
            <Panel className="timer">
              <Clock />
              <div>
                <small>Time Remaining</small>
                <b>
                  {Math.floor(remaining / 60)}:
                  {String(remaining % 60).padStart(2, "0")}
                </b>
              </div>
            </Panel>
          </div>
          <Panel className="question-card">
            {submitted ? (
              <div className="assessment-result">
                <IconBox icon={Trophy} color="green" />
                <h2>Assessment {score >= 70 ? "Completed" : "Results"}</h2>
                <h1>{score}%</h1>
                <p>
                  {score >= 70
                    ? "Congratulations! You passed the assessment."
                    : "You need 70% to pass. Review your answers and try again."}
                </p>
                <Button
                  onClick={() =>
                    score >= 70 ? go("certificates") : setSubmitted(false)
                  }
                >
                  {score >= 70 ? "View Certificate" : "Review Answers"}
                  <ArrowRight size={18} />
                </Button>
              </div>
            ) : (
              <>
                <span className="question-label">Question {q}</span>
                <h2>{questions[q - 1]}</h2>
                <p>Select the best answer from the options below.</p>
                <div className="answers">
                  {choices.map((o, i) => (
                    <label key={o} className={answers[q] === i ? "chosen" : ""}>
                      <input
                        type="radio"
                        name="answer"
                        checked={answers[q] === i}
                        onChange={() => setAnswers({ ...answers, [q]: i })}
                      />
                      <b>{String.fromCharCode(65 + i)}.</b>
                      <div>
                        <strong>{o}</strong>
                        <small>
                          {
                            [
                              "Used to manage customer invoices, vendor bills, and track payments.",
                              "Used to manage quotations, sales orders, and customer relationships.",
                              "Used to manage stock levels, warehouse operations, and product movements.",
                              "Used to manage vendor purchases and incoming receipts.",
                            ][i]
                          }
                        </small>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="question-buttons">
                  <Button
                    outline
                    disabled={q === 1}
                    onClick={() => setQ(q - 1)}
                  >
                    <ChevronLeft />
                    Previous
                  </Button>
                  <span />
                  <Button
                    outline
                    onClick={() => {
                      localStorage.setItem(
                        "assessment-answers",
                        JSON.stringify(answers),
                      );
                      notify("Answer saved.");
                    }}
                  >
                    <Bookmark size={19} />
                    Save Answer
                  </Button>
                  <Button disabled={q === 10} onClick={() => setQ(q + 1)}>
                    Next <ArrowRight />
                  </Button>
                </div>
              </>
            )}
          </Panel>
        </div>
        <aside className="right-rail">
          <Panel>
            <Title>
              Assessment Progress <span className="muted">{q}/10</span>
            </Title>
            <div className="question-numbers">
              {Array.from({ length: 10 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQ(i + 1);
                    setSubmitted(false);
                  }}
                  className={
                    q === i + 1
                      ? "current"
                      : answers[i + 1] !== undefined
                        ? "answered"
                        : ""
                  }
                >
                  {answers[i + 1] !== undefined && i + 1 !== q ? (
                    <Check size={21} />
                  ) : (
                    i + 1
                  )}
                </button>
              ))}
            </div>
            <div className="legend">
              <span>
                <i className="green-dot" />
                Answered
              </span>
              <span>
                <i className="dot" />
                Current
              </span>
              <span>
                <i />
                Not Answered
              </span>
            </div>
          </Panel>
          <Panel className="pass-mark">
            <IconBox icon={Trophy} color="green" />
            <div>
              <p>Pass Mark</p>
              <h1>70%</h1>
            </div>
            <p>
              You need at least 70% correct
              <br />
              to pass this assessment.
            </p>
          </Panel>
          <Panel className="instructions">
            <Title>Assessment Instructions</Title>
            {[FileText, Clock, Check, Info].map((I, i) => (
              <div key={i}>
                <I />
                <p>
                  {
                    [
                      "10 multiple choice questions",
                      "15 minutes time limit",
                      "You can save your answer and come back later",
                      "Submit to complete the assessment",
                    ][i]
                  }
                </p>
              </div>
            ))}
            <Button
              className="green-button"
              onClick={() => {
                if (Object.keys(answers).length < 10) {
                  notify("Please answer all 10 questions before submitting.");
                  return;
                }
                setSubmitted(true);
              }}
            >
              <Send />
              Submit Assessment
            </Button>
          </Panel>
        </aside>
      </div>
    </Panel>
  );
}

const events = [
  {
    day: 1,
    title: "Odoo ERP Live Session",
    sub: "10:00 AM – 11:00 AM",
    type: "blue",
    icon: Video,
  },
  { day: 3, title: "Quiz Due", sub: "Odoo Basics", type: "green", icon: Flame },
  {
    day: 8,
    title: "Office Hours with Instructor",
    sub: "2:00 PM",
    type: "purple",
    icon: Users,
  },
  {
    day: 10,
    title: "Live Session",
    sub: "Studio & Apps · 11:00 AM",
    type: "blue",
    icon: Play,
  },
  {
    day: 12,
    title: "Assignment Due",
    sub: "CRM Project",
    type: "green",
    icon: FileText,
  },
  {
    day: 15,
    title: "Business Training",
    sub: "ERP for SMEs · 4:00 PM",
    type: "green",
    icon: Briefcase,
  },
  {
    day: 18,
    title: "Live Session",
    sub: "Reports & Dashboards · 10:00 AM",
    type: "blue",
    icon: Video,
  },
  {
    day: 22,
    title: "Quiz Due",
    sub: "Python for Odoo",
    type: "green",
    icon: Flame,
  },
  {
    day: 24,
    title: "Mentoring",
    sub: "Career Q&A · 3:00 PM",
    type: "purple",
    icon: Users,
  },
  {
    day: 26,
    title: "Assignment Due",
    sub: "Final Project",
    type: "green",
    icon: FileText,
  },
  {
    day: 29,
    title: "Live Session",
    sub: "Q&A / Open Lab · 11:00 AM",
    type: "blue",
    icon: Play,
  },
];
function CalendarPage({ notify }: { notify: (s: string) => void }) {
  const [view, setView] = useState("Month");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<(typeof events)[number] | null>(
    null,
  );
  const date = new Date(2024, 3 + offset, 1);
  const days = new Date(2024, 4 + offset, 0).getDate();
  const start = date.getDay();
  function sync() {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ETripleSoft//Learn//EN",
      ...events.flatMap((e) => [
        "BEGIN:VEVENT",
        `UID:learn-${e.day}@etriplesoft`,
        `DTSTAMP:20240401T000000Z`,
        `DTSTART;VALUE=DATE:202404${String(e.day).padStart(2, "0")}`,
        `SUMMARY:${e.title}`,
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ];
    download("etriplesoft-learning.ics", lines.join("\r\n"), "text/calendar");
    notify("Calendar downloaded. Import it into your calendar app.");
  }
  return (
    <div className="columns">
      <div className="primary">
        <div className="calendar-stats">
          {[CalendarDays, ListChecks, Flame].map((I, i) => (
            <Panel key={i}>
              <IconBox icon={I} color={i ? "green" : "blue"} />
              <div>
                <p>
                  {["Upcoming Today", "Assignments Due", "Learning Streak"][i]}
                </p>
                <h2>{["3 events", "2 items", "7 days"][i]}</h2>
                {i < 2 ? (
                  <button
                    className="text-link"
                    onClick={() =>
                      i === 0 ? setView("Agenda") : setSelected(events[4])
                    }
                  >
                    {i === 0 ? "View Today" : "View Deadlines"}
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <span className="badge">Keep it going!</span>
                )}
              </div>
            </Panel>
          ))}
        </div>
        <div className="calendar-toolbar">
          <h1>Learning Calendar</h1>
          <div className="segmented">
            {["Month", "Week", "Agenda"].map((t) => (
              <button
                className={view === t ? "selected" : ""}
                onClick={() => setView(t)}
                key={t}
              >
                {t}
              </button>
            ))}
          </div>
          <Button outline onClick={() => setOffset(0)}>
            Today
          </Button>
          <button
            className="square"
            aria-label="Previous month"
            onClick={() => setOffset(offset - 1)}
          >
            <ChevronLeft size={19} />
          </button>
          <b>
            {date.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </b>
          <button
            className="square"
            aria-label="Next month"
            onClick={() => setOffset(offset + 1)}
          >
            <ChevronRight size={19} />
          </button>
        </div>
        {view === "Agenda" ? (
          <Panel className="agenda">
            {offset === 0 ? (
              events.map((e) => (
                <button key={e.day} onClick={() => setSelected(e)}>
                  <b>APR {e.day}</b>
                  <IconBox icon={e.icon} color={e.type} />
                  <span>
                    <strong>{e.title}</strong>
                    <small>{e.sub}</small>
                  </span>
                  <ChevronRight />
                </button>
              ))
            ) : (
              <p>No events scheduled this month.</p>
            )}
          </Panel>
        ) : (
          <div className={"calendar-grid " + (view === "Week" ? "week" : "")}>
            <div className="weekdays">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="calendar-days">
              {Array.from(
                {
                  length:
                    view === "Week" ? 7 : Math.ceil((days + start) / 7) * 7,
                },
                (_, i) => {
                  const day = i - start + 1;
                  const valid = day > 0 && day <= days;
                  const ev =
                    offset === 0
                      ? events.find((e) => e.day === day)
                      : undefined;
                  return (
                    <div className={!valid ? "outside" : ""} key={i}>
                      <span>
                        {day <= 0
                          ? new Date(2024, 3 + offset, 0).getDate() + day
                          : day > days
                            ? day - days
                            : day}
                      </span>
                      {ev && (
                        <button
                          className={"calendar-event " + ev.type}
                          onClick={() => setSelected(ev)}
                        >
                          <ev.icon size={17} />
                          <strong>{ev.title}</strong>
                          <small>{ev.sub}</small>
                        </button>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}
        <Panel className="event-types">
          <Title>Event Types</Title>
          <div>
            {[
              "Live Session",
              "Course Deadline",
              "Quiz",
              "Office Hours",
              "Business Training",
              "Study Reminder",
            ].map((t, i) => (
              <span key={t}>
                <i
                  style={{
                    background: [
                      "#06f",
                      "#009868",
                      "#00674f",
                      "#7644e9",
                      "#065747",
                      "#9ba5c4",
                    ][i],
                  }}
                />
                {t}
                <small>
                  {
                    [
                      "Online class or webinar",
                      "Assignments or projects",
                      "Assessments",
                      "Instructor Q&A",
                      "Career & industry sessions",
                      "Personal study time",
                    ][i]
                  }
                </small>
              </span>
            ))}
          </div>
        </Panel>
      </div>
      <aside className="right-rail">
        <Panel>
          <Title onClick={() => setView("Agenda")}>Upcoming Today</Title>
          <h3 className="date-label">Monday, April 1, 2024</h3>
          {[
            events[0],
            {
              ...events[4],
              title: "Complete Module 2 Assignment",
              sub: "Due today",
            },
            { ...events[2], title: "Office Hours", sub: "2:00 PM – 3:00 PM" },
          ].map((e, i) => (
            <button
              className="upcoming"
              key={e.title}
              onClick={() => setSelected(e)}
            >
              <IconBox icon={e.icon} color={e.type} />
              <span>
                <strong>{e.title}</strong>
                <small>{e.sub}</small>
                <small>
                  {
                    [
                      "Odoo Development",
                      "Odoo Fundamentals",
                      "Q&A with Expert Instructor",
                    ][i]
                  }
                </small>
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </Panel>
        <Panel>
          <Title onClick={() => setView("Agenda")}>Upcoming This Week</Title>
          {[events[1], events[4], events[5], events[8]].map((e) => (
            <button
              className="upcoming flat"
              key={e.day}
              onClick={() => setSelected(e)}
            >
              <IconBox icon={e.icon} color={e.type} />
              <span>
                <strong>
                  {e.title}: {e.sub.split(" · ")[0]}
                </strong>
                <small>April {e.day}, 2024</small>
                <small>Odoo Fundamentals</small>
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </Panel>
        <Panel className="sync-panel">
          <IconBox icon={CalendarDays} />
          <div>
            <h3>Sync Your Calendar</h3>
            <p>
              Add ETripleSoft Learn events to Google Calendar, Outlook, or
              Apple.
            </p>
            <Button outline onClick={sync}>
              Sync Calendar <ArrowRight size={19} />
            </Button>
          </div>
        </Panel>
      </aside>
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-title"
            className="modal panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close event"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
            <IconBox icon={selected.icon} color={selected.type} />
            <h2 id="event-title">{selected.title}</h2>
            <p>
              April {selected.day}, 2024 · {selected.sub}
            </p>
            <Button
              onClick={() => {
                setSelected(null);
                go(
                  selected.title.includes("Quiz")
                    ? "assessment"
                    : "detail-course",
                );
              }}
            >
              View Course <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function download(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Certificates({ notify }: { notify: (s: string) => void }) {
  return (
    <>
      <div className="certificate-profile">
        <Panel className="profile-summary">
          <Avatar large />
          <div>
            <h2>
              Ahmed Salah{" "}
              <button
                aria-label="Edit profile"
                className="icon-button"
                onClick={() => go("settings")}
              >
                <Pencil size={16} />
              </button>
            </h2>
            <a href="#courses">Odoo Learner</a>
            <p>
              Passionate about business technology and
              <br />
              building a career with Odoo.
            </p>
            <small>
              <Globe size={16} />
              Karachi, Pakistan　 <CalendarDays size={16} />
              Joined Jan 2024
            </small>
          </div>
          <div className="profile-stats">
            {[BookOpen, Clock, BarChart3].map((I, i) => (
              <div key={i}>
                <I />
                <b>{["10", "42h", "4.7"][i]}</b>
                <span>
                  {["Completed Courses", "Learning Time", "Average Rating"][i]}
                </span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="quote">
          <span>“</span>
          <blockquote>
            Continuous learning
            <br />
            today, a better tomorrow.
          </blockquote>
          <p>— Ahmed Salah</p>
        </Panel>
      </div>
      <div className="columns certificate-columns">
        <div className="primary">
          <Title
            link="View All Certificates"
            onClick={() =>
              document
                .getElementById("completed")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            My Certificate
          </Title>
          <Panel className="certificate-panel">
            <div className="certificate" id="certificate">
              <div className="certificate-top">
                <img src={A + "logo-display.svg"} alt="ETripleSoft Learn" />
                <i>Certificate of Completion</i>
              </div>
              <div className="certificate-body">
                <p>This is to certify that</p>
                <h1>Ahmed Salah</h1>
                <p>has successfully completed the</p>
                <h2>Crash Course Odoo ERP</h2>
                <p>
                  A comprehensive, hands-on course covering Sales, Accounting,
                  CRM,
                  <br />
                  Purchase, Inventory and key business workflows in Odoo.
                </p>
              </div>
              <div className="certificate-seal">
                <span className="ribbon" />
                <img src={A + "logo-display.svg"} alt="" />
              </div>
              <div className="certificate-bottom">
                <div>
                  <small>Completed on</small>
                  <b>March 10, 2024</b>
                </div>
                <div className="signature">
                  <i>Usman Khalid</i>
                  <b>Usman Khalid</b>
                  <small>CEO, ETripleSoft</small>
                </div>
                <div className="odoo-word">
                  odoo
                  <small>
                    Open. Source.
                    <br />
                    Greater Possibilities.
                  </small>
                </div>
              </div>
            </div>
            <div className="button-row">
              <Button onClick={() => window.print()}>
                <Download size={21} />
                Download Certificate
              </Button>
              <Button
                outline
                onClick={() => {
                  navigator.clipboard?.writeText(location.href);
                  notify("Certificate page link copied.");
                }}
              >
                <Share2 size={21} />
                Share Certificate
              </Button>
            </div>
          </Panel>
          <div className="certificate-lower">
            <Panel className="completed-courses">
              <div id="completed">
                <Title onClick={() => go("courses")}>Completed Courses</Title>
              </div>
              {courses.slice(0, 3).map((c, i) => (
                <a className="completed-row" href="#detail-course" key={c.name}>
                  <img src={A + c.image} alt="" />
                  <div>
                    <strong>{c.name}</strong>
                    <small>
                      <span>Completed</span> ·{" "}
                      {["Mar 10, 2024", "Feb 12, 2024", "Jan 20, 2024"][i]}
                    </small>
                  </div>
                  <ChevronRight size={18} />
                </a>
              ))}
            </Panel>
            <Panel>
              <Title>Recommended Next Course</Title>
              <div className="recommended">
                <img src={A + "course-2.svg"} alt="Odoo Development" />
                <div>
                  <h3>Odoo Development</h3>
                  <p>
                    Learn to build custom modules and extend Odoo with Python.
                  </p>
                  <small>
                    <Clock size={15} />
                    8h 30m　
                    <ListChecks size={15} />
                    12 Lessons
                  </small>
                </div>
              </div>
              <Button outline onClick={() => go("detail-course")}>
                Start Learning <ArrowRight size={18} />
              </Button>
            </Panel>
          </div>
        </div>
        <aside className="right-rail">
          <Panel>
            <Title
              onClick={() => notify("All four achievements are shown below.")}
            >
              My Achievements
            </Title>
            {[Trophy, Star, Flame, Users].map((I, i) => (
              <div className="achievement" key={i}>
                <IconBox
                  icon={I}
                  color={["orange", "red", "orange", "blue"][i]}
                />
                <div>
                  <strong>
                    {
                      [
                        "Course Completed",
                        "First Certificate",
                        "7-Day Learning Streak",
                        "Community Member",
                      ][i]
                    }
                  </strong>
                  <small>
                    {
                      [
                        "Crash Course Odoo ERP",
                        "You earned your first certificate!",
                        "Keep the momentum going!",
                        "You joined the ETripleSoft community",
                      ][i]
                    }
                  </small>
                  <small>
                    {
                      [
                        "Mar 10, 2024",
                        "Mar 10, 2024",
                        "Mar 8, 2024",
                        "Jan 15, 2024",
                      ][i]
                    }
                  </small>
                </div>
              </div>
            ))}
          </Panel>
          <Panel>
            <Title>Your Learning Streak</Title>
            <div className="streak-heading">
              <Flame color="#ff671d" size={42} />
              <div>
                <h2>14 Days</h2>
                <p>Great consistency! Keep learning!</p>
              </div>
            </div>
            <div className="streak-days">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                <div key={d}>
                  <span className={i < 6 ? "done" : ""}>
                    {i < 6 && <Check size={17} />}
                  </span>
                  <small>{d}</small>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <Title>Learning Progress</Title>
            {[BookOpen, BarChart3, Clock].map((I, i) => (
              <div className="learning-progress" key={i}>
                <IconBox icon={I} color={i ? "blue" : "green"} />
                <div>
                  <strong>{["10 / 10", "8 / 10", "42h"][i]}</strong>
                  <small>
                    {
                      [
                        "Courses Completed",
                        "Learning Paths",
                        "Total Learning Time",
                      ][i]
                    }
                  </small>
                </div>
                <div>
                  <b>{[100, 80, 65][i]}%</b>
                  <Progress value={[100, 80, 65][i]} />
                </div>
              </div>
            ))}
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Payment({ notify }: { notify: (s: string) => void }) {
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(false);
  function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    notify("Demo checkout complete. No payment was collected.");
    go("detail-course");
  }
  return (
    <form className="columns payment-columns" onSubmit={pay}>
      <div className="primary">
        <div className="checkout-steps">
          {["Review Order", "Billing Details", "Payment"].map((s, i) => (
            <React.Fragment key={s}>
              <span>
                <b>{i < 2 ? <Check /> : 3}</b>
                {s}
              </span>
              {i < 2 && <i />}
            </React.Fragment>
          ))}
        </div>
        <Panel>
          <h2>1. Billing Information</h2>
          <p>
            Enter your details to create your account and receive the course.
          </p>
          <div className="form-grid">
            <Field label="Full Name" value="Ahmed Raza" required />
            <Field
              label="Email Address"
              type="email"
              value="ahmed.raza@example.com"
              required
            />
            <Field
              label="Country"
              value="United States"
              options={[
                "United States",
                "Egypt",
                "Pakistan",
                "United Kingdom",
                "United Arab Emirates",
              ]}
              required
            />
            <Field
              label="Phone Number"
              type="tel"
              value="+1 (555) 123-4567"
              required
            />
          </div>
        </Panel>
        <Panel>
          <h2>2. Payment</h2>
          <p>Complete your payment securely using Kashier.</p>
          <div className="payment-box">
            <div className="payment-provider">
              <span className="radio-dot" />
              <div>
                <h3>Pay with Kashier</h3>
                <small>Secure. Reliable. Trusted in the Middle East.</small>
              </div>
              <strong>
                <CreditCard /> Kashier
              </strong>
            </div>
            <div className="payment-benefits">
              {[Lock, Zap, ShieldCheck].map((I, i) => (
                <div key={i}>
                  <IconBox icon={I} color="green" />
                  <span>
                    <b>
                      {
                        [
                          "Secure Payment",
                          "Instant Confirmation",
                          "Trusted by Learners",
                        ][i]
                      }
                    </b>
                    <small>
                      {
                        [
                          "Your data is encrypted and protected.",
                          "Get immediate access after successful payment.",
                          "A reliable payment partner across the region.",
                        ][i]
                      }
                    </small>
                  </span>
                </div>
              ))}
            </div>
            <Field
              label="Card Number"
              icon={CreditCard}
              placeholder="1234 5678 9012 3456"
            />
            <div className="form-grid">
              <Field
                label="Expiry Date"
                icon={CalendarDays}
                placeholder="MM / YY"
              />
              <Field label="CVV" icon={Lock} placeholder="123" />
            </div>
            <Field
              label="Cardholder Name"
              icon={User}
              placeholder="Name as shown on card"
            />
            <small>
              Make sure your card details are correct to avoid payment issues.
            </small>
          </div>
        </Panel>
      </div>
      <aside className="right-rail">
        <Panel className="order-summary">
          <Title link="Edit" onClick={() => go("courses")}>
            Order Summary
          </Title>
          <div className="order-course">
            <img src={A + "course-0.svg"} alt="Crash Course Odoo ERP" />
            <div>
              <h3>Crash Course Odoo ERP</h3>
              <p>By Ahmed Raza</p>
              <span>
                <Clock size={18} />
                10h 46m　
                <BookOpen size={18} />
                10 Lessons
              </span>
            </div>
          </div>
          <dl>
            <div>
              <dt>Course Price</dt>
              <dd>$79.00</dd>
            </div>
            <div>
              <dt>Subtotal</dt>
              <dd>${discount ? "71.10" : "79.00"}</dd>
            </div>
            <div>
              <dt>
                Tax (VAT 10%)　
                <Info size={16} />
              </dt>
              <dd>${discount ? "7.11" : "7.90"}</dd>
            </div>
          </dl>
          <div className="total">
            <h2>Total</h2>
            <h2>${discount ? "78.21" : "86.90"}</h2>
          </div>
          <div className="coupon">
            <div className="input-wrap">
              <Bookmark size={20} />
              <input
                aria-label="Coupon code"
                placeholder="Enter coupon code"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (coupon.toUpperCase() === "LEARN10") {
                  setDiscount(true);
                  notify("10% demo discount applied.");
                } else
                  notify("This coupon is not valid. Try LEARN10 for the demo.");
              }}
            >
              Apply
            </button>
          </div>
        </Panel>
        <Panel className="purchase-protection">
          <h3>
            <ShieldCheck size={38} />
            Your Purchase is Protected
          </h3>
          {[
            "30-Day Money-Back Guarantee",
            "Instant Access",
            "Secure & Encrypted",
          ].map((s, i) => (
            <div key={s}>
              <IconBox icon={Check} color="green" />
              <div>
                <b>{s}</b>
                <p>
                  {
                    [
                      "Not satisfied? Get a full refund within 30 days.",
                      "Start learning immediately after payment.",
                      "Your payment information is always protected with Kashier.",
                    ][i]
                  }
                </p>
              </div>
            </div>
          ))}
        </Panel>
        <Button type="submit" className="pay-button">
          <Lock />
          Pay with Kashier <ArrowRight />
        </Button>
        <p className="terms">
          By completing this purchase, you agree to our
          <br />
          <button
            type="button"
            onClick={() =>
              notify("Terms of Service are not configured for this local demo.")
            }
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button
            type="button"
            onClick={() =>
              notify("Privacy Policy is not configured for this local demo.")
            }
          >
            Privacy Policy
          </button>
        </p>
      </aside>
    </form>
  );
}

function SettingsPage({ notify }: { notify: (s: string) => void }) {
  const [tab, setTab] = useState("Profile");
  const [photo, setPhoto] = useState(
    localStorage.getItem("profile-photo") || "",
  );
  const [bio, setBio] = useState(
    localStorage.getItem("profile-bio") ||
      "Computer engineering student passionate about software development and AI.\nExcited to keep learning!",
  );
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    stored("preferences", {}),
  );
  const [formVersion, setFormVersion] = useState(0);
  const settings = [
    "Profile",
    "Account",
    "Security",
    "Notifications",
    "Learning Preferences",
    "AI Assistant Preferences",
  ];
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (tab === "Security") {
      if (data.get("New Password") !== data.get("Confirm New Password")) {
        notify("The new passwords do not match.");
        return;
      }
      if (String(data.get("New Password")).length < 8) {
        notify("Use at least 8 characters for your new password.");
        return;
      }
      notify(
        "Password validated. Connect authentication to update it securely.",
      );
      e.currentTarget.reset();
      return;
    }
    localStorage.setItem(
      "profile-data",
      JSON.stringify({
        ...stored("profile-data", {}),
        ...Object.fromEntries(data),
      }),
    );
    if (photo) {
      try {
        localStorage.setItem("profile-photo", photo);
      } catch {
        notify("Photo is too large to save. Please choose a smaller image.");
        return;
      }
    }
    if (data.get("Your Name"))
      localStorage.setItem("learner-name", String(data.get("Your Name")));
    localStorage.setItem("profile-bio", bio);
    localStorage.setItem("preferences", JSON.stringify(toggles));
    notify("Your changes have been saved.");
  }
  return (
    <div className="settings-layout">
      <Panel className="settings-nav">
        <h2>Settings</h2>
        <p>Customize your account and experience</p>
        {settings.map((s, i) => {
          const I = [User, CreditCard, Lock, Bell, BarChart3, Sparkles][i];
          return (
            <button
              className={tab === s ? "selected" : ""}
              onClick={() => setTab(s)}
              key={s}
            >
              <I />
              <span>
                <strong>{s}</strong>
                <small>
                  {
                    [
                      "Personal information and details",
                      "Manage your account settings",
                      "Password and security options",
                      "Control what you get notified about",
                      "Personalize your learning experience",
                      "Customize your AI learning assistant",
                    ][i]
                  }
                </small>
              </span>
            </button>
          );
        })}
      </Panel>
      <form
        key={`${tab}-${formVersion}`}
        className="panel settings-form"
        onSubmit={save}
      >
        <div className="settings-form-heading">
          <div>
            <h1>{tab}</h1>
            <p>
              {tab === "Profile"
                ? "Keep your personal information up to date."
                : "Manage your " + tab.toLowerCase() + "."}
            </p>
          </div>
          {tab === "Profile" && (
            <div className="change-photo">
              {photo ? (
                <img className="avatar" src={photo} alt="Your profile" />
              ) : (
                <Avatar />
              )}
              <div>
                <label className="btn outline">
                  <Camera size={20} />
                  Change Photo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 5 * 1024 * 1024) {
                        notify("Please choose an image smaller than 5 MB.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        setPhoto(String(reader.result));
                        notify("Photo selected. Save Changes to keep it.");
                      };
                      reader.readAsDataURL(f);
                    }}
                  />
                </label>
                <small>JPG, PNG or GIF. Max 5MB.</small>
              </div>
            </div>
          )}
        </div>
        {tab === "Profile" ? (
          <>
            <div className="form-grid">
              <Field
                label="Your Name"
                icon={User}
                value={localStorage.getItem("learner-name") || "Ahmed Salah"}
                required
              />
              <Field
                label="Your Email"
                icon={Mail}
                type="email"
                value="ahmed.salah@university.edu"
                required
              />
              <Field label="Age" icon={CalendarDays} type="number" value="24" />
              <Field
                label="Gender"
                icon={User}
                value="Male"
                options={["Male", "Female", "Prefer not to say"]}
              />
              <Field
                label="University"
                icon={Building2}
                value="Cairo University"
                options={[
                  "Cairo University",
                  "Ain Shams University",
                  "Alexandria University",
                  "Other",
                ]}
              />
              <Field
                label="Faculty"
                icon={GraduationCap}
                value="Faculty of Engineering"
                options={[
                  "Faculty of Engineering",
                  "Computer Science",
                  "Business",
                  "Other",
                ]}
              />
              <Field
                label="Timezone"
                icon={Globe}
                value="(GMT+2) Cairo, Egypt"
                options={[
                  "(GMT+2) Cairo, Egypt",
                  "(GMT+0) London",
                  "(GMT+5) Karachi",
                ]}
              />
              <Field
                label="Language"
                icon={Languages}
                value="English (US)"
                options={["English (US)", "Arabic"]}
              />
            </div>
            <div className="about-you">
              <Pencil />
              <div>
                <h3>About You</h3>
                <p>
                  Tell us a bit about yourself (optional). This helps us
                  personalize your experience.
                </p>
                <textarea
                  aria-label="About you"
                  maxLength={500}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
                <small>{bio.length}/500</small>
              </div>
            </div>
          </>
        ) : tab === "Security" ? (
          <div className="form-grid">
            <Field
              label="Current Password"
              type="password"
              icon={Lock}
              required
            />
            <Field label="New Password" type="password" icon={Lock} required />
            <Field
              label="Confirm New Password"
              type="password"
              icon={Lock}
              required
            />
          </div>
        ) : tab === "Account" ? (
          <div className="form-grid">
            <Field
              label="Account Email"
              type="email"
              icon={Mail}
              value="ahmed.salah@university.edu"
            />
            <Field
              label="Account Type"
              value="Professional"
              options={["Student", "Professional", "Company enrolled"]}
            />
          </div>
        ) : (
          <div className="preference-options">
            {(tab === "Notifications"
              ? [
                  "Email notifications",
                  "Course reminders",
                  "Assignment deadlines",
                  "Community updates",
                ]
              : tab === "Learning Preferences"
                ? [
                    "Daily learning reminders",
                    "Show course recommendations",
                    "Autoplay next lesson",
                  ]
                : [
                    "Use current course context",
                    "Personalized recommendations",
                    "Save conversation history",
                  ]
            ).map((t) => (
              <label key={t}>
                <span>
                  <strong>{t}</strong>
                  <p>Enable {t.toLowerCase()} for your learning experience.</p>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-label={t}
                  aria-checked={toggles[t] !== false}
                  className={"switch " + (toggles[t] !== false ? "on" : "")}
                  onClick={() =>
                    setToggles({ ...toggles, [t]: toggles[t] === false })
                  }
                />
              </label>
            ))}
          </div>
        )}
        <div className="settings-buttons">
          <Button
            outline
            onClick={() => {
              setBio(
                localStorage.getItem("profile-bio") ||
                  "Computer engineering student passionate about software development and AI.\nExcited to keep learning!",
              );
              setPhoto(localStorage.getItem("profile-photo") || "");
              setToggles(stored("preferences", {}));
              setFormVersion((v) => v + 1);
              notify("Unsaved changes discarded.");
            }}
          >
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
