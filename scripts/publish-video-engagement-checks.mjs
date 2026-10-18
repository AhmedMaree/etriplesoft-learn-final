import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'

nextEnv.loadEnvConfig(process.cwd(), true)

const apply = process.argv.includes('--apply')
const manifestPath = path.resolve('scripts/course-plans/video-engagement-assessments.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
if (manifest.locale !== 'en' || !Array.isArray(manifest.videos) || !manifest.videos.length) {
  throw new Error('The English practice-check manifest is invalid.')
}
for (const video of manifest.videos) {
  if (!video.courseSlug || !video.moduleId || !video.lessonId || !video.title || !Array.isArray(video.questions) || video.questions.length !== 2) {
    throw new Error('Every practice check must identify a video and contain exactly two questions.')
  }
}

const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'UPLOAD_ADMIN_EMAIL', 'UPLOAD_ADMIN_PASSWORD']
const missing = requiredEnv.filter((name) => !process.env[name]?.trim())
if (missing.length) throw new Error(`Missing local operator settings: ${missing.join(', ')}`)
if (process.env.MUX_ENVIRONMENT !== 'development') throw new Error('Content publishing is restricted to the development environment.')

const statePath = path.resolve('tmp/video-engagement-checks-state.json')
const state = await readFile(statePath, 'utf8').then(JSON.parse, () => ({ entries: {} }))
if (!state.entries || typeof state.entries !== 'object') throw new Error('Practice-check recovery state is invalid.')

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: true, persistSession: false },
})
const { error: signInError } = await client.auth.signInWithPassword({ email: process.env.UPLOAD_ADMIN_EMAIL, password: process.env.UPLOAD_ADMIN_PASSWORD })
if (signInError) throw new Error('Administrator sign-in failed; credentials were not printed.')

async function rpc(name, params) {
  const { data, error } = await client.rpc(name, params)
  if (error) throw new Error(`${name} failed with database code ${error.code ?? 'unknown'}.`)
  return data
}

function flatten(curriculum) {
  if (!Array.isArray(curriculum)) throw new Error('Course curriculum response was invalid.')
  return curriculum.flatMap((module) => (Array.isArray(module.lessons) ? module.lessons.map((lesson) => ({ ...lesson, moduleId: module.id, moduleTitle: module.title })) : []))
}

const courseCache = new Map()
for (const video of manifest.videos) {
  if (!courseCache.has(video.courseSlug)) {
    const courses = await rpc('admin_list_courses', { p_status: 'published', p_limit: 200, p_offset: 0 })
    const course = Array.isArray(courses) ? courses.find((item) => item.slug === video.courseSlug) : null
    if (!course) throw new Error(`Published course not found: ${video.courseSlug}`)
    const curriculum = await rpc('admin_get_curriculum', { p_course_id: course.id, p_locale: manifest.locale })
    courseCache.set(video.courseSlug, { course, curriculum })
  }
  const { course, curriculum } = courseCache.get(video.courseSlug)
  const matches = flatten(curriculum).filter((lesson) => lesson.id === video.lessonId)
  if (matches.length !== 1 || matches[0].moduleId !== video.moduleId || matches[0].type !== 'video' || matches[0].title !== video.title || matches[0].status !== 'published' || !matches[0].published) {
    throw new Error(`Expected the exact published source video in ${video.courseSlug}: ${video.title}.`)
  }
  const muxRows = await rpc('mux_get_video_management', { p_lesson_id: video.lessonId })
  if (!Array.isArray(muxRows) || !muxRows.some((row) => row.status === 'ready' && row.mux_asset_id)) {
    throw new Error(`No ready Mux asset is registered for ${video.courseSlug}: ${video.title}.`)
  }
  video.courseId = course.id
}

console.log(`Verified ${manifest.videos.length} published video lessons with ready Mux assets.`)
for (const video of manifest.videos) console.log(`  ${video.courseSlug} / ${video.title} → optional 2-question check`)
if (!apply) {
  console.log('\nDry run only. No course content was changed. Run with --apply to publish the optional practice checks.')
  await client.auth.signOut()
  process.exit(0)
}

