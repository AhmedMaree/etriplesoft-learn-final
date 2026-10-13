import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import { getMuxClient } from '@/lib/mux/server'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 1_048_576

function toJson(value: unknown): Json | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (Array.isArray(value)) {
    const items: Json[] = []
    for (const item of value) {
      const jsonItem = toJson(item)
      if (jsonItem === undefined) return undefined
      items.push(jsonItem)
    }
    return items
  }
  if (typeof value === 'object') {
    const jsonObject: { [key: string]: Json | undefined } = {}
    for (const [key, item] of Object.entries(value)) {
      const jsonItem = toJson(item)
      if (jsonItem === undefined) return undefined
      jsonObject[key] = jsonItem
    }
    return jsonObject
  }
  return undefined
}

async function readBoundedBody(request: Request): Promise<string | null> {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return null
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BODY_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(body)
}

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'Unsupported content type.' }, { status: 415 })
  }
  const body = await readBoundedBody(request)
  if (body === null) return NextResponse.json({ error: 'Webhook body is too large.' }, { status: 413 })

  let event: Awaited<ReturnType<ReturnType<typeof getMuxClient>['webhooks']['unwrap']>>
  try {
    event = await getMuxClient().webhooks.unwrap(body, request.headers)
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature or payload.' }, { status: 401 })
  }

  const eventData = toJson(event.data)
  if (!eventData || typeof eventData !== 'object' || Array.isArray(eventData)) {
    return NextResponse.json({ error: 'Invalid webhook data.' }, { status: 400 })
  }
  const { url } = getSupabasePublicEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return NextResponse.json({ error: 'Webhook processing is not configured.' }, { status: 503 })

  const supabase = createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { error } = await supabase.rpc('mux_process_webhook', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_data: eventData,
  })
  if (error) return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 503 })
  return NextResponse.json({ received: true }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}
