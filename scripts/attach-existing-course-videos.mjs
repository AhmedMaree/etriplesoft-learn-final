import { createHash } from 'node:crypto'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import nextEnv from '@next/env'
import Mux from '@mux/ts'
import { createClient } from '@supabase/supabase-js'

nextEnv.loadEnvConfig(process.cwd(), true)

const args = process.argv.slice(2)
const getArg = (name) => args.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3)
const apply = args.includes('--apply')
const planPath = getArg('plan')
const videosDir = getArg('videos')
if (!planPath || !videosDir) {
  throw new Error('Pass --plan=<manifest.json> and --videos=<directory>; omit --apply for a dry run.')
}

const plan = JSON.parse(await readFile(planPath, 'utf8'))
if (!plan.courseSlug || !['en', 'ar'].includes(plan.locale) || !Array.isArray(plan.videos) || !plan.videos.length) {
  throw new Error('The attachment manifest is invalid.')
}
const root = path.resolve(videosDir)
const files = []
for (const item of plan.videos) {
  if (!item || typeof item.file !== 'string' || typeof item.lessonTitle !== 'string' || !item.lessonTitle.trim()) {
    throw new Error('Every manifest row must have a filename and lesson title.')
  }
  const file = path.resolve(root, item.file)
  const relative = path.relative(root, file)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || path.extname(file).toLowerCase() !== '.mp4') {
    throw new Error(`Invalid MP4 path in manifest: ${item.file}`)
  }
  const info = await stat(file)
  if (!info.isFile() || info.size <= 0) throw new Error(`Video file is missing or empty: ${item.file}`)
  files.push({ ...item, path: file, bytes: info.size })
}
if (new Set(files.map((item) => item.file)).size !== files.length || new Set(files.map((item) => item.lessonTitle)).size !== files.length) {
  throw new Error('Manifest filenames and lesson titles must be unique.')
}

const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'UPLOAD_ADMIN_EMAIL', 'UPLOAD_ADMIN_PASSWORD']
const missing = requiredEnv.filter((name) => !process.env[name]?.trim())
if (missing.length) throw new Error(`Missing local operator settings: ${missing.join(', ')}`)
if (process.env.MUX_ENVIRONMENT !== 'development') throw new Error('Uploads are restricted to the Mux Development environment.')
const origin = process.env.MUX_ALLOWED_ORIGINS?.split(',').map((value) => value.trim()).find(Boolean)
if (!origin) throw new Error('MUX_ALLOWED_ORIGINS must contain the approved local development origin.')

const statePath = path.resolve(getArg('state') ?? `tmp/${plan.courseSlug}-video-attachments.json`)
const state = await readFile(statePath, 'utf8').then(JSON.parse, () => ({ courseSlug: plan.courseSlug, entries: {} }))
if (state.courseSlug !== plan.courseSlug || !state.entries || typeof state.entries !== 'object') {
  throw new Error('Upload state does not match this course. Inspect the prior run before proceeding.')
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: true, persistSession: false },
})
const { error: signInError } = await supabase.auth.signInWithPassword({
  email: process.env.UPLOAD_ADMIN_EMAIL,
  password: process.env.UPLOAD_ADMIN_PASSWORD,
})
if (signInError) throw new Error('Administrator sign-in failed; credentials were not printed.')

async function rpc(name, params) {
  const { data, error } = await supabase.rpc(name, params)
  if (error) throw new Error(`${name} failed with database code ${error.code ?? 'unknown'}.`)
  return data
}

const courses = await rpc('admin_list_courses', { p_status: 'published', p_limit: 200, p_offset: 0 })
const course = Array.isArray(courses) ? courses.find((row) => row.slug === plan.courseSlug) : null
if (!course) throw new Error(`Published course not found: ${plan.courseSlug}`)
const curriculum = await rpc('admin_get_curriculum', { p_course_id: course.id, p_locale: plan.locale })
if (!Array.isArray(curriculum)) throw new Error('The course curriculum response was invalid.')