async function saveState() {
  await mkdir(path.dirname(statePath), { recursive: true })
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

for (const video of manifest.videos) {
  const key = video.lessonId
  let entry = state.entries[key]
  if (entry && (entry.courseId !== video.courseId || entry.title !== video.title)) throw new Error(`Saved recovery state does not match ${video.title}; inspect ${statePath}.`)
  if (!entry) {
    const inCurriculum = flatten(courseCache.get(video.courseSlug).curriculum)
    const existing = inCurriculum.filter((lesson) => lesson.moduleId === video.moduleId && lesson.title === `Quick Check: ${video.title}` && lesson.type === 'assessment')
    if (existing.length > 1) throw new Error(`Multiple matching assessment drafts exist for ${video.title}; inspect them before continuing.`)
    const lessonId = existing[0]?.id ?? await rpc('admin_create_lesson_draft', {
      p_module_id: video.moduleId, p_locale: manifest.locale, p_title: `Quick Check: ${video.title}`, p_type: 'assessment',
    })
    entry = state.entries[key] = { courseId: video.courseId, moduleId: video.moduleId, lessonId, title: video.title, versionId: null }
    await saveState()
  }
  if (!entry.versionId) {
    await rpc('admin_edit_lesson', {
      p_id: entry.lessonId, p_locale: manifest.locale, p_title: `Quick Check: ${video.title}`,
      p_summary: 'Two-question practice check. Optional; it does not affect course completion.',
      p_body: 'Answer these two questions to review the main ideas from the video. This optional practice check does not affect course completion.',
      p_required: false, p_preview: false, p_publish: false, p_duration: null,
    })
    const versionId = await rpc('admin_create_quiz_version', {
      p_lesson_id: entry.lessonId, p_locale: manifest.locale, p_title: `Quick Check: ${video.title}`,
      p_instructions: 'Two-question practice check. Optional; it does not affect course completion. Pass mark: 70%. You may make up to three attempts.',
      p_questions: video.questions,
    })
    entry.versionId = versionId
    await saveState()
  }
  if (!entry.quizPublished) {
    await rpc('admin_publish_quiz_version', { p_version_id: entry.versionId })
    entry.quizPublished = true
    await saveState()
  }
  await rpc('admin_edit_lesson', {
    p_id: entry.lessonId, p_locale: manifest.locale, p_title: `Quick Check: ${video.title}`,
    p_summary: 'Two-question practice check. Optional; it does not affect course completion.',
    p_body: 'Answer these two questions to review the main ideas from the video. This optional practice check does not affect course completion.',
    p_required: false, p_preview: false, p_publish: true, p_duration: null,
  })
  entry.published = true
  await saveState()
  console.log(`Published optional check: ${video.courseSlug} / ${video.title}`)
}

for (const [slug, { course }] of courseCache) {
  const curriculum = await rpc('admin_get_curriculum', { p_course_id: course.id, p_locale: manifest.locale })
  const entries = new Map(manifest.videos.filter((video) => video.courseSlug === slug).map((video) => [video.lessonId, state.entries[video.lessonId]]))
  for (const moduleRow of curriculum) {
    const additions = [...entries].filter(([, entry]) => entry.moduleId === moduleRow.id)
    if (!additions.length) continue
    const checkIds = new Set(additions.map(([, entry]) => entry.lessonId))
    const lessons = moduleRow.lessons.map((lesson) => lesson.id).filter((lessonId) => !checkIds.has(lessonId))
    const desired = []
    for (const lessonId of lessons) {
      desired.push(lessonId)
      const entry = entries.get(lessonId)
      if (entry) desired.push(entry.lessonId)
    }
    if (desired.length !== lessons.length + additions.length) throw new Error(`Could not construct a complete lesson ordering for module ${moduleRow.title}.`)
    await rpc('admin_reorder_module_lessons', { p_module_id: moduleRow.id, p_lesson_ids: desired })
  }
}

for (const video of manifest.videos) {
  const curriculum = await rpc('admin_get_curriculum', { p_course_id: video.courseId, p_locale: manifest.locale })
  const lessons = flatten(curriculum)
  const videoIndex = lessons.findIndex((lesson) => lesson.id === video.lessonId)
  const check = state.entries[video.lessonId]
  const checkRow = lessons[videoIndex + 1]
  if (videoIndex < 0 || checkRow?.id !== check.lessonId || checkRow.type !== 'assessment' || checkRow.required !== false || checkRow.status !== 'published' || !checkRow.published) {
    throw new Error(`Post-publish verification failed for ${video.title}.`)
  }
}

await client.auth.signOut()
console.log(`\nVerified ${manifest.videos.length} optional practice checks published and placed after their videos.`)
