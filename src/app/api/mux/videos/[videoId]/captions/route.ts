import { NextResponse } from 'next/server'
import { getMuxAllowedOrigins } from '@/lib/mux/server'
import { createClient } from '@/lib/supabase/server'
import { readBoundedJson } from '@/lib/http/bounded-json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TRACK_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

function response(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(request: Request, context: { params: Promise<{ videoId: string }> }) {
  const origin = request.headers.get('origin')
  try {
    if (!origin || !getMuxAllowedOrigins().includes(origin)) return response({ error: 'Origin is not allowed.' }, 403)
  } catch {
    return response({ error: 'Video management is not configured.' }, 503)
  }
  const { videoId } = await context.params
  if (!UUID_PATTERN.test(videoId)) return response({ error: 'Video not found.' }, 404)

  let input: unknown
  try {
    input = await readBoundedJson(request)
  } catch {
    return response({ error: 'Invalid request.' }, 400)
  }
  const record = typeof input === 'object' && input !== null ? input : null
  const requiredLocales = record && 'requiredLocales' in record ? record.requiredLocales : undefined
  const locale = record && 'locale' in record ? record.locale : undefined
  const trackId = record && 'trackId' in record ? record.trackId : undefined

  const supabase = await createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) return response({ error: 'Authentication required.' }, 401)

  if (Array.isArray(requiredLocales) && requiredLocales.every((item) => item === 'en' || item === 'ar')) {
    const { error } = await supabase.rpc('mux_set_caption_requirements', {
      p_video_id: videoId,
      p_locales: requiredLocales,
    })
    if (!error) return response({ updated: true }, 200)
    return response({ error: error.code === '42501' ? 'Video management permission required.' : 'Unable to update caption requirements.' }, error.code === '42501' ? 403 : 400)
  }

  if ((locale === 'en' || locale === 'ar') && typeof trackId === 'string' && TRACK_ID_PATTERN.test(trackId)) {
    const { error } = await supabase.rpc('mux_review_caption', {
      p_video_id: videoId,
      p_locale: locale,
      p_track_id: trackId,
    })
    if (!error) return response({ reviewed: true }, 200)
    return response({ error: error.code === '42501' ? 'Video management permission or caption track required.' : 'Unable to review this caption.' }, error.code === '42501' ? 403 : 400)
  }

  return response({ error: 'Provide requiredLocales or a locale and trackId.' }, 400)
}
