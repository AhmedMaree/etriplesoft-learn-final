import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { signInAdmin } from './lib/admin-mfa.mjs'

// One-off operator command that publishes a course's final assessment questions onto its existing
// assessment lesson, through the same audited admin RPCs as the practice checks. Published quiz
// versions are immutable; learners get the newest one. Progress is kept in tmp/final-assessment-<lesson>.json
// so a rerun resumes instead of publishing another version. Deleting that file and rerunning publishes a new version.
//
//   node scripts/publish-final-assessment.mjs --plan=scripts/course-plans/crash-course-final-assessment.json            # dry run
//   ... --apply

nextEnv.loadEnvConfig(process.cwd(), true)

const args = process.argv.slice(2)
const planPath = args.find((value) => value.startsWith('--plan='))?.slice(7)
const apply = args.includes('--apply')
if (!planPath) throw new Error('Pass --plan=<assessment.json>.')
const plan = JSON.parse(await readFile(planPath, 'utf8'))
if (!plan.courseSlug || !plan.lessonId || !['en', 'ar'].includes(plan.locale) || !plan.title || !Array.isArray(plan.questions) || !plan.questions.length) {
  throw new Error('The assessment plan is invalid.')
}
plan.questions.forEach((question, index) => {
  const correct = question.options?.filter((option) => option.correct === true).length ?? 0
  if (question.type !== 'single' || !question.prompt?.trim() || question.options.length < 2 || correct !== 1) {
    throw new Error(`Question ${index + 1} must be single-choice with exactly one correct option.`)
  }
})
// Translations keep the source question/option order; scoring stays on the shared option identities.
const translations = Object.entries(plan.translations ?? {})
for (const [locale, translation] of translations) {
  if (!['en', 'ar'].includes(locale) || locale === plan.locale || !translation.title?.trim() || translation.questions?.length !== plan.questions.length) {
    throw new Error(`The ${locale} translation is invalid.`)
  }
  translation.questions.forEach((question, index) => {
    if (!question.prompt?.trim() || question.options?.length !== plan.questions[index].options.length || question.options.some((label) => !label?.trim())) {
      throw new Error(`The ${locale} translation of question ${index + 1} does not match the source.`)
    }
  })
}

const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'UPLOAD_ADMIN_EMAIL', 'UPLOAD_ADMIN_PASSWORD', 'UPLOAD_ADMIN_TOTP_SECRET']
const missing = requiredEnv.filter((name) => !process.env[name]?.trim())
if (missing.length) throw new Error(`Missing local operator settings: ${missing.join(', ')}`)
if (process.env.MUX_ENVIRONMENT !== 'development') throw new Error('Content publishing is restricted to the development environment.')

const statePath = path.resolve(`tmp/final-assessment-${plan.lessonId}.json`)
const state = await readFile(statePath, 'utf8').then(JSON.parse, () => ({}))
const saveState = async () => {
  await mkdir(path.dirname(statePath), { recursive: true })
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: true, persistSession: false },
})
await signInAdmin(client, { email: process.env.UPLOAD_ADMIN_EMAIL, password: process.env.UPLOAD_ADMIN_PASSWORD, totpSecret: process.env.UPLOAD_ADMIN_TOTP_SECRET })

async function rpc(name, params) {
  const { data, error } = await client.rpc(name, params)
  if (error) throw new Error(`${name} failed with database code ${error.code ?? 'unknown'}.`)
  return data
}

const courses = await rpc('admin_list_courses', { p_status: 'published', p_limit: 200, p_offset: 0 })
const course = Array.isArray(courses) ? courses.find((item) => item.slug === plan.courseSlug) : null
if (!course) throw new Error(`Published course not found: ${plan.courseSlug}`)
const curriculum = await rpc('admin_get_curriculum', { p_course_id: course.id, p_locale: plan.locale })
const lesson = curriculum.flatMap((module) => module.lessons).find((item) => item.id === plan.lessonId)
if (!lesson || lesson.type !== 'assessment') throw new Error(`Expected assessment lesson ${plan.lessonId} in ${plan.courseSlug}.`)
console.log(`${plan.courseSlug} / ${lesson.title} (${lesson.status}, required=${lesson.required})`)
plan.questions.forEach((question, index) => {
  console.log(`  ${index + 1}. ${question.prompt}  ✓ ${question.options.find((option) => option.correct).label}`)
})
if (!apply) {
  console.log(`\nDry run only. ${plan.questions.length} questions would be published (${plan.locale}). Re-run with --apply.`)
  await client.auth.signOut()
  process.exit(0)
}

if (!state.versionId) {
  state.versionId = await rpc('admin_create_quiz_version', {
    p_lesson_id: plan.lessonId, p_locale: plan.locale, p_title: plan.title,
    p_instructions: plan.instructions ?? '', p_questions: plan.questions,
  })
  await saveState()
}
if (!state.published) {
  for (const [locale, translation] of translations) {
    await rpc('admin_localize_quiz_draft', {
      p_version_id: state.versionId, p_locale: locale, p_title: translation.title,
      p_instructions: translation.instructions ?? '', p_questions: translation.questions,
    })
  }
  await rpc('admin_publish_quiz_version', { p_version_id: state.versionId })
  state.published = true
  await saveState()
}

await client.auth.signOut()
console.log(`\nPublished ${plan.questions.length} questions to ${plan.courseSlug} / ${lesson.title}.`)
