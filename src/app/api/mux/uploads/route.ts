import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMuxAllowedOrigins, getMuxClient } from '@/lib/mux/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function response(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  let allowedOrigins: string[]
  try {
    allowedOrigins = getMuxAllowedOrigins()
  } catch {
    return response({ error: 'Video upload is not configured.' }, 503)
  }
  if (!origin || !allowedOrigins.includes(origin)) return response({ error: 'Origin is not allowed.' }, 403)
  if (Number(request.headers.get('content-length')) > 2048) return response({ error: 'Invalid request.' }, 413)

  let input: unknown
  try {
    input = await request.json()
  } catch {
    return response({ error: 'Invalid request.' }, 400)
  }
  const lessonId = typeof input === 'object' && input !== null && 'lessonId' in input
    ? input.lessonId : undefined
  if (typeof lessonId !== 'string' || !UUID_PATTERN.test(lessonId)) {
    return response({ error: 'A valid lesson is required.' }, 400)
  }

  const supabase = await createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) return response({ error: 'Authentication required.' }, 401)

  let mux: ReturnType<typeof getMuxClient>
  try {
    mux = getMuxClient()
  } catch {
    return response({ error: 'Video uploads are not configured.' }, 503)
  }

  const { data: videoId, error: beginError } = await supabase.rpc('mux_begin_lesson_upload', { p_lesson_id: lessonId })
  if (beginError || !videoId) {
    const forbidden = beginError?.code === '42501'
    return response({ error: forbidden ? 'Upload permission required.' : 'Unable to start this upload.' }, forbidden ? 403 : 404)
  }

  try {
    const upload = await mux.video.uploads.create({
      cors_origin: origin,
      timeout: 3600,
      new_asset_settings: {
        playback_policies: ['signed'],
        video_quality: 'basic',
        passthrough: videoId,
      },
    })
    if (!upload.id || !upload.url) throw new Error('Mux did not return an upload URL.')

    const { error: attachError } = await supabase.rpc('mux_attach_upload', {
      p_video_id: videoId,
      p_upload_id: upload.id,
    })
    if (attachError) {
      await supabase.rpc('mux_fail_lesson_upload', { p_video_id: videoId })
      return response({ error: 'Unable to save the upload record.' }, 502)
    }

    return response({ videoId, uploadId: upload.id, uploadUrl: upload.url, expiresInSeconds: upload.timeout }, 201)
  } catch {
    await supabase.rpc('mux_fail_lesson_upload', { p_video_id: videoId })
    return response({ error: 'Unable to create a secure video upload.' }, 502)
  }
}
