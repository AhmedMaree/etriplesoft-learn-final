import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Mux from '@mux/ts'
import {
  GEMINI, KeyExhausted, NETWORK_ATTEMPTS, createAdminSession, createGeminiPool, isNetworkError, languageOf, modelName, parseArgs,
  requireOperatorEnv, resilientFetch, sleep,
} from './lib/ai-operator.mjs'

// Operator command: transcribes published Bunny lesson videos with Gemini so Course chat (RAG) can answer
// from what instructors say, then saves each transcript through the audited admin_ai_save_transcript RPC.
// After it finishes, rebuild the course index in Admin > AI course index.
//
//   node scripts/transcribe-course-videos.mjs --course=odoo-implementation            # dry run: lists work
//   node scripts/transcribe-course-videos.mjs --course=odoo-implementation --apply
//   node scripts/transcribe-course-videos.mjs --all --apply [--limit=5]
//
// Reruns are safe: videos that already have a transcript for their current Bunny video are skipped.
// With ffmpeg on PATH (default), only the speech is sent: the MP4 is converted locally to 16 kbps mono Opus
// in 10-minute segments and each segment is sent inline (~1.2 MB; ~12x smaller and ~3.6x fewer tokens than
// video). Without ffmpeg the video is uploaded to the Gemini Files API in resumable chunks and deleted after
// use. Temporary files are removed. Nothing is logged except titles, durations and counts.
// Mux lessons (needs ffmpeg and MUX_* settings) are read from a short-lived signed HLS URL; a lesson that
// also has a Bunny video is transcribed once, from Bunny.

const { arg, apply, all, courseSlug, limit } = parseArgs()
const SEGMENT_SECONDS = Number(arg('segment') ?? 600)
const MODEL = modelName(process.env.GEMINI_TRANSCRIBE_MODEL, process.env.GEMINI_LIGHT_MODEL)
if (!courseSlug && !all) throw new Error('Pass --course=<slug> or --all.')
if (!Number.isInteger(SEGMENT_SECONDS) || SEGMENT_SECONDS < 60 || SEGMENT_SECONDS > 1800) throw new Error('--segment must be 60..1800 seconds.')
requireOperatorEnv(['BUNNY_CDN_HOSTNAME'])

const cdn = process.env.BUNNY_CDN_HOSTNAME.trim()
// Uploaded files belong to one Google project, so when a key runs out the current video is retried with the next key.
const gemini = createGeminiPool()
const geminiFetch = gemini.fetch
const { rpc, courses: listCourses } = await createAdminSession()

async function downloadVideo(guid, interrupted = 0) {
  // The library has no direct-play access; the CDN serves MP4 renditions to the Bunny player origin.
  for (const rendition of ['240p', '360p', '480p']) {
    const response = await resilientFetch(`https://${cdn}/${guid}/play_${rendition}.mp4`, { headers: { Referer: 'https://iframe.mediadelivery.net/' } }, `download ${rendition}`)
    if (response.ok) {
      try {
        return new Uint8Array(await response.arrayBuffer())
      } catch (error) {
        if (!isNetworkError(error) || interrupted + 1 >= NETWORK_ATTEMPTS) throw error
        console.log(`  download ${rendition}: interrupted, retrying`)
        await sleep(10_000 * (interrupted + 1))
        return downloadVideo(guid, interrupted + 1)
      }
    }
    await response.body?.cancel()
  }
  throw new Error('No MP4 rendition is available (enable MP4 fallback for the library).')
}

async function uploadToGemini(bytes, displayName) {
  // A resumable session cannot restart at offset 0 after a partial transfer; start a new session instead.
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await uploadOnce(bytes, displayName)
    } catch (error) {
      if (!isNetworkError(error) || attempt >= NETWORK_ATTEMPTS) throw error
      console.log(`  upload: network error, restarting in ${10 * attempt} s`)
      await sleep(10_000 * attempt)
    }
  }
}

