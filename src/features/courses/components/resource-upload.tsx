"use client";
import { useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AdminResource } from "../server/admin-content";
export function ResourceUpload({
  lessonId,
  resources,
}: {
  lessonId: string;
  resources: AdminResource[];
}) {
  const t = useTranslations("contentAdmin");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const file = useRef<HTMLInputElement>(null);
  async function call(body: object) {
    const response = await fetch("/api/admin/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, locale }),
    });
    const value: unknown = await response.json();
    if (!response.ok)
      throw new Error(
        value &&
          typeof value === "object" &&
          "error" in value &&
          value.error === "ancestors"
          ? "publishParents"
          : "uploadFailed",
      );
    return value;
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const value = file.current?.files?.[0];
      if (
        !value ||
        value.size > 50 * 1024 * 1024 ||
        !value.name.toLowerCase().endsWith(".pdf")
      )
        throw new Error("pdfOnly");
      const target = await call({
        action: "begin",
        lessonId,
        label: form.get("label"),
        size: value.size,
      });
      if (
        !target ||
        typeof target !== "object" ||
        !("resourceId" in target) ||
        typeof target.resourceId !== "string" ||
        !("key" in target) ||
        typeof target.key !== "string" ||
        !("token" in target) ||
        typeof target.token !== "string"
      )
        throw new Error("uploadFailed");
      const result = await createClient()
        .storage.from("course-resources")
        .uploadToSignedUrl(target.key, target.token, value, {
          contentType: "application/pdf",
        });
      if (result.error) throw new Error("uploadFailed");
      await call({ action: "validate", resourceId: target.resourceId });
      setMessage("uploadedDraft");
      if (file.current) file.current.value = "";
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "uploadFailed");
    } finally {
      setBusy(false);
    }
  }
  async function publish(id: string) {
    setBusy(true);
    setMessage("");
    try {
      await call({ action: "publish", resourceId: id });
      setMessage("resourcePublished");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "uploadFailed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-resource-upload">
      <h4>{t("documents")}</h4>
      <form onSubmit={upload} className="admin-form">
        <label className="admin-field">
          {t("documentLabel")}
          <input name="label" maxLength={200} required disabled={busy} />
        </label>
        <label className="admin-field">
          {t("pdfFile")}
          <input
            type="file"
            accept="application/pdf,.pdf"
            ref={file}
            required
            disabled={busy}
          />
        </label>
        <button className="btn outline" disabled={busy}>
          {t(busy ? "saving" : "uploadDraft")}
        </button>
      </form>
      <p className="admin-hint">{t("uploadHint")}</p>
      {resources.map((resource) => (
        <div className="admin-resource-row" key={resource.id}>
          <span dir="auto">{resource.label}</span>
          <span>{t(resource.published ? "published" : "draft")}</span>
          {!resource.published && (
            <button
              type="button"
              className="btn outline"
              disabled={busy}
              onClick={() => void publish(resource.id)}
            >
              {t("publishDocument")}
            </button>
          )}
        </div>
      ))}
      {message && <p role="status">{t(message)}</p>}
    </section>
  );
}
