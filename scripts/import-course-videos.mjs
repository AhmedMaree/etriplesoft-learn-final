import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import Mux from '@mux/ts'
import { createClient } from '@supabase/supabase-js'
import { signInAdmin } from './lib/admin-mfa.mjs'

// One-off operator command that creates a DRAFT course from a plan file and uploads its lesson videos
// to Mux through the same authorized RPCs as /api/mux/uploads. It signs in as an active admin, so
// every write is checked by assert_active_admin() and audited. Nothing is published.
//
//   node --env-file=.env.local scripts/import-course-videos.mjs \
//     --plan=scripts/course-plans/odoo-first-addon.json --videos=/path/to/videos           # dry run
//   ... --apply                                                                            # writes
//   ... --apply --publish        # once Mux reports every video ready: set durations and publish
//
// Progress is saved to <videos>/.import-state.json (or --state=<file>) so a rerun resumes instead of
// duplicating rows. A plan whose course has "existing": true adds modules/lessons to that published
// course instead of creating one; a lesson with "preview": true is watchable without enrollment.
// Needs UPLOAD_ADMIN_EMAIL / UPLOAD_ADMIN_PASSWORD / UPLOAD_ADMIN_TOTP_SECRET plus the Supabase publishable key and Mux keys.

const args = process.argv.slice(2)
const arg = (name) => args.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3)
const apply = args.includes('--apply')
const planPath = arg('plan')
const videosDir = arg('videos')
if (!planPath || !videosDir) throw new Error('Pass --plan=<plan.json> and --videos=<directory>.')

const env = (name) => process.env[name] ?? process.env[`﻿${name}`]
const plan = JSON.parse(await readFile(planPath, 'utf8'))
const statePath = arg('state') ?? path.join(videosDir, '.import-state.json')
const state = await readFile(statePath, 'utf8').then(JSON.parse, () => ({ modules: [] }))
const saveState = () => writeFile(statePath, JSON.stringify(state, null, 2))

const lessons = plan.modules.flatMap((module) => module.lessons)
for (const lesson of lessons) {
  await readFile(path.join(videosDir, lesson.file)).then(() => {}, () => {
    throw new Error(`Missing video file: ${lesson.file}`)
  })
}

console.log(plan.course.existing
  ? `Existing course: ${plan.course.slug} (new modules and lessons start as drafts)`
  : `Course: ${plan.course.translations.en.title} (${plan.course.slug}) — draft`)
plan.modules.forEach((module, m) => {
  console.log(`  Module ${m + 1}: ${module.translations.en.title}`)
  module.lessons.forEach((lesson, l) => console.log(`    ${m + 1}.${l + 1} ${lesson.translations.en.title}${lesson.preview ? ' [preview]' : ''}  <- ${lesson.file}`))
})
if (!apply) {
  console.log('\nDry run only. Re-run with --apply to create the course and upload the videos.')
  process.exit(0)
}

const origin = env('MUX_ALLOWED_ORIGINS')?.split(',').map((value) => value.trim()).find(Boolean)
if (!origin) throw new Error('Set MUX_ALLOWED_ORIGINS.')
const supabase = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
  auth: { autoRefreshToken: true, persistSession: false },
})
await signInAdmin(supabase, {
  email: env('UPLOAD_ADMIN_EMAIL') ?? '',
  password: env('UPLOAD_ADMIN_PASSWORD') ?? '',
  totpSecret: env('UPLOAD_ADMIN_TOTP_SECRET'),
})
const mux = new Mux({ logLevel: 'off', maxRetries: 1 })

async function rpc(name, params) {
  const { data, error } = await supabase.rpc(name, params)
  if (error) throw new Error(`${name} failed: ${error.message}`)
  return data
}

// Curriculum: course, translations, modules and lessons, each created once.
const course = plan.course
if (course.existing) {
  const courses = await rpc('admin_list_courses', { p_limit: 200, p_offset: 0 })
  const match = courses.find((row) => row.slug === course.slug)
  if (!match) throw new Error(`No course with slug ${course.slug}`)
  state.courseId ??= match.id
} else {
  state.courseId ??= await rpc('admin_create_course', {
    p_slug: course.slug, p_category: course.category, p_level: course.level, p_price_minor: course.price_minor,
  })
}
await saveState()
for (const [locale, t] of Object.entries(course.translations ?? {})) {
  await rpc('admin_upsert_course_translation', {
    p_course_id: state.courseId, p_locale: locale, p_title: t.title, p_summary: t.summary, p_description: t.description ?? null,
  })
}

