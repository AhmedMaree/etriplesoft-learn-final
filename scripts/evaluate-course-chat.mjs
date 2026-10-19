import { readFileSync } from 'node:fs'
import { GEMINI, createAdminSession, createGeminiPool, modelName, requireOperatorEnv } from './lib/ai-operator.mjs'

// Operator command: measures Course chat retrieval against scripts/ai-eval/course-chat-cases.json.
// A case passes when one of its expected lessons (module.lesson) is in the top 3 results of the same search
// learners use (learner_ai_search_course; admins may search any published course). Exits 1 below 80%.
//
//   npm run ai:eval            # or: node scripts/evaluate-course-chat.mjs --cases=<file.json>

requireOperatorEnv([])
const casesPath = process.argv.find((value) => value.startsWith('--cases='))?.slice(8) ?? 'scripts/ai-eval/course-chat-cases.json'
const { cases } = JSON.parse(readFileSync(casesPath, 'utf8'))
const MODEL = modelName(process.env.GEMINI_EMBEDDING_MODEL, 'gemini-embedding-2')
const TOP_K = 3
const PASS_RATE = 0.8

const { supabase, rpc } = await createAdminSession()
const gemini = createGeminiPool()
const courseIds = new Map()

async function courseId(slug) {
  if (!courseIds.has(slug)) {
    const { data } = await supabase.from('courses').select('id').eq('slug', slug).maybeSingle()
    if (!data) throw new Error(`Course "${slug}" was not found.`)
    courseIds.set(slug, data.id)
  }
  return courseIds.get(slug)
}

async function embedQuery(text) {
  const response = await gemini.fetch(`${GEMINI}/v1beta/models/${MODEL}:embedContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: { parts: [{ text }] }, taskType: 'RETRIEVAL_QUERY', outputDimensionality: 768 }),
  }, 'embed')
  return (await response.json()).embedding.values
}

let passed = 0
for (const item of cases) {
  const rows = await rpc('learner_ai_search_course', {
    p_course_id: await courseId(item.course),
    p_model: MODEL,
    p_embedding: `[${(await embedQuery(item.question)).join(',')}]`,
    p_limit: TOP_K,
  })
  const found = rows.map((row) => (row.module_position && row.lesson_position ? `${row.module_position}.${row.lesson_position}` : 'course'))
  const hit = found.some((position) => item.expect.includes(position))
  if (hit) passed += 1
  console.log(`${hit ? 'PASS' : 'FAIL'}  ${item.course}  "${item.question}"`)
  console.log(`      expected ${item.expect.join('|')}  got ${rows.map((row, i) => `${found[i]} ${row.source_type} ${row.similarity.toFixed(2)}`).join(', ') || 'nothing'}`)
}
const rate = passed / cases.length
console.log(`\nhit@${TOP_K}: ${passed}/${cases.length} (${Math.round(rate * 100)}%) — threshold ${Math.round(PASS_RATE * 100)}%`)
if (rate < PASS_RATE) process.exitCode = 1
