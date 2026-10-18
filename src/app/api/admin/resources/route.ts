import { NextResponse } from "next/server";
import { createClient as createStorageClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/supabase/auth";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { hasTrustedRequestOrigin } from "@/lib/http/trusted-origin";
import { readBoundedJson } from "@/lib/http/bounded-json";
import { isLocale } from "@/i18n/config";
import type { Database } from "@/types/database";
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function POST(request: Request) {
  if (!hasTrustedRequestOrigin(request)) return reply({ error: "origin" }, 403);
  if ((await getAdminAccess()).status !== "admin")
    return reply({ error: "access" }, 403);
  let input: unknown;
  try {
    input = await readBoundedJson(request);
  } catch {
    return reply({ error: "invalid" }, 400);
  }
  if (
    !input ||
    typeof input !== "object" ||
    !("action" in input) ||
    !("locale" in input) ||
    typeof input.locale !== "string" ||
    !isLocale(input.locale)
  )
    return reply({ error: "invalid" }, 400);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return reply({ error: "configuration" }, 503);
  const storage = createStorageClient<Database>(
    getSupabasePublicEnv().url,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ).storage.from("course-resources");
  const client = await createClient();
  if (input.action === "begin") {
    if (
      !("lessonId" in input) ||
      typeof input.lessonId !== "string" ||
      !uuid.test(input.lessonId) ||
      !("label" in input) ||
      typeof input.label !== "string" ||
      !input.label.trim() ||
      input.label.length > 200 ||
      !("size" in input) ||
      typeof input.size !== "number" ||
      !Number.isSafeInteger(input.size) ||
      input.size < 5 ||
      input.size > 50 * 1024 * 1024
    )
      return reply({ error: "invalid" }, 400);
    const { data, error } = await client.rpc("admin_prepare_resource_upload", {
      p_lesson_id: input.lessonId,
      p_locale: input.locale,
      p_label: input.label.trim(),
    });
    if (error || !data?.[0]) return reply({ error: "rule" }, 409);
    const resource = data[0];
    const signed = await storage.createSignedUploadUrl(
      resource.storage_object_key,
      { upsert: false },
    );
    if (signed.error || !signed.data) return reply({ error: "upload" }, 503);
    return reply({
      resourceId: resource.resource_id,
      key: resource.storage_object_key,
      token: signed.data.token,
    });
  }
  if (
    !["validate", "publish"].includes(String(input.action)) ||
    !("resourceId" in input) ||
    typeof input.resourceId !== "string" ||
    !uuid.test(input.resourceId)
  )
    return reply({ error: "invalid" }, 400);
  const metadata = await client.rpc("admin_get_resource_upload", {
    p_id: input.resourceId,
    p_locale: input.locale,
  });
  const resource = metadata.data?.[0];
  if (metadata.error || !resource) return reply({ error: "access" }, 403);
  // The key is read from an owner/current-admin projection; no browser-supplied path is used.
  const info = await storage.info(resource.storage_object_key);
  if (
    info.error ||
    !info.data ||
    typeof info.data.size !== "number" ||
    info.data.size < 5 ||
    info.data.size > 50 * 1024 * 1024 ||
    info.data.contentType !== "application/pdf"
  )
    return reply({ error: "pdf" }, 409);
  const downloaded = await storage.download(resource.storage_object_key);
  if (
    downloaded.error ||
    !downloaded.data ||
    downloaded.data.size !== info.data.size
  )
    return reply({ error: "upload" }, 503);
  const header = new Uint8Array(
    await downloaded.data.slice(0, 5).arrayBuffer(),
  );
  if (String.fromCharCode(...header) !== "%PDF-")
    return reply({ error: "pdf" }, 409);
  if (input.action === "publish") {
    const published = await client.rpc(
      "admin_set_resource_translation_publication",
      {
        p_resource_id: input.resourceId,
        p_locale: input.locale,
        p_publish: true,
      },
    );
    if (published.error) return reply({ error: "ancestors" }, 409);
  }
  return reply({ validated: true, published: input.action === "publish" });
}