for (const [m, module] of plan.modules.entries()) {
  const moduleState = (state.modules[m] ??= { lessons: [] })
  moduleState.id ??= await rpc('admin_create_course_module', { p_course_id: state.courseId })
  await saveState()
  for (const [locale, t] of Object.entries(module.translations)) {
    await rpc('admin_save_module_translation', {
      p_module_id: moduleState.id, p_locale: locale, p_title: t.title, p_description: t.description ?? null,
    })
  }
  for (const [l, lesson] of module.lessons.entries()) {
    const lessonState = (moduleState.lessons[l] ??= { file: lesson.file })
    lessonState.id ??= await rpc('admin_create_lesson', {
      p_module_id: moduleState.id, p_lesson_type: 'video', p_is_preview: Boolean(lesson.preview),
    })
    await saveState()
    for (const [locale, t] of Object.entries(lesson.translations)) {
      await rpc('admin_save_lesson_translation', {
        p_lesson_id: lessonState.id, p_locale: locale, p_title: t.title, p_summary: t.summary ?? null,
      })
    }
  }
}
console.log(`\nCurriculum ready (course ${state.courseId}).`)

// Videos: same sequence as /api/mux/uploads, then PUT the file to the one-time Mux upload URL.
for (const moduleState of state.modules) {
  for (const lessonState of moduleState.lessons) {
    if (lessonState.uploaded) {
      console.log(`skip     ${lessonState.file} (already uploaded)`)
      continue
    }
    const videoId = await rpc('mux_begin_lesson_upload', { p_lesson_id: lessonState.id })
    let upload
    try {
      upload = await mux.video.uploads.create({
        cors_origin: origin,
        timeout: 3600,
        new_asset_settings: { playback_policies: ['signed'], video_quality: 'basic', passthrough: videoId },
      })
      await rpc('mux_attach_upload', { p_video_id: videoId, p_upload_id: upload.id })
    } catch (error) {
      await supabase.rpc('mux_fail_lesson_upload', { p_video_id: videoId })
      throw error
    }

    const body = await readFile(path.join(videosDir, lessonState.file))
    process.stdout.write(`upload   ${lessonState.file} (${(body.length / 1048576).toFixed(1)} MB) ... `)
    const response = await fetch(upload.url, { method: 'PUT', body, headers: { 'Content-Type': 'video/mp4' } })
    if (!response.ok) throw new Error(`Mux upload failed with HTTP ${response.status} for ${lessonState.file}`)
    console.log('done')

    Object.assign(lessonState, { videoId, uploadId: upload.id, uploaded: true })
    await saveState()
  }
}

console.log('\nAll videos sent to Mux. The webhook marks each one ready once Mux finishes processing.')

// --publish: copy each ready video's duration onto its lesson, then publish course -> modules -> lessons
// in every locale the plan provides (the database rejects any step whose ancestors are unpublished).
if (args.includes('--publish')) {
  const { data: assets } = await mux.video.assets.list({ limit: 100 })
  const durations = new Map(assets.filter((asset) => asset.status === 'ready')
    .map((asset) => [asset.passthrough, Math.max(1, Math.ceil(asset.duration ?? 0))]))
  const lessonStates = state.modules.flatMap((moduleState) => moduleState.lessons)
  const missing = lessonStates.filter((lessonState) => !durations.has(lessonState.videoId))
  if (missing.length) throw new Error(`Not ready in Mux yet: ${missing.map((item) => item.file).join(', ')}`)

  const locales = Object.keys(course.translations ?? {})
  for (const [m, moduleState] of state.modules.entries()) {
    for (const [l, lessonState] of moduleState.lessons.entries()) {
      await rpc('admin_update_lesson', {
        p_lesson_id: lessonState.id,
        p_is_required: true,
        p_is_preview: Boolean(plan.modules[m].lessons[l].preview),
        p_duration_seconds: durations.get(lessonState.videoId),
      })
    }
  }
  for (const locale of locales) await rpc('admin_set_translation_publication', { p_course_id: state.courseId, p_locale: locale, p_published: true })
  await rpc('admin_set_course_status', { p_course_id: state.courseId, p_status: 'published' })
  for (const [m, moduleState] of state.modules.entries()) {
    for (const locale of Object.keys(plan.modules[m].translations)) {
      await rpc('admin_set_module_translation_publication', { p_module_id: moduleState.id, p_locale: locale, p_publish: true })
    }
    for (const [l, lessonState] of moduleState.lessons.entries()) {
      for (const locale of Object.keys(plan.modules[m].lessons[l].translations)) {
        await rpc('admin_set_lesson_translation_publication', { p_lesson_id: lessonState.id, p_locale: locale, p_publish: true })
      }
      await rpc('admin_set_lesson_status', { p_lesson_id: lessonState.id, p_status: 'published' })
    }
  }
  console.log(`Published ${lessonStates.length} lessons in ${plan.course.slug}.`)
}

await supabase.auth.signOut()
