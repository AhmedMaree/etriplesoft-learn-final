import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasTrustedRequestOrigin } from "@/lib/http/trusted-origin";
import { readBoundedJson } from "@/lib/http/bounded-json";
import { isLocale } from "@/i18n/config";
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  if (!hasTrustedRequestOrigin(request)) return reply({ error: "origin" }, 403);
  let value: unknown;
  try {
    value = await readBoundedJson(request);
  } catch {
    return reply({ error: "invalid" }, 400);
  }
  if (
    !value ||
    typeof value !== "object" ||
    !("completionId" in value) ||
    typeof value.completionId !== "string" ||
    !("locale" in value) ||
    typeof value.locale !== "string" ||
    !isLocale(value.locale)
  )
    return reply({ error: "invalid" }, 400);
  const client = await createClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return reply({ error: "authentication" }, 401);
  const { data, error } = await client.rpc("learner_issue_certificate", {
    p_completion_id: value.completionId,
    p_locale: value.locale,
  });
  return error
    ? reply({ error: "eligibility" }, error.code === "42501" ? 403 : 409)
    : reply({ certificateId: data });
}
