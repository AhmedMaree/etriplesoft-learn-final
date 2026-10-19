"use client";
import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import type {
  EditableCourse,
  AdminModule,
  AdminLesson,
} from "../server/admin-content";
import { ResourceUpload } from "./resource-upload";
const value = (form: FormData, name: string) => String(form.get(name) ?? "");
async function send(body: object) {
  const response = await fetch("/api/admin/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await response.json();
  if (!response.ok) throw new Error("saveFailed");
  return data;
}
export function CourseEditor({
  course,
  modules = [],
}: {
  course?: EditableCourse;
  modules?: AdminModule[];
}) {
  const t = useTranslations("contentAdmin");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const data = await send({
        action: "course",
        locale,
        ...(course ? { id: course.id } : {}),
        slug: value(form, "slug"),
        title: value(form, "title"),
        summary: value(form, "summary"),
        description: value(form, "description"),
        category: value(form, "category"),
        level: value(form, "level"),
        price: Math.round(Number(value(form, "price")) * 100),
        published: form.get("published") === "on",
      });
      setMessage("saved");
      if (
        !course &&
        data &&
        typeof data === "object" &&
        "id" in data &&
        typeof data.id === "string"
      )
        router.push(`/admin/courses/${data.id}`);
      else router.refresh();
    } catch {
      setMessage("saveFailed");
    } finally {
      setBusy(false);
    }
  }
  async function createModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await send({
        action: "createModule",
        locale,
        id: course?.id,
        title: value(form, "title"),
      });
      setMessage("saved");
      router.refresh();
    } catch {
      setMessage("saveFailed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="course-editor">
      <form onSubmit={save} className="admin-form">
        <fieldset disabled={busy || course?.status === "archived"}>
          <legend>{t(course ? "editCourse" : "newCourse")}</legend>
          <label className="admin-field">
            {t("title")}
            <input
              name="title"
              maxLength={160}
              defaultValue={course?.title ?? ""}
              required
            />
          </label>
          <label className="admin-field">
            {t("slug")}
            <input
              name="slug"
              maxLength={100}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              defaultValue={course?.slug ?? ""}
              required
              readOnly={!!course}
              dir="ltr"
            />
          </label>
          <label className="admin-field">
            {t("summary")}
            <textarea
              name="summary"
              maxLength={1000}
              defaultValue={course?.summary ?? ""}
              required
            />
          </label>
          <label className="admin-field">
            {t("description")}
            <textarea
              name="description"
              maxLength={20000}
              defaultValue={course?.description ?? ""}
            />
          </label>
          <label className="admin-field">
            {t("price")}
            <input
              name="price"
              type="number"
              min="0"
              max="9999999.99"
              step="0.01"
              defaultValue={((course?.price ?? 0) / 100).toFixed(2)}
              required
              dir="ltr"
            />
          </label>
          <label className="admin-field">
            {t("category")}
            <input
              name="category"
              maxLength={80}
              defaultValue={course?.category ?? ""}
            />
          </label>
          <label className="admin-field">
            {t("level")}
            <select
              aria-label={t("level")}
              name="level"
              defaultValue={course?.level || "beginner"}
            >
              <option value="beginner">{t("beginner")}</option>
              <option value="intermediate">{t("intermediate")}</option>
              <option value="advanced">{t("advanced")}</option>
            </select>
          </label>
          <label className="admin-check">
            <input
              name="published"
              type="checkbox"
              defaultChecked={course?.published ?? false}
            />
            {t("publishLocale")}
          </label>
          <button className="btn">{t(busy ? "saving" : "saveCourse")}</button>
        </fieldset>
      </form>
      {message && <p role="status">{t(message)}</p>}
      {course && (
        <>
          <p className="admin-hint admin-callout">{t("workflow")}</p>
          {modules.map((module) => (
            <ModuleEditor key={`${module.id}-${locale}`} module={module} />
          ))}
          <form className="admin-form" onSubmit={createModule}>
            <label className="admin-field">
              {t("newModule")}
              <input name="title" maxLength={160} required disabled={busy} />
            </label>
            <button
              className="btn outline"
              disabled={busy || course.status === "archived"}
            >
              {t("addModule")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
function ModuleEditor({ module }: { module: AdminModule }) {
  const t = useTranslations("contentAdmin");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function action(
    event: FormEvent<HTMLFormElement>,
    kind: "module" | "createLesson",
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await send({
        action: kind,
        locale,
        id: module.id,
        title: value(form, "title"),
        ...(kind === "module"
          ? {
              description: value(form, "description"),
              required: form.get("required") === "on",
              published: form.get("published") === "on",
            }
          : { type: value(form, "type") }),
      });
      setMessage("saved");
      router.refresh();
    } catch {
      setMessage("saveFailed");
    } finally {
      setBusy(false);
    }
  }
  async function move(index: number, delta: number) {
    const ids = module.lessons.map((item) => item.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    setBusy(true);
    try {
      await send({ action: "reorder", locale, id: module.id, ids });
      router.refresh();
    } catch {
      setMessage("saveFailed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-module panel">
      <h2 dir="auto">
        {module.position}. {module.title || t("untitled")}
      </h2>
      <form
        className="admin-form"
        onSubmit={(event) => void action(event, "module")}
      >
        <fieldset disabled={busy}>
          <legend>{t("module")}</legend>
          <label className="admin-field">
            {t("title")}
            <input
              name="title"
              maxLength={160}
              required
              defaultValue={module.title}
            />
          </label>
          <label className="admin-field">
            {t("description")}
            <textarea
              name="description"
              maxLength={2000}
              defaultValue={module.description}
            />
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              name="required"
              defaultChecked={module.required}
            />
            {t("requiredModule")}
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              name="published"
              defaultChecked={module.published}
            />
            {t("publishLocale")}
          </label>
          <button className="btn outline">{t("saveModule")}</button>
        </fieldset>
      </form>
      {message && <p role="status">{t(message)}</p>}
      {module.lessons.map((lesson, index) => (
        <div key={lesson.id}>
          <div className="admin-order-controls">
            <button
              className="btn outline"
              disabled={busy || index === 0}
              onClick={() => void move(index, -1)}
            >
              {t("moveUp")}
            </button>
            <button
              className="btn outline"
              disabled={busy || index === module.lessons.length - 1}
              onClick={() => void move(index, 1)}
            >
              {t("moveDown")}
            </button>
          </div>
          <LessonEditor lesson={lesson} />
        </div>
      ))}
      <form
        className="admin-form"
        onSubmit={(event) => void action(event, "createLesson")}
      >
        <label className="admin-field">
          {t("newLesson")}
          <input name="title" maxLength={200} required disabled={busy} />
        </label>
        <label className="admin-field">
          {t("lessonType")}
          <select
            aria-label={t("lessonType")}
            name="type"
            defaultValue="video"
            disabled={busy}
          >
            {["video", "resource", "article", "assessment"].map((type) => (
              <option key={type} value={type}>
                {t(type)}
              </option>
            ))}
          </select>
        </label>
        <button className="btn outline" disabled={busy}>
          {t("addLesson")}
        </button>
      </form>
    </section>
  );
}
function LessonEditor({ lesson }: { lesson: AdminLesson }) {
  const t = useTranslations("contentAdmin");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await send({
        action: "lesson",
        id: lesson.id,
        locale,
        title: value(form, "title"),
        summary: value(form, "summary"),
        body: value(form, "body"),
        required: form.get("required") === "on",
        preview: form.get("preview") === "on",
        duration: value(form, "duration")
          ? Number(value(form, "duration"))
          : null,
        published: form.get("published") === "on",
      });
      setMessage("saved");
      router.refresh();
    } catch {
      setMessage("saveFailed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="admin-lesson"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>
        <span dir="auto">
          {lesson.position}. {lesson.title || t("untitled")}
        </span>{" "}
        · {t(lesson.type)} · {t(lesson.published ? "published" : "draft")}
      </summary>
      <form className="admin-form" onSubmit={save}>
        <fieldset disabled={busy || lesson.status === "archived"}>
          <legend>{t("editLesson")}</legend>
          <label className="admin-field">
            {t("title")}
            <input
              name="title"
              maxLength={200}
              required
              defaultValue={lesson.title}
            />
          </label>
          <label className="admin-field">
            {t("summary")}
            <textarea
              name="summary"
              maxLength={1000}
              defaultValue={lesson.summary}
            />
          </label>
          <label className="admin-field">
            {t("body")}
            <textarea
              name="body"
              maxLength={100000}
              defaultValue={lesson.body}
            />
          </label>
          <label className="admin-field">
            {t("duration")}
            <input
              name="duration"
              type="number"
              min="1"
              step="1"
              defaultValue={lesson.duration ?? ""}
            />
          </label>
          <label className="admin-check">
            <input
              name="required"
              type="checkbox"
              defaultChecked={lesson.required}
            />
            {t("requiredLesson")}
          </label>
          <label className="admin-check">
            <input
              name="preview"
              type="checkbox"
              defaultChecked={lesson.preview}
            />
            {t("preview")}
          </label>
          <label className="admin-check">
            <input
              name="published"
              type="checkbox"
              defaultChecked={lesson.published}
            />
            {t("publishLocale")}
          </label>
          <button className="btn outline">{t("saveLesson")}</button>
        </fieldset>
      </form>
      {message && <p role="status">{t(message)}</p>}
      {lesson.type === "video" && (
        <Link className="btn outline" href={`/admin/videos?lesson=${lesson.id}`}>
          {t("manageVideo")}
        </Link>
      )}
      {lesson.type === "assessment" && (
        <Link className="btn outline" href="/admin/assessments">
          {t("manageQuiz")}
        </Link>
      )}
      <ResourceUpload lessonId={lesson.id} resources={lesson.resources} />
    </details>
  );
}
