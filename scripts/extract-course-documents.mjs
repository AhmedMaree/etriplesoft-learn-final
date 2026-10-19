import { createClient } from '@supabase/supabase-js'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import {
  GEMINI, KeyExhausted, NETWORK_ATTEMPTS, createAdminSession, createGeminiPool, isNetworkError, languageOf, modelName, parseArgs,
  requireOperatorEnv, sleep,
} from './lib/ai-operator.mjs'

// Operator command: extracts the text of lesson PDF attachments so Course chat (RAG) can answer from them, and
// saves it through the audited admin_ai_save_resource_text RPC. Rebuild the course index afterwards in
// Admin > AI course index.
//
//   node scripts/extract-course-documents.mjs --course=crash-course-odoo-erp           # dry run: lists work
//   node scripts/extract-course-documents.mjs --all --apply [--limit=5]
//
// Text comes from the PDF itself (pdfjs, nothing uploaded). Only when a PDF is mostly images (slides, scans)
// is it sent to Gemini, which also describes meaningful diagrams briefly. The service-role key is used only
// to download files from the private course-resources bucket; all writes go through admin RPCs.
// Reruns skip documents whose current file already has text; --force re-extracts them.

const { all, apply, courseSlug, limit } = parseArgs()
if (!courseSlug && !all) throw new Error('Pass --course=<slug> or --all.')
requireOperatorEnv(['SUPABASE_SERVICE_ROLE_KEY'])
const MODEL = modelName(process.env.GEMINI_DOCUMENT_MODEL, process.env.GEMINI_LIGHT_MODEL)
// Slide decks with a thin text layer (mostly images) read far better through Gemini's vision.
const MIN_CHARS_PER_PAGE = 400
const force = process.argv.includes('--force')
const MAX_INLINE_BYTES = 18 * 1024 * 1024

const { rpc, courses: listCourses } = await createAdminSession()
const storage = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
}).storage.from('course-resources')
const gemini = createGeminiPool()

async function download(key) {
  for (let attempt = 1; ; attempt += 1) {
    const { data, error } = await storage.download(key)
    if (data) return new Uint8Array(await data.arrayBuffer())
    if (!isNetworkError(error) || attempt >= NETWORK_ATTEMPTS) throw new Error(`Download failed: ${error?.message ?? 'unknown error'}`)
    console.log(`  download: network error, retrying in ${10 * attempt} s`)
    await sleep(10_000 * attempt)
  }
}

/** Page text in reading order; a new line wherever pdfjs marks the end of a line. */
async function pdfText(bytes) {
  const task = getDocument({ data: bytes.slice(), useSystemFonts: true, verbosity: 0 })
  const doc = await task.promise
  const pages = []
  for (let number = 1; number <= doc.numPages; number += 1) {
    const content = await (await doc.getPage(number)).getTextContent()
    const text = content.items.map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '')).join('')
    pages.push(text.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim())
  }
  const pageCount = doc.numPages
  await task.destroy()
  return { pages: pageCount, text: pages.filter(Boolean).join('\n\n') }
}

const PROMPT = [
  'Extract the teaching content of this course document (often slides) as plain text, in the language it is written in.',
  'Keep headings, bullet points, steps and table rows in reading order. Keep Odoo and technical terms, menu paths and code exactly as written.',
  'For a diagram or screenshot that carries meaning (for example a business flow), add one short line: [Diagram: ...].',
  'Skip page numbers, logos and decoration. No commentary, no Markdown.',
].join('\n')

async function geminiText(bytes) {
  if (bytes.length > MAX_INLINE_BYTES) throw new Error(`PDF is ${Math.round(bytes.length / 1048576)} MB; above the inline limit.`)
  for (;;) {
    try {
      const response = await gemini.fetch(`${GEMINI}/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data: Buffer.from(bytes).toString('base64') } }, { text: PROMPT }] }],
          generationConfig: { maxOutputTokens: 32768 },
        }),
      }, 'document')
      const body = await response.json()
      return (body.candidates?.[0]?.content?.parts ?? []).filter((part) => !part.thought).map((part) => part.text ?? '').join('').trim()
    } catch (error) {
      if (error instanceof KeyExhausted && gemini.advance()) {
        console.log(`    ${error.message}; switching to key ${gemini.index + 1} of ${gemini.keys.length}`)
        continue
      }
      throw error
    }
  }
}

let processed = 0
for (const course of await listCourses({ all, courseSlug })) {
  const resources = (await rpc('admin_ai_course_resources', { p_course_id: course.id })).filter((resource) => force || !resource.extracted)
  console.log(`\n${course.slug}: ${resources.length} document(s) to extract`)
  for (const resource of resources) {
    if (processed >= limit) break
    if (resource.mime_type !== 'application/pdf') {
      console.log(`  skip (${resource.mime_type ?? 'missing file'}): ${resource.label}`)
      continue
    }
    const size = resource.size_bytes ? `${Math.round(resource.size_bytes / 1024)} KB` : 'unknown size'
    console.log(`  ${apply ? 'extracting' : 'would extract'}: ${resource.label} (${size})`)
    if (!apply) continue
    processed += 1
    try {
      const bytes = await download(resource.storage_object_key)
      const local = await pdfText(bytes)
      const sparse = local.text.length < MIN_CHARS_PER_PAGE * local.pages
      const text = sparse ? await geminiText(bytes) : local.text
      if (!text) {
        console.log('    no text found; nothing saved')
        continue
      }
      await rpc('admin_ai_save_resource_text', {
        p_lesson_resource_id: resource.lesson_resource_id,
        p_storage_object_key: resource.storage_object_key,
        p_language: languageOf(text),
        p_content: text.slice(0, 400000),
        p_method: sparse ? 'gemini' : 'pdf-text',
        p_model: sparse ? MODEL : undefined,
      })
      console.log(`    saved ${text.length} characters from ${local.pages} page(s) via ${sparse ? `Gemini (${MODEL})` : 'PDF text'} (${languageOf(text)})`)
    } catch (error) {
      if (error instanceof KeyExhausted) {
        console.log(`    ${error.message}; every key is out of quota for today. Re-run later to continue.`)
        process.exitCode = 2
        break
      }
      console.log(`    FAILED: ${error instanceof Error ? error.message : error}`)
    }
  }
  if (process.exitCode === 2) break
}
console.log(apply ? `\nDone: ${processed} document(s) processed. Rebuild the index in Admin > AI course index.` : '\nDry run only. Re-run with --apply to extract.')
