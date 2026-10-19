import { NextResponse } from "next/server";
import { hasTrustedRequestOrigin } from "@/lib/http/trusted-origin";
import { createClient } from "@/lib/supabase/server";
import {
  CONVERSATION_ID_PATTERN,
  deleteConversation,
  getConversationMessages,
} from "@/features/ai-assistant/server/conversations";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ conversationId: string }> };

const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function authenticatedClient() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  return error || !data.user ? null : client;
}

/** The signed-in learner's own conversation messages (RLS-scoped). */
export async function GET(_request: Request, { params }: Params) {
  const { conversationId } = await params;
  if (!CONVERSATION_ID_PATTERN.test(conversationId)) return reply({ error: "input" }, 400);
  const client = await authenticatedClient();
  if (!client) return reply({ error: "authentication" }, 401);
  try {
    const messages = await getConversationMessages(client, conversationId);
    return messages ? reply({ messages }) : reply({ error: "notFound" }, 404);
  } catch {
    return reply({ error: "unavailable" }, 503);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  if (!hasTrustedRequestOrigin(request)) return reply({ error: "origin" }, 403);
  const { conversationId } = await params;
  if (!CONVERSATION_ID_PATTERN.test(conversationId)) return reply({ error: "input" }, 400);
  const client = await authenticatedClient();
  if (!client) return reply({ error: "authentication" }, 401);
  try {
    return (await deleteConversation(client, conversationId)) ? reply({ ok: true }) : reply({ error: "notFound" }, 404);
  } catch {
    return reply({ error: "unavailable" }, 503);
  }
}
