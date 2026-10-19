import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Personal data export for the signed-in learner. Every read uses the learner's own session, so
// row-level security limits the file to records the learner can already see; no privileged
// client is involved. A section that cannot be read is reported as unavailable, not omitted.
export async function GET() {
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  const client = await createClient();
  const { data: auth } = await client.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({}, { status: 401, headers });

  const section = async (query: PromiseLike<{ data: unknown; error: unknown }>) => {
    const { data, error } = await query;
    return error ? { unavailable: true } : data;
  };

  const [profile, preferences, learnerProfile, enrollments, orders, certificates, studySessions, activityDays, notifications, conversations] = await Promise.all([
    section(client.from("profiles").select("display_name, created_at, updated_at").eq("id", user.id).maybeSingle()),
    section(client.from("learner_preferences").select("*").eq("user_id", user.id).maybeSingle()),
    section(client.from("learner_profiles").select("*").eq("user_id", user.id).maybeSingle()),
    section(client.from("enrollments").select("*").eq("user_id", user.id)),
    section(client.from("orders").select("*").eq("user_id", user.id)),
    section(client.rpc("learner_list_certificates")),
    section(client.from("learner_study_sessions").select("title, starts_at, ends_at, created_at").eq("user_id", user.id)),
    section(client.from("learning_activity_days").select("activity_date, first_at, last_at, activity_count").eq("user_id", user.id)),
    section(client.from("notifications").select("kind, data, created_at, read_at").eq("user_id", user.id)),
    section(client.rpc("messages_export_mine")),
  ]);

  // Child records are scoped to this learner's own enrollments and orders explicitly, so an
  // elevated role with wider read policies still exports only its own learning data.
  const ids = (rows: unknown) => (Array.isArray(rows) ? rows.map((row: { id: string }) => row.id) : []);
  const enrollmentIds = ids(enrollments);
  const orderIds = ids(orders);
  const [orderItems, lessonProgress, videoProgress, completions] = await Promise.all([
    orderIds.length ? section(client.from("order_items").select("*").in("order_id", orderIds)) : [],
    enrollmentIds.length ? section(client.from("lesson_progress").select("*").in("enrollment_id", enrollmentIds)) : [],
    enrollmentIds.length ? section(client.from("video_progress").select("*").in("enrollment_id", enrollmentIds)) : [],
    enrollmentIds.length ? section(client.from("course_completions").select("*").in("enrollment_id", enrollmentIds)) : [],
  ]);

  const body = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email ?? null,
      email_confirmed_at: user.email_confirmed_at ?? null,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
    },
    profile,
    preferences,
    learner_profile: learnerProfile,
    enrollments,
    orders,
    order_items: orderItems,
    lesson_progress: lessonProgress,
    video_progress: videoProgress,
    course_completions: completions,
    certificates,
    study_sessions: studySessions,
    learning_activity_days: activityDays,
    notifications,
    conversations,
  };

  const date = body.exported_at.slice(0, 10);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="etriplesoft-learn-data-${date}.json"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
