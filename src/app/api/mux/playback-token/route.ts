import { NextResponse } from 'next/server'
import { isLocale } from '@/i18n/config'
import { getMuxAllowedOrigins, getMuxClient } from '@/lib/mux/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function response(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  try {
    if (!origin || !getMuxAllowedOrigins().includes(origin)) return response({ error: 'Origin is not allowed.' }, 403)
  } catch {
    return response({ error: 'Video playback is not configured.' }, 503)
  }
  if (Number(request.headers.get('content-length')) > 2048) return response({ error: 'Invalid request.' }, 413)
  let input: unknown
  try {
    input = await request.json()
  } catch {
    return response({ error: 'Invalid request.' }, 400)
  }
  const record = typeof input === 'object' && input !== null ? input : null
  const lessonId = record && 'lessonId' in record ? record.lessonId : undefined
  const locale = record && 'locale' in record ? record.locale : undefined
  if (typeof lessonId !== 'string' || !UUID_PATTERN.test(lessonId) || typeof locale !== 'string' || !isLocale(locale)) {
    return response({ error: 'A valid lesson and locale are required.' }, 400)
  }

  const supabase = await createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) return response({ error: 'Authentication required.' }, 401)

  const { data, error } = await supabase.rpc('mux_get_lesson_playback', {
    p_lesson_id: lessonId,
    p_locale: locale,
  })
  const playbackId = data?.[0]?.mux_playback_id
  if (error || !playbackId) return response({ error: 'Video access is not available.' }, 403)

  try {
    const mux = getMuxClient()
    const token = await mux.jwt.signPlaybackId(playbackId, { type: 'video', expiration: '5m' })
    return response({ playbackId, token, expiresInSeconds: 300 }, 200)
  } catch {
    return response({ error: 'Unable to issue playback access.' }, 503)
  }
}