async function uploadOnce(bytes, displayName) {
  const start = await geminiFetch(`${GEMINI}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.length),
      'X-Goog-Upload-Header-Content-Type': 'video/mp4',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
  }, 'upload start')
  const uploadUrl = start.headers.get('x-goog-upload-url')
  if (!uploadUrl) throw new Error('Gemini did not return an upload URL.')
  // Chunked resumable upload: long lessons are 100+ MB, and one dropped connection must not restart the file.
  // After a network error, ask the session how many bytes arrived and continue from there.
  // Non-final chunks must be a multiple of the session's granularity (8 MB at the time of writing).
  const CHUNK = Number(start.headers.get('x-goog-upload-chunk-granularity')) || 8 * 1024 * 1024
  let offset = 0
  let uploaded = null
  for (let failures = 0; offset < bytes.length; ) {
    const end = Math.min(bytes.length, offset + CHUNK)
    const last = end === bytes.length
    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Length': String(end - offset), 'X-Goog-Upload-Offset': String(offset), 'X-Goog-Upload-Command': last ? 'upload, finalize' : 'upload' },
        body: bytes.subarray(offset, end),
      })
      if (!response.ok) throw new Error(`Gemini upload failed with ${response.status}`)
      if (last) uploaded = response
      offset = end
      failures = 0
    } catch (error) {
      if (!isNetworkError(error) || ++failures >= NETWORK_ATTEMPTS) throw error
      console.log(`  upload chunk at ${Math.round(offset / 1048576)} MB: network error, resuming in ${5 * failures} s`)
      await sleep(5_000 * failures)
      const status = await resilientFetch(uploadUrl, { method: 'POST', headers: { 'X-Goog-Upload-Command': 'query' } }, 'upload status')
      const received = Number(status.headers.get('x-goog-upload-size-received'))
      if (Number.isFinite(received) && received >= 0 && received <= bytes.length) offset = received
    }
  }
  if (!uploaded) throw new Error('Gemini upload did not finalize.')
  let file = (await uploaded.json()).file
  for (let i = 0; file.state === 'PROCESSING' && i < 180; i += 1) {
    await sleep(3000)
    file = await (await geminiFetch(`${GEMINI}/v1beta/${file.name}`, { method: 'GET', headers: {} }, 'file status')).json()
  }
  if (file.state !== 'ACTIVE') throw new Error(`Gemini file state is ${file.state}`)
  return file
}

const PROMPT = [
  'Transcribe all speech in this segment of an Odoo training video.',
  'Write it in the language spoken (usually Egyptian Arabic). Write Odoo and technical terms, app and menu names, field names, buttons and English words in English (Latin script) exactly as an Odoo user would see them, for example database, backup, Sales Order, Settings, Create.',
  'When the screen shows an important step that is not said aloud, add a short note such as [On screen: Accounting > Customers > Invoices].',
  'Plain text with paragraph breaks. No timestamps, no commentary, no Markdown. If there is no speech, reply exactly: (no speech)',
].join('\n')

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0
const AUDIO_PROMPT = PROMPT.split('\n').filter((line) => !line.includes('On screen')).join('\n')

async function transcribeAudio(input) {
  const dir = mkdtempSync(join(tmpdir(), 'etl-transcribe-'))
  try {
    let source = input
    if (typeof input !== 'string') {
      source = join(dir, 'in.mp4')
      writeFileSync(source, input)
    }
    const converted = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-vn', '-ac', '1', '-ar', '16000',
      '-c:a', 'libopus', '-b:a', '16k', '-application', 'voip', '-f', 'segment', '-segment_time', String(SEGMENT_SECONDS), join(dir, 'seg_%03d.ogg')], { stdio: ['ignore', 'ignore', 'pipe'] })
    if (converted.status !== 0) throw new Error(`ffmpeg failed: ${String(converted.stderr).slice(0, 200)}`)
    const parts = []
    for (const name of readdirSync(dir).filter((entry) => entry.startsWith('seg_')).sort()) {
      const response = await geminiFetch(`${GEMINI}/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'audio/ogg', data: readFileSync(join(dir, name)).toString('base64') } }, { text: AUDIO_PROMPT }] }],
          generationConfig: { maxOutputTokens: 16384 },
        }),
      }, `audio ${name}`)
      const body = await response.json()
      const text = (body.candidates?.[0]?.content?.parts ?? []).filter((part) => !part.thought).map((part) => part.text ?? '').join('').trim()
      if (text && text !== '(no speech)') parts.push(text)
    }
    return parts.join('\n\n')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

let muxClient = null
async function muxAudioSource(assetId) {
  const missing = ['MUX_TOKEN_ID', 'MUX_TOKEN_SECRET', 'MUX_SIGNING_KEY', 'MUX_PRIVATE_KEY'].filter((name) => !process.env[name]?.trim())
  if (missing.length) throw new Error(`Mux settings missing: ${missing.join(', ')}`)
  muxClient ??= new Mux({ tokenId: process.env.MUX_TOKEN_ID, tokenSecret: process.env.MUX_TOKEN_SECRET, jwtSigningKey: process.env.MUX_SIGNING_KEY, jwtPrivateKey: process.env.MUX_PRIVATE_KEY, logLevel: 'off' })
  const asset = await muxClient.video.assets.retrieve(assetId)
  const playback = asset.playback_ids?.find((id) => id.policy === 'signed') ?? asset.playback_ids?.[0]
  if (!playback) throw new Error('The Mux asset has no playback ID.')
  if (playback.policy !== 'signed') return `https://stream.mux.com/${playback.id}.m3u8`
  const token = await muxClient.jwt.signPlaybackId(playback.id, { type: 'video', expiration: '2h' })
  return `https://stream.mux.com/${playback.id}.m3u8?token=${token}`
}

