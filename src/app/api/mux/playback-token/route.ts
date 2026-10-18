import { NextResponse } from 'next/server'
import { isLocale } from '@/i18n/config'
import { signBunnyEmbedUrl } from '@/lib/bunny/server'
import { getMuxAllowedOrigins, getMuxClient } from '@/lib/mux/server'
import { createClient } from '@/lib/supabase/server'
import { readBoundedJson } from '@/lib/http/bounded-json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    input = await readBoundedJson(request)
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

  // The database authorizes enrollment/preview, publication and captions before any provider access is issued.
  const { data, error } = await supabase.rpc('learner_get_lesson_video', {
    p_lesson_id: lessonId,
    p_locale: locale,
  })
  const video = data?.[0]
  if (error || !video) return response({ error: 'Video access is not available.' }, 403)

  if (video.provider === 'bunny' && video.bunny_video_id) {
    try {
      // Short-lived like the Mux tokens: a copied embed URL stops opening the player after it expires.
      const embedUrl = signBunnyEmbedUrl(video.bunny_video_id, 300)
      return response({ provider: 'bunny', embedUrl, expiresInSeconds: 300 }, 200)
    } catch {
      return response({ error: 'Unable to issue playback access.' }, 503)
    }
  }

  const playbackId = video.mux_playback_id
  if (!playbackId) return response({ error: 'Video access is not available.' }, 403)

  try {
    const mux = getMuxClient()
    // Signed assets also need their own tokens for the poster and scrubbing previews.
    const [token, thumbnailToken, storyboardToken] = await Promise.all(
      (['video', 'thumbnail', 'storyboard'] as const).map((type) => mux.jwt.signPlaybackId(playbackId, { type, expiration: '5m' })),
    )
    return response({ provider: 'mux', playbackId, token, thumbnailToken, storyboardToken, expiresInSeconds: 300 }, 200)
  } catch {
    return response({ error: 'Unable to issue playback access.' }, 503)
  }
}
