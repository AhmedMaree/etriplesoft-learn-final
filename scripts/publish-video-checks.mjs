import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { signInAdmin } from './lib/admin-mfa.mjs'

// Operator command that publishes each video's two-question practice check: an optional assessment lesson
// placed right after the video, answered inside the video panel when the video ends. Each check is a new
// immutable, untimed quiz version in English and Arabic, published through the audited admin RPCs.
//
//   node scripts/publish-video-checks.mjs --plan=scripts/course-plans/python-fundamentals-video-checks.json            # dry run
//   ... --apply
//
// Progress is kept in tmp/video-checks-state.json, so a rerun skips checks whose questions are already published
// and resumes an interrupted one. Changing a video's questions in the plan publishes a new version on the next run.

nextEnv.loadEnvConfig(process.cwd(), true)

const args = process.argv.slice(2)
const planPath = args.find((value) => value.startsWith('--plan='))?.slice(7)
const apply = args.includes('--apply')
if (!planPath) throw new Error('Pass --plan=<course>-video-checks.json.')
const plan = JSON.parse(await readFile(planPath, 'utf8'))
if (!plan.courseSlug || !Array.isArray(plan.videos) || !plan.videos.length) throw new Error('The plan is invalid.')
for (const video of plan.videos) {
  if (!video.lessonId || !video.title || !Array.isArray(video.questions) || video.questions.length !== 2) {
    throw new Error(`Every video needs lessonId, title and exactly two questions: ${video.title ?? video.lessonId}`)
  }
  video.questions.forEach((question, index) => {
    const count = question.en?.options?.length
    const valid = ['en', 'ar'].every((locale) => question[locale]?.prompt?.trim() && question[locale].options?.length === count && question[locale].options.every((label) => label?.trim()))
    if (!valid || count < 2 || !Number.isInteger(question.correct) || question.correct < 0 || question.correct >= count) {
      throw new Error(`${video.title}: question ${index + 1} needs matching English and Arabic options and a valid correct index.`)
    }
  })
}

const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'UPLOAD_ADMIN_EMAIL', 'UPLOAD_ADMIN_PASSWORD']
const missing = requiredEnv.filter((name) => !process.env[name]?.trim())
if (missing.length) throw new Error(`Missing local operator settings: ${missing.join(', ')}`)
if (process.env.MUX_ENVIRONMENT !== 'development') throw new Error('Content publishing is restricted to the development environment.')

const statePath = path.resolve('tmp/video-checks-state.json')
const state = await readFile(statePath, 'utf8').then(JSON.parse, () => ({ entries: {} }))
const saveState = async () => {
  await mkdir(path.dirname(statePath), { recursive: true })
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: true, persistSession: false },
})
// Admin RPCs need an MFA-verified session unless the development database has the MFA requirement switched off.
if (process.env.UPLOAD_ADMIN_TOTP_SECRET?.trim()) {
  await signInAdmin(client, { email: process.env.UPLOAD_ADMIN_EMAIL, password: process.env.UPLOAD_ADMIN_PASSWORD, totpSecret: process.env.UPLOAD_ADMIN_TOTP_SECRET })
} else {
  const { error } = await client.auth.signInWithPassword({ email: process.env.UPLOAD_ADMIN_EMAIL, password: process.env.UPLOAD_ADMIN_PASSWORD })
  if (error) throw new Error(`Admin sign-in failed: ${error.message}`)
}

async function rpc(name, params) {
  const { data, error } = await client.rpc(name, params)
  if (error) throw new Error(`${name} failed with database code ${error.code ?? 'unknown'}.`)
  return data
}

const courses = await rpc('admin_list_courses', { p_status: 'published', p_limit: 200, p_offset: 0 })
const course = Array.isArray(courses) ? courses.find((item) => item.slug === plan.courseSlug) : null
if (!course) throw new Error(`Published course not found: ${plan.courseSlug}`)
const curriculum = async (locale) => rpc('admin_get_curriculum', { p_course_id: course.id, p_locale: locale })
const flatten = (modules) => modules.flatMap((courseModule) => courseModule.lessons.map((lesson) => ({ ...lesson, moduleId: courseModule.id })))

const english = flatten(await curriculum('en'))
const arabicTitles = new Map(flatten(await curriculum('ar')).map((lesson) => [lesson.id, lesson.title]))
const hash = (video) => createHash('sha256').update(JSON.stringify(video.questions)).digest('hex')

// Resolve each video, its existing check lesson (the optional assessment right after it) and the pending work.
const work = plan.videos.map((video) => {
  const index = english.findIndex((lesson) => lesson.id === video.lessonId)
  const lesson = english[index]
  if (!lesson || lesson.type !== 'video' || lesson.title !== video.title) throw new Error(`Expected video lesson "${video.title}" (${video.lessonId}).`)
  if (!arabicTitles.get(video.lessonId)) throw new Error(`"${video.title}" has no Arabic lesson title.`)
  const saved = state.entries[video.lessonId]
  const next = english[index + 1]
  const adjacent = next?.moduleId === lesson.moduleId && next.type === 'assessment' && !next.required ? next : null
  const checkId = saved?.checkLessonId ?? adjacent?.id ?? null
  const upToDate = saved?.hash === hash(video) && saved.published
  return { video, lesson, checkId, upToDate }
})

