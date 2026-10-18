import { readFile } from 'node:fs/promises'
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'

// One-off operator command that attaches finished Bunny Stream videos to existing video lessons through the
// audited admin_attach_bunny_video RPC. The Bunny GUID and duration come from the Bunny API, never from the plan.
//
//   node scripts/attach-bunny-videos.mjs --plan=scripts/course-plans/odoo-user-guide-bunny-videos.json            # dry run
//   ... --apply
//
// Reruns are safe: attaching the same Bunny video to the same lesson returns the existing row.

nextEnv.loadEnvConfig(process.cwd(), true)

const args = process.argv.slice(2)
const planPath = args.find((value) => value.startsWith('--plan='))?.slice(7)
const apply = args.includes('--apply')
if (!planPath) throw new Error('Pass --plan=<bunny-videos.json>.')
const plan = JSON.parse(await readFile(planPath, 'utf8'))
if (!plan.courseSlug || !Array.isArray(plan.lessons) || !plan.lessons.length) throw new Error('The plan is invalid.')

const requiredEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'UPLOAD_ADMIN_EMAIL', 'UPLOAD_ADMIN_PASSWORD', 'BUNNY_LIBRARY_ID', 'BUNNY_API_KEY']
const missing = requiredEnv.filter((name) => !process.env[name]?.trim())
if (missing.length) throw new Error(`Missing local operator settings: ${missing.join(', ')}`)
if (process.env.MUX_ENVIRONMENT !== 'development') throw new Error('Content publishing is restricted to the development environment.')

async function bunny(route) {
  const response = await fetch(`https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}${route}`, {
    headers: { AccessKey: process.env.BUNNY_API_KEY, Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Bunny GET ${route} failed with status ${response.status}.`)
  return response.json()
}
async function listAll(route) {
  const items = []
  for (let page = 1; ; page += 1) {
    const data = await bunny(`${route}${route.includes('?') ? '&' : '?'}page=${page}&itemsPerPage=100`)
    items.push(...data.items)
    if (items.length >= data.totalItems || !data.items.length) return items
  }
}

// Optional: limit title matching to one Bunny collection. Without it, titles must be unique across the library.
let videosRoute = '/videos'
if (plan.bunnyCollection) {
  const collection = (await listAll('/collections')).find((item) => item.name === plan.bunnyCollection)
  if (!collection) throw new Error(`Bunny collection not found: ${plan.bunnyCollection}`)
  videosRoute = `/videos?collection=${collection.guid}`
}
const videos = await listAll(videosRoute)

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

const courses = await rpc('admin_list_courses', { p_status: 'published', p_limit: 200, p_offset: 0 })
const course = courses.find((item) => item.slug === plan.courseSlug)
if (!course) throw new Error(`Published course not found: ${plan.courseSlug}`)
const lessons = (await rpc('admin_get_curriculum', { p_course_id: course.id, p_locale: 'en' })).flatMap((module) => module.lessons)

const work = plan.lessons.map((entry) => {
  const lesson = lessons.find((item) => item.id === entry.lessonId)
  if (!lesson || lesson.type !== 'video' || lesson.title !== entry.title) throw new Error(`Expected video lesson "${entry.title}" (${entry.lessonId}).`)
  const matches = videos.filter((video) => video.title === entry.bunnyTitle)
  if (matches.length !== 1) throw new Error(`Expected exactly one Bunny video titled "${entry.bunnyTitle}", found ${matches.length}.`)
  const [video] = matches
  // Bunny status 4 = finished encoding.
  if (video.status !== 4 || !(video.length > 0)) throw new Error(`Bunny video "${entry.bunnyTitle}" is not finished encoding yet (status ${video.status}).`)
  return { entry, video }
})

for (const { entry, video } of work) console.log(`  ${entry.title} ← Bunny ${video.guid} (${Math.round(video.length / 60)} min)`)
if (!apply) {
  console.log('\nDry run only. Re-run with --apply to attach these videos.')
  await client.auth.signOut()
  process.exit(0)
}

for (const { entry, video } of work) {
  await rpc('admin_attach_bunny_video', { p_lesson_id: entry.lessonId, p_bunny_video_id: video.guid, p_duration_seconds: Math.round(video.length) })
  console.log(`Attached ${entry.title}`)
}
await client.auth.signOut()
