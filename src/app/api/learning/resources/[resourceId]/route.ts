import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { isLocale } from "@/i18n/config";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ resourceId: string }> },
) {
  const { resourceId } = await context.params;
  const query = new URL(request.url).searchParams;
  const lessonId = query.get("lessonId") ?? "";
  const locale = query.get("locale") ?? "";
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  if (!uuid.test(resourceId) || !uuid.test(lessonId) || !isLocale(locale))
    return NextResponse.json({}, { status: 404, headers });
  const client = await createClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return NextResponse.json({}, { status: 401, headers });
  const { data, error } = await client.rpc("learner_get_lesson_resources", {
    p_lesson_id: lessonId,
    p_locale: locale,
  });
  const resource = data?.find((item) => item.resource_id === resourceId);
  if (error || !resource)
    return NextResponse.json({}, { status: 404, headers });
  if (resource.kind === "external_url") {
    try {
      const url = new URL(resource.external_url);
      if (url.protocol === "https:" && !url.username && !url.password)
        return NextResponse.redirect(url, { headers });
    } catch {
      /* Invalid resource links fail closed. */
    }
    return NextResponse.json({}, { status: 404, headers });
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !resource.storage_object_key)
    return NextResponse.json({}, { status: 503, headers });
  // Elevated storage signing happens only after the owner/preview RPC checks this exact resource.
  const service = createServiceClient<Database>(
    getSupabasePublicEnv().url,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: signed, error: signingError } = await service.storage
    .from("course-resources")
    .createSignedUrl(resource.storage_object_key, 60, { download: true });
  if (signingError || !signed)
    return NextResponse.json({}, { status: 503, headers });
  return NextResponse.redirect(signed.signedUrl, { headers });
}