for (const { video, checkId, upToDate } of work) {
  console.log(`  ${video.title}: ${upToDate ? 'up to date' : checkId ? 'publish a new untimed version' : 'create check lesson and publish'}`)
}
if (!apply) {
  console.log(`\nDry run only. ${work.filter((item) => !item.upToDate).length} of ${work.length} checks would be published. Re-run with --apply.`)
  await client.auth.signOut()
  process.exit(0)
}

const lessonText = {
  en: { summary: 'Two quick questions about the video. No time limit; optional, it does not affect course completion.', body: 'Answer two quick questions to review the main ideas of the video. There is no time limit, and this optional check does not affect course completion.' },
  ar: { summary: 'سؤالان سريعان عن الفيديو. بدون حد زمني؛ اختياري ولا يؤثر على إكمال الكورس.', body: 'أجب عن سؤالين سريعين لمراجعة الأفكار الرئيسية في الفيديو. لا يوجد حد زمني، وهذا الاختبار اختياري ولا يؤثر على إكمال الكورس.' },
}
const checkTitle = (video) => ({ en: `Quick Check: ${video.title}`, ar: `اختبار سريع: ${arabicTitles.get(video.lessonId)}` })
const toQuestions = (video, locale) => video.questions.map((question) => ({
  type: 'single', prompt: question[locale].prompt, explanation: question[locale].explanation ?? '',
  options: question[locale].options.map((label, index) => ({ label, correct: index === question.correct })),
}))

for (const item of work.filter((entry) => !entry.upToDate)) {
  const { video, lesson } = item
  const titles = checkTitle(video)
  const entry = state.entries[video.lessonId] ??= {}
  if (!entry.checkLessonId) {
    entry.checkLessonId = item.checkId ?? await rpc('admin_create_lesson_draft', { p_module_id: lesson.moduleId, p_locale: 'en', p_title: titles.en, p_type: 'assessment' })
    await saveState()
  }
  if (entry.hash !== hash(video)) {
    entry.hash = hash(video)
    entry.versionId = null
    entry.published = false
  }
  if (!entry.versionId) {
    entry.versionId = await rpc('admin_create_quiz_version', {
      p_lesson_id: entry.checkLessonId, p_locale: 'en', p_title: titles.en,
      p_instructions: 'Two quick questions about the video. No time limit. Pass mark: 70%. Up to three attempts.', p_questions: toQuestions(video, 'en'),
    })
    await saveState()
  }
  if (!entry.published) {
    await rpc('admin_localize_quiz_draft', {
      p_version_id: entry.versionId, p_locale: 'ar', p_title: titles.ar,
      p_instructions: 'سؤالان سريعان عن الفيديو. بدون حد زمني. درجة النجاح: 70%. حتى ثلاث محاولات.',
      p_questions: toQuestions(video, 'ar').map((question) => ({ prompt: question.prompt, explanation: question.explanation, options: question.options.map((option) => option.label) })),
    })
    await rpc('admin_set_quiz_draft_untimed', { p_version_id: entry.versionId })
    await rpc('admin_publish_quiz_version', { p_version_id: entry.versionId })
    for (const locale of ['en', 'ar']) {
      await rpc('admin_edit_lesson', {
        p_id: entry.checkLessonId, p_locale: locale, p_title: titles[locale], p_summary: lessonText[locale].summary, p_body: lessonText[locale].body,
        p_required: false, p_preview: false, p_publish: true, p_duration: null,
      })
    }
    entry.published = true
    await saveState()
  }
  console.log(`Published: ${video.title}`)
}

// Keep every check directly after its video.
const checkOf = new Map(plan.videos.map((video) => [video.lessonId, state.entries[video.lessonId].checkLessonId]))
const checkIds = new Set(checkOf.values())
for (const courseModule of await curriculum('en')) {
  const ids = courseModule.lessons.map((lesson) => lesson.id)
  const desired = ids.filter((id) => !checkIds.has(id)).flatMap((id) => (checkOf.has(id) && ids.includes(checkOf.get(id)) ? [id, checkOf.get(id)] : [id]))
  if (desired.length === ids.length && desired.some((id, index) => id !== ids[index])) {
    await rpc('admin_reorder_module_lessons', { p_module_id: courseModule.id, p_lesson_ids: desired })
  }
}

const final = flatten(await curriculum('en'))
for (const video of plan.videos) {
  const index = final.findIndex((lesson) => lesson.id === video.lessonId)
  const check = final[index + 1]
  if (check?.id !== checkOf.get(video.lessonId) || check.type !== 'assessment' || check.required || check.status !== 'published' || !check.published) {
    throw new Error(`Verification failed: the check for "${video.title}" is not published directly after the video.`)
  }
}
await client.auth.signOut()
console.log(`\nVerified ${plan.videos.length} untimed practice checks published directly after their videos in ${plan.courseSlug}.`)