async function transcribeSegment(file, from, to) {
  const response = await geminiFetch(`${GEMINI}/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ fileData: { mimeType: 'video/mp4', fileUri: file.uri }, videoMetadata: { startOffset: `${from}s`, endOffset: `${to}s` } }, { text: PROMPT }] }],
      generationConfig: { maxOutputTokens: 16384, mediaResolution: 'MEDIA_RESOLUTION_LOW' },
    }),
  }, `segment ${from}-${to}s`)
  const body = await response.json()
  const text = (body.candidates?.[0]?.content?.parts ?? []).filter((part) => !part.thought).map((part) => part.text ?? '').join('').trim()
  return text === '(no speech)' ? '' : text
}


const courses = await listCourses({ all, courseSlug })

console.log(hasFfmpeg ? 'Mode: audio only (ffmpeg found).' : 'Mode: video upload (ffmpeg not found on PATH).')
let processed = 0
for (const course of courses) {
  const courseVideos = await rpc('admin_ai_course_videos', { p_course_id: course.id })
  const bunnyLessons = new Set(courseVideos.filter((video) => video.provider === 'bunny').map((video) => video.lesson_id))
  const videos = courseVideos.filter((video) => !video.transcribed)
  const minutes = Math.round(videos.reduce((sum, video) => sum + (video.duration_seconds ?? 0), 0) / 60)
  console.log(`\n${course.slug}: ${videos.length} video(s) to transcribe, ~${minutes} min`)
  if (process.exitCode === 2) break
  for (const video of videos) {
    if (processed >= limit) break
    if (video.provider === 'mux' && bunnyLessons.has(video.lesson_id)) {
      console.log(`  skip (Mux copy of a Bunny lesson): ${video.label}`)
      continue
    }
    if (video.provider !== 'bunny' && !(video.provider === 'mux' && hasFfmpeg)) {
      console.log(`  skip (provider ${video.provider}): ${video.label}`)
      continue
    }
    const duration = Math.max(1, video.duration_seconds ?? SEGMENT_SECONDS)
    console.log(`  ${apply ? 'transcribing' : 'would transcribe'}: ${video.label} (${Math.round(duration / 60)} min)`)
    if (!apply) continue
    processed += 1
    for (;;) {
    let file = null
    let fileKey = gemini.index
    try {
      let transcript
      if (video.provider === 'mux') transcript = await transcribeAudio(await muxAudioSource(video.provider_video_id))
      else if (hasFfmpeg) transcript = await transcribeAudio(await downloadVideo(video.provider_video_id))
      else {
        const bytes = await downloadVideo(video.provider_video_id)
        fileKey = gemini.index
        file = await uploadToGemini(bytes, `lesson-video-${video.lesson_video_id}`)
        const parts = []
        for (let from = 0; from < duration; from += SEGMENT_SECONDS) {
          const text = await transcribeSegment(file, from, Math.min(duration, from + SEGMENT_SECONDS))
          if (text) parts.push(text)
        }
        transcript = parts.join('\n\n')
      }
      if (!transcript) {
        console.log('    no speech found; nothing saved')
        break
      }
      await rpc('admin_ai_save_transcript', {
        p_lesson_video_id: video.lesson_video_id,
        p_provider_video_id: video.provider_video_id,
        p_language: languageOf(transcript),
        p_content: transcript.slice(0, 400000),
        p_model: MODEL,
      })
      console.log(`    saved ${transcript.length} characters (${languageOf(transcript)})`)
      break
    } catch (error) {
      if (error instanceof KeyExhausted && gemini.advance()) {
        console.log(`    ${error.message}; switching to key ${gemini.index + 1} of ${gemini.keys.length} and retrying this video`)
        continue
      }
      if (error instanceof KeyExhausted) {
        console.log(`    ${error.message}; every key is out of quota for today. Re-run later to continue.`)
        process.exitCode = 2
        break
      }
      console.log(`    FAILED: ${error instanceof Error ? error.message : error}`)
      break
    } finally {
      if (file) await fetch(`${GEMINI}/v1beta/${file.name}`, { method: 'DELETE', headers: { 'x-goog-api-key': gemini.keys[fileKey] } }).catch(() => {})
    }
    }
    if (process.exitCode === 2) break
  }
}
console.log(apply ? `\nDone: ${processed} video(s) processed. Rebuild the index in Admin > AI course index.` : '\nDry run only. Re-run with --apply to transcribe.')