const availableLessons = curriculum.flatMap((module) =>
  Array.isArray(module.lessons) ? module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title })) : [],
)
const attachments = files.map((file) => {
  const matches = availableLessons.filter((lesson) => lesson.title === file.lessonTitle)
  if (matches.length !== 1 || matches[0].type !== 'video' || matches[0].status !== 'published' || !matches[0].published) {
    throw new Error(`Expected one published video lesson titled "${file.lessonTitle}" in ${plan.locale}.`)
  }
  return { ...file, lesson: matches[0] }
})

console.log(`Course: ${plan.courseSlug} (${course.id}); locale: ${plan.locale}`)
for (const item of attachments) {
  console.log(`  ${item.file} → ${item.lesson.moduleTitle} / ${item.lesson.title} (${(item.bytes / 1048576).toFixed(1)} MiB)`)
}
if (!apply) {
  console.log('\nDry run only. Existing published lessons matched; no course records or Mux assets were changed.')
  await supabase.auth.signOut()
  process.exit(0)
}

const mux = new Mux({ maxRetries: 1, logLevel: 'off' })
const statuses = new Map()

for (const [index, item] of attachments.entries()) {
  const saved = state.entries[item.file]
  const wasUploaded = saved?.uploaded === true || ['uploaded', 'ready'].includes(saved?.state)
  if (saved?.lessonId && saved.lessonId !== item.lesson.id) {
    throw new Error(`Saved lesson mapping changed for ${item.file}; inspect ${statePath} before continuing.`)
  }
  const management = await rpc('mux_get_video_management', { p_lesson_id: item.lesson.id })
  if (!Array.isArray(management)) throw new Error(`Video management status was invalid for ${item.lesson.title}.`)
  let current = management[0]
  if (saved?.state === 'upload_failed' && saved.videoId && current?.status === 'creating_upload') {
    await rpc('mux_fail_lesson_upload', { p_video_id: saved.videoId })
    const refreshed = await rpc('mux_get_video_management', { p_lesson_id: item.lesson.id })
    current = Array.isArray(refreshed) ? refreshed[0] : null
  }
  if (current?.status === 'ready' && current.mux_asset_id) {
    statuses.set(item.file, 'ready')
    console.log(`Already ready ${index + 1}/${attachments.length}: ${item.file}`)
    continue
  }
  if (current && !['upload_failed', 'errored', 'cancelled', 'timed_out'].includes(current.status)) {
    if (wasUploaded) {
      statuses.set(item.file, current.status)
      console.log(`Already uploaded ${index + 1}/${attachments.length}: ${item.file} (${current.status})`)
      continue
    }
    throw new Error(`${item.lesson.title} already has a ${current.status} upload. No duplicate upload was started.`)
  }
  if (wasUploaded) {
    statuses.set(item.file, 'awaiting_provider')
    console.log(`Previously uploaded ${index + 1}/${attachments.length}: ${item.file}; waiting for Mux readiness.`)
    continue
  }

  const bytes = await readFile(item.path)
  const checksum = createHash('sha256').update(bytes).digest('hex')
  if (saved?.sha256 && saved.sha256 !== checksum) throw new Error(`File changed since the prior upload attempt: ${item.file}.`)
  const entry = { lessonId: item.lesson.id, sha256: checksum, state: 'starting' }
  state.entries[item.file] = entry
  await writeFile(statePath, JSON.stringify(state, null, 2))

  let videoId
  let upload
  let stage = 'reserve'
  try {
    videoId = await rpc('mux_begin_lesson_upload', { p_lesson_id: item.lesson.id })
    if (typeof videoId !== 'string') throw new Error('invalid upload reservation')
    entry.videoId = videoId
    stage = 'create'
    upload = await mux.video.uploads.create({
      cors_origin: origin,
      timeout: 3600,
      new_asset_settings: { playback_policies: ['signed'], video_quality: 'basic', passthrough: videoId },
    })
    entry.uploadId = upload.id
    await writeFile(statePath, JSON.stringify(state, null, 2))
    stage = 'attach'
    await rpc('mux_attach_upload', { p_video_id: videoId, p_upload_id: upload.id })
    entry.state = 'uploading'
    await writeFile(statePath, JSON.stringify(state, null, 2))
    stage = 'transfer'
    console.log(`Uploading ${index + 1}/${attachments.length}: ${item.file} (${(bytes.length / 1048576).toFixed(1)} MiB) ...`)
    const response = await fetch(upload.url, {
      method: 'PUT',
      body: bytes,
      headers: { 'Content-Type': 'video/mp4' },
      signal: AbortSignal.timeout(90 * 60 * 1000),
    })
    if (!response.ok) throw new Error('Mux rejected the upload body.')
    entry.state = 'uploaded'
    entry.uploaded = true
    entry.uploadedAt = new Date().toISOString()
    statuses.set(item.file, 'uploaded')
    await writeFile(statePath, JSON.stringify(state, null, 2))
    console.log(`Uploaded ${index + 1}/${attachments.length}: ${item.file}`)
  } catch (error) {
    entry.state = 'upload_failed'
    entry.failureStage = stage
    await writeFile(statePath, JSON.stringify(state, null, 2))
    if (upload?.id) {
      try { await mux.video.uploads.cancel(upload.id) } catch {}
    }
    if (videoId) {
      try { await supabase.rpc('mux_fail_lesson_upload', { p_video_id: videoId }) } catch {}
    }
    const status = typeof error === 'object' && error && 'status' in error && typeof error.status === 'number' ? ` (HTTP ${error.status})` : ''
    const providerCode = typeof error === 'object' && error && 'code' in error && typeof error.code === 'string' ? `; provider code ${error.code}` : ''
    const providerType = typeof error === 'object' && error && 'type' in error && typeof error.type === 'string' ? `; provider type ${error.type}` : ''
    const body = typeof error === 'object' && error && 'error' in error && typeof error.error === 'object' && error.error ? error.error : null
    const nested = Array.isArray(body?.errors) ? body.errors[0] : null
    const nestedError = typeof body?.error === 'object' && body.error ? body.error : null
    const rawDetail = typeof body?.error === 'string' ? body.error : typeof body?.message === 'string' ? body.message : typeof nestedError?.message === 'string' ? nestedError.message : typeof nested?.messages === 'string' ? nested.messages : typeof nested?.message === 'string' ? nested.message : typeof error?.message === 'string' ? error.message : ''
    const safeDetail = rawDetail.slice(0, 160).replace(/https?:\/\/\S+/g, '[url]')
    throw new Error(`Upload failed during ${stage}${status}${providerCode}${providerType}${safeDetail ? `; ${safeDetail}` : ''} for ${item.file}; provider details and URLs were withheld. Inspect ${statePath} before retrying.`)
  }
}

