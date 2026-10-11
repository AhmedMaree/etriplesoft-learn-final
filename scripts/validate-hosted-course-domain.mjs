import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const requiredKeys = new Set([
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_DEV_PROJECT_REF',
])
const localEnv = {}
for (const line of (await readFile('.env.local', 'utf8')).replace(/^\uFEFF/, '').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (!match || !requiredKeys.has(match[1])) continue
  localEnv[match[1]] = match[2].trim().replace(/^(?:"(.*)"|'(.*)')$/, (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted)
}

const env = { ...localEnv, ...process.env }
const url = env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const expectedProjectRef = env.SUPABASE_DEV_PROJECT_REF
const linkedProjectRef = (await readFile('supabase/.temp/project-ref', 'utf8')).trim()

if (!url || !publishableKey || !expectedProjectRef) {
  throw new Error('Set the DEV URL, publishable key, and SUPABASE_DEV_PROJECT_REF in .env.local or the process environment.')
}
if (env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('A service-role key must never use a NEXT_PUBLIC_ variable.')
}

const urlProjectRef = new URL(url).hostname.split('.')[0]
if (urlProjectRef !== expectedProjectRef || urlProjectRef !== linkedProjectRef) {
  throw new Error('The app URL, SUPABASE_DEV_PROJECT_REF, and Supabase CLI link must all identify the same DEV project.')
}

const anonymous = createClient(url, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const results = []
let failures = 0

function record(scenario, expected, actual, passed) {
  results.push({ scenario, expected, actual, result: passed ? 'PASS' : 'FAIL' })
  if (!passed) failures += 1
}

async function checkCatalog(locale) {
  const { data, error } = await anonymous.rpc('catalog_list_courses', {
    p_locale: locale,
    p_limit: 50,
    p_offset: 0,
  })
  const rows = data ?? []
  const passed = !error && rows.length <= 50 && rows.every((course) => course.currency === 'EGP')
  record(
    `anonymous ${locale} catalog RPC`,
    'success, at most 50 rows, EGP currency',
    error ? `rejected (${error.code ?? 'error'})` : `${rows.length} row(s); currency check passed`,
    passed,
  )
}

try {
  await checkCatalog('en')
  await checkCatalog('ar')

  const publicCourses = await anonymous
    .from('courses')
    .select('id, slug, status, level, category, price_minor, currency, thumbnail_object_key, published_at')
    .limit(50)
  record(
    'anonymous published-safe course columns',
    'request succeeds under RLS and column grants',
    publicCourses.error ? `rejected (${publicCourses.error.code ?? 'error'})` : `${publicCourses.data?.length ?? 0} row(s)`,
    !publicCourses.error,
  )

  const publicTranslations = await anonymous
    .from('course_translations')
    .select('course_id, locale, title, summary, description, publication_status, published_at')
    .limit(50)
  record(
    'anonymous published translation columns',
    'request succeeds under RLS and column grants',
    publicTranslations.error ? `rejected (${publicTranslations.error.code ?? 'error'})` : `${publicTranslations.data?.length ?? 0} row(s)`,
    !publicTranslations.error,
  )

  const publicInstructors = await anonymous
    .from('course_instructors')
    .select('course_id, position, display_name')
    .limit(50)
  record(
    'anonymous instructor display names',
    'request succeeds without profile data',
    publicInstructors.error ? `rejected (${publicInstructors.error.code ?? 'error'})` : `${publicInstructors.data?.length ?? 0} row(s)`,
    !publicInstructors.error,
  )

  const privateCourseColumn = await anonymous.from('courses').select('created_by').limit(1)
  record(
    'anonymous cannot select course creator IDs',
    'request rejected',
    privateCourseColumn.error ? `rejected (${privateCourseColumn.error.code ?? 'error'})` : 'request accepted',
    Boolean(privateCourseColumn.error),
  )

  const privateInstructorColumn = await anonymous.from('course_instructors').select('profile_id').limit(1)
  record(
    'anonymous cannot select instructor profile IDs',
    'request rejected',
    privateInstructorColumn.error ? `rejected (${privateInstructorColumn.error.code ?? 'error'})` : 'request accepted',
    Boolean(privateInstructorColumn.error),
  )

  const unsupportedLocale = await anonymous.rpc('catalog_list_courses', {
    p_locale: 'fr',
    p_limit: 1,
    p_offset: 0,
  })
  record(
    'unsupported catalog locale is rejected',
    'request rejected',
    unsupportedLocale.error ? `rejected (${unsupportedLocale.error.code ?? 'error'})` : 'request accepted',
    Boolean(unsupportedLocale.error),
  )
} catch (error) {
  record('hosted course-domain validation completed', 'all checks executed', error instanceof Error ? error.message : 'unexpected error', false)
} finally {
  console.table(results)
  console.log(`Hosted course-domain validation: ${results.length - failures}/${results.length} passed. No test users, courses, translations, instructors, or audit rows were created.`)
  if (failures > 0) process.exitCode = 1
}
