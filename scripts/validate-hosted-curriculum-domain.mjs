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
const tables = [
  'course_modules',
  'module_translations',
  'lessons',
  'lesson_translations',
  'lesson_resources',
  'lesson_resource_translations',
]
const results = []
let failures = 0

function record(scenario, expected, actual, passed) {
  results.push({ scenario, expected, actual, result: passed ? 'PASS' : 'FAIL' })
  if (!passed) failures += 1
}

try {
  const outline = await anonymous.rpc('catalog_get_course_outline', {
    p_course_slug: '__phase08_validation_no_course__',
    p_locale: 'en',
    p_limit: 200,
    p_offset: 0,
  })
  record(
    'anonymous bounded outline RPC',
    'RPC succeeds and returns an array without creating content',
    outline.error ? `rejected (${outline.error.code ?? 'error'})` : `${outline.data?.length ?? 0} row(s)`,
    !outline.error && Array.isArray(outline.data) && outline.data.length === 0,
  )

  const unsupportedLocale = await anonymous.rpc('catalog_get_course_outline', {
    p_course_slug: '__phase08_validation_no_course__',
    p_locale: 'fr',
    p_limit: 1,
    p_offset: 0,
  })
  record(
    'unsupported outline locale is rejected',
    'request rejected',
    unsupportedLocale.error ? `rejected (${unsupportedLocale.error.code ?? 'error'})` : 'request accepted',
    Boolean(unsupportedLocale.error),
  )

  for (const table of tables) {
    const { error } = await anonymous.from(table).select('*').limit(1)
    record(
      `anonymous direct read denied: ${table}`,
      'request rejected',
      error ? `rejected (${error.code ?? 'error'})` : 'request accepted',
      Boolean(error),
    )
  }

} catch (error) {
  record('hosted curriculum validation completed', 'all checks executed', error instanceof Error ? error.message : 'unexpected error', false)
} finally {
  console.table(results)
  console.log(`Hosted curriculum validation: ${results.length - failures}/${results.length} passed. The validator is read-only and creates no test data.`)
  if (failures > 0) process.exitCode = 1
}