console.log('\nUploads sent. Waiting for Mux processing and the configured signed webhook to mark each lesson ready...')
for (let attempt = 0; attempt < 180; attempt++) {
  let ready = 0
  for (const item of attachments) {
    if (statuses.get(item.file) === 'ready') {
      ready++
      continue
    }
    const management = await rpc('mux_get_video_management', { p_lesson_id: item.lesson.id })
    const current = Array.isArray(management) ? management[0] : null
    if (current?.status === 'ready' && current.mux_asset_id && current.duration_seconds > 0) {
      statuses.set(item.file, 'ready')
      const entry = state.entries[item.file] ?? (state.entries[item.file] = { lessonId: item.lesson.id })
      entry.state = 'ready'
      entry.durationSeconds = current.duration_seconds
      entry.assetId = current.mux_asset_id
      await writeFile(statePath, JSON.stringify(state, null, 2))
      console.log(`Ready: ${item.lesson.title} (${Math.ceil(current.duration_seconds / 60)} min)`)
      ready++
    } else if (['upload_failed', 'errored', 'cancelled', 'timed_out'].includes(current?.status)) {
      throw new Error(`Mux reports ${current.status} for ${item.file}; see ${statePath}.`)
    }
  }
  if (ready === attachments.length) break
  if (attempt === 179) {
    const pending = attachments.filter((item) => statuses.get(item.file) !== 'ready').map((item) => `${item.file}: ${statuses.get(item.file) ?? 'processing'}`)
    throw new Error(`Mux readiness is still pending: ${pending.join(', ')}. Assets were uploaded; rerun the same command to continue polling.`)
  }
  await new Promise((resolve) => setTimeout(resolve, 5000))
}

await supabase.auth.signOut()
console.log(`\nPASS: ${attachments.length} Python lessons now have ready signed Mux videos. Course and lesson names were not changed.`)
