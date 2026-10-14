import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await context.params;
  const headers = { "Cache-Control": "no-store" };
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      lessonId,
    )
  )
    return NextResponse.json({}, { status: 404, headers });
  const client = await createClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user)
    return NextResponse.json({}, { status: 401, headers });
  const { data, error } = await client.rpc("mux_get_video_management", {
    p_lesson_id: lessonId,
  });
  return NextResponse.json(
    error ? { error: "Video management unavailable." } : { videos: data },
    { status: error ? 403 : 200, headers },
  );
}
