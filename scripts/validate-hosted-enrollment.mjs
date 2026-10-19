// Phase 10 hosted DEV validation for enrollment/entitlement RPCs and RLS.
//
// Targets only the linked Hosted DEV project. Learner/anonymous assertions use real role-scoped user
// sessions through PostgREST. The service-role key is used ONLY to create synthetic example.test
// learners and to mint a session for an existing synthetic admin; it is never used for assertions.
// State transitions the API intentionally does not expose (expiry, completion) are applied with the
// linked Supabase CLI as SQL against rows owned by this run only.
//
// Persistent, tagged test history is retained on purpose (enrollment/audit FKs are RESTRICT):
// the test course is archived and the test learners are banned at the end of the run.
import { readFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { enrollAdminTotp, verifyAdminTotp } from './lib/admin-mfa.mjs'

const wanted = new Set([
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_DEV_PROJECT_REF',
  'SUPABASE_SERVICE_ROLE_KEY',
])
const fileEnv = {}
for (const line of (await readFile('.env.local', 'utf8')).replace(/^﻿/, '').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && wanted.has(m[1])) fileEnv[m[1]] = m[2].trim().replace(/^(?:"(.*)"|'(.*)')$/, (_, a, b) => a ?? b)
}
const env = { ...fileEnv, ...process.env }
const url = env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const adminEmail = process.env.PHASE10_ADMIN_EMAIL
const linkedRef = (await readFile('supabase/.temp/project-ref', 'utf8')).trim()
const urlRef = new URL(url).hostname.split('.')[0]
if (!adminEmail?.endsWith('@example.test')) throw new Error('Set PHASE10_ADMIN_EMAIL to an existing synthetic @example.test admin.')
if (urlRef !== env.SUPABASE_DEV_PROJECT_REF || urlRef !== linkedRef) throw new Error('URL, SUPABASE_DEV_PROJECT_REF and CLI link must identify the same DEV project.')
if (!serviceKey) throw new Error('A service-role key is required to create synthetic users (process env or .env.local).')

const runId = `p10-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`
const noSession = { auth: { autoRefreshToken: false, persistSession: false } }
const mk = (key) => createClient(url, key, noSession)
const svc = mk(serviceKey)
const results = []
let failures = 0
const record = (scenario, expected, actual, passed) => {
  results.push({ scenario, expected, actual, result: passed ? 'PASS' : 'FAIL' })
  if (!passed) failures += 1
}

function sql(query) {
  const r = spawnSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'db', 'query', '--linked', '-o', 'json', query], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`SQL failed: ${r.stderr || r.stdout}`)
  const text = r.stdout
  const rows = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)).rows
  return rows
}
const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`)
  return res.data
}

const password = randomBytes(18).toString('base64url')
const learners = {}
async function makeLearner(tag) {
  const email = `${runId}-${tag}@example.test`
  const created = must(await svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `Phase10 test ${tag}` } }), 'createUser')
  const client = mk(publishableKey)
  must(await client.auth.signInWithPassword({ email, password }), 'sign in')
  return { id: created.user.id, email, client }
}

async function makeAdmin() {
  const link = must(await svc.auth.admin.generateLink({ type: 'magiclink', email: adminEmail }), 'generateLink')
  const client = mk(publishableKey)
  must(await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' }), 'verifyOtp')
  // Admin RPCs need an MFA-verified (aal2) session. A synthetic admin without a factor gets a
  // temporary one for this run (removed in cleanup); one with a factor needs its secret.
  const factors = must(await client.auth.mfa.listFactors(), 'list MFA factors')
  if (factors.totp.some((factor) => factor.status === 'verified')) {
    await verifyAdminTotp(client, process.env.PHASE10_ADMIN_TOTP_SECRET)
  } else {
    await enrollAdminTotp(client)
    temporaryFactorId = must(await client.auth.mfa.listFactors(), 'list MFA factors').totp.find((factor) => factor.status === 'verified')?.id
  }
  return client
}
let temporaryFactorId

const denied = (res) => Boolean(res.error)
const codeOf = (res) => res.error?.code ?? res.error?.message ?? 'none'

let courseId
let admin
try {
  admin = await makeAdmin()
  const adminList = await admin.rpc('admin_list_courses', { p_status: null, p_limit: 1, p_offset: 0 })
  record('synthetic admin session is recognised by the server', 'admin_list_courses succeeds', adminList.error ? codeOf(adminList) : 'ok', !adminList.error)

  // ---- Purpose-built free test course (never the persistent demo courses) -------------------
  courseId = must(await admin.rpc('admin_create_course', { p_slug: runId, p_category: 'phase10-check', p_level: 'beginner', p_price_minor: 0 }), 'create course')
  for (const loc of ['en', 'ar']) {
    must(await admin.rpc('admin_upsert_course_translation', { p_course_id: courseId, p_locale: loc, p_title: `Phase 10 test course (${loc}) ${runId}`, p_summary: 'Temporary DEV verification data, not for sale.' }), 'course translation')
    must(await admin.rpc('admin_set_translation_publication', { p_course_id: courseId, p_locale: loc, p_published: true }), 'publish course translation')
  }
  must(await admin.rpc('admin_set_course_status', { p_course_id: courseId, p_status: 'published' }), 'publish course')
  const moduleId = must(await admin.rpc('admin_create_course_module', { p_course_id: courseId }), 'module')
  for (const loc of ['en', 'ar']) {
    must(await admin.rpc('admin_save_module_translation', { p_module_id: moduleId, p_locale: loc, p_title: `Module ${loc}` }), 'module translation')
    must(await admin.rpc('admin_set_module_translation_publication', { p_module_id: moduleId, p_locale: loc, p_publish: true }), 'publish module translation')
  }
  async function lesson(label, { preview = false, status = 'published', arPublished = true, enPublished = true }) {
    const id = must(await admin.rpc('admin_create_lesson', { p_module_id: moduleId, p_lesson_type: 'article', p_is_required: true, p_is_preview: preview }), 'lesson')
    for (const [loc, pub] of [['en', enPublished], ['ar', arPublished]]) {
      must(await admin.rpc('admin_save_lesson_translation', { p_lesson_id: id, p_locale: loc, p_title: `${label} ${loc}`, p_summary: 's', p_body: `BODY-${label}-${loc}` }), 'lesson translation')
      if (pub) must(await admin.rpc('admin_set_lesson_translation_publication', { p_lesson_id: id, p_locale: loc, p_publish: true }), 'publish lesson translation')
    }
    if (status === 'published') must(await admin.rpc('admin_set_lesson_status', { p_lesson_id: id, p_status: 'published' }), 'publish lesson')
    return id
  }
  const protectedLesson = await lesson('protected', {})
  const previewLesson = await lesson('preview', { preview: true })
  const draftLesson = await lesson('draft', { status: 'draft' })
  const arDraftLesson = await lesson('ardraft', { arPublished: false })

  const A = (learners.a = await makeLearner('a'))
  const B = (learners.b = await makeLearner('b'))
  const anon = mk(publishableKey)

  // ---- Anonymous --------------------------------------------------------------------------
  const anonRows = await anon.from('enrollments').select('id')
  record('anonymous cannot read enrollments (RLS)', 'zero rows or permission error', anonRows.error ? codeOf(anonRows) : `${anonRows.data.length} row(s)`, anonRows.error || anonRows.data.length === 0)
  const anonGrant = await anon.rpc('learner_grant_free_enrollment', { p_course_id: courseId })
  record('anonymous cannot grant enrollment', 'RPC rejected', denied(anonGrant) ? codeOf(anonGrant) : 'accepted', denied(anonGrant))
  const anonBody = await anon.rpc('learner_get_lesson', { p_lesson_id: protectedLesson, p_locale: 'en' })
  record('anonymous gets no non-preview lesson body', 'empty result', denied(anonBody) ? codeOf(anonBody) : `${anonBody.data.length} row(s)`, denied(anonBody) || anonBody.data.length === 0)
  const anonPrev = await anon.rpc('learner_get_lesson', { p_lesson_id: previewLesson, p_locale: 'en' })
  record('anonymous gets published exact-locale preview', '1 row', denied(anonPrev) ? codeOf(anonPrev) : `${anonPrev.data.length} row(s)`, !denied(anonPrev) && anonPrev.data.length === 1)
  const anonDraft = await anon.rpc('learner_get_lesson', { p_lesson_id: draftLesson, p_locale: 'en' })
  record('unpublished lesson is not returned', 'empty result', denied(anonDraft) ? codeOf(anonDraft) : `${anonDraft.data.length} row(s)`, denied(anonDraft) || anonDraft.data.length === 0)

  // ---- Browser cannot grant paid access or write rows directly ----------------------------
  const paid = sql("select id from courses where slug='odoo-development'")[0].id
  const paidGrant = await A.client.rpc('learner_grant_free_enrollment', { p_course_id: paid })
  record('learner cannot self-grant a paid course', 'RPC rejected', denied(paidGrant) ? codeOf(paidGrant) : 'accepted', denied(paidGrant))
  const directInsert = await A.client.from('enrollments').insert({ user_id: A.id, course_id: courseId, grant_source: 'free', status: 'active', granted_by: A.id })
  record('learner direct INSERT denied', 'permission error', denied(directInsert) ? codeOf(directInsert) : 'accepted', denied(directInsert))

  // ---- Before enrollment ------------------------------------------------------------------
  const preBody = await A.client.rpc('learner_get_lesson', { p_lesson_id: protectedLesson, p_locale: 'en' })
  record('non-enrolled learner gets no protected body', 'empty result', denied(preBody) ? codeOf(preBody) : `${preBody.data.length} row(s)`, denied(preBody) || preBody.data.length === 0)

  // ---- Grant, idempotency, concurrency ----------------------------------------------------
  const first = must(await A.client.rpc('learner_grant_free_enrollment', { p_course_id: courseId }), 'grant')
  const again = must(await A.client.rpc('learner_grant_free_enrollment', { p_course_id: courseId }), 'grant again')
  record('free grant is idempotent', 'same enrollment id returned twice', `${first === again ? 'same' : 'different'} id`, first === again)
  const burst = await Promise.all(Array.from({ length: 8 }, () => B.client.rpc('learner_grant_free_enrollment', { p_course_id: courseId })))
  const burstIds = new Set(burst.map((r) => r.data).filter(Boolean))
  const bActive = sql(`select count(*)::int n from enrollments where user_id='${B.id}' and course_id='${courseId}' and status='active'`)[0].n
  record('8 concurrent grants create one active row', '1 distinct id, 1 active row', `${burstIds.size} id(s), ${bActive} active row(s), ${burst.filter((r) => r.error).length} error(s)`, burstIds.size === 1 && bActive === 1 && burst.every((r) => !r.error))

  // ---- Entitled access, exact locale ------------------------------------------------------
  for (const loc of ['en', 'ar']) {
    const r = await A.client.rpc('learner_get_lesson', { p_lesson_id: protectedLesson, p_locale: loc })
    record(`enrolled learner reads protected body (${loc})`, `body BODY-protected-${loc}`, denied(r) ? codeOf(r) : r.data?.[0]?.body ?? 'empty', !denied(r) && r.data?.[0]?.body === `BODY-protected-${loc}`)
  }
  const arMissing = await A.client.rpc('learner_get_lesson', { p_lesson_id: arDraftLesson, p_locale: 'ar' })
  record('enrolled learner gets no body for an unpublished locale (no fallback)', 'empty result', denied(arMissing) ? codeOf(arMissing) : `${arMissing.data.length} row(s)`, denied(arMissing) || arMissing.data.length === 0)
  const enDraft = await A.client.rpc('learner_get_lesson', { p_lesson_id: draftLesson, p_locale: 'en' })
  record('enrolled learner gets no body for a draft lesson', 'empty result', denied(enDraft) ? codeOf(enDraft) : `${enDraft.data.length} row(s)`, denied(enDraft) || enDraft.data.length === 0)

  // ---- Cross-user isolation ---------------------------------------------------------------
  const bSees = await B.client.from('enrollments').select('id,user_id')
  record('learner sees only own enrollment rows', 'only own user_id', `${bSees.data?.length ?? 0} row(s)`, !bSees.error && bSees.data.every((r) => r.user_id === B.id))
  const bById = await B.client.from('enrollments').select('id').eq('id', first)
  record("learner B cannot read learner A's enrollment by id", '0 rows', bById.error ? codeOf(bById) : `${bById.data.length} row(s)`, bById.error || bById.data.length === 0)
  const bUpdate = await B.client.from('enrollments').update({ status: 'revoked' }).eq('id', first).select()
  record("learner B cannot update A's enrollment", 'denied or 0 rows', bUpdate.error ? codeOf(bUpdate) : `${bUpdate.data.length} row(s)`, bUpdate.error || bUpdate.data.length === 0)
  const bDelete = await B.client.from('enrollments').delete().eq('id', first).select()
  record("learner B cannot delete A's enrollment", 'denied or 0 rows', bDelete.error ? codeOf(bDelete) : `${bDelete.data.length} row(s)`, bDelete.error || bDelete.data.length === 0)
  const aUpdate = await A.client.from('enrollments').update({ status: 'completed' }).eq('id', first).select()
  record('learner cannot change own enrollment status', 'denied or 0 rows', aUpdate.error ? codeOf(aUpdate) : `${aUpdate.data.length} row(s)`, aUpdate.error || aUpdate.data.length === 0)

  // ---- Admin boundary ---------------------------------------------------------------------
  const learnerRevoke = await B.client.rpc('admin_revoke_enrollment', { p_enrollment_id: first })
  record('learner cannot call admin revoke', 'RPC rejected', denied(learnerRevoke) ? codeOf(learnerRevoke) : 'accepted', denied(learnerRevoke))
  const forged = mk(publishableKey)
  must(await forged.auth.signInWithPassword({ email: B.email, password }), 'forged sign in')
  await forged.auth.updateUser({ data: { role: 'admin', roles: ['admin'] } })
  const forgedRevoke = await forged.rpc('admin_revoke_enrollment', { p_enrollment_id: first })
  record('forged user_metadata admin claim cannot revoke', 'RPC rejected', denied(forgedRevoke) ? codeOf(forgedRevoke) : 'accepted', denied(forgedRevoke))
  const stillActive = sql(`select status from enrollments where id='${first}'`)[0].status
  record('enrollment unchanged after denied revoke attempts', 'status active', stillActive, stillActive === 'active')

  // ---- Completed stays entitled; expiry denies; revoke denies; re-enrol keeps history ----
  sql(`update enrollments set status='completed', completed_at=now() where id='${first}'`)
  const completed = await A.client.rpc('learner_get_lesson', { p_lesson_id: protectedLesson, p_locale: 'en' })
  record('completed enrollment stays entitled', '1 row', denied(completed) ? codeOf(completed) : `${completed.data.length} row(s)`, !denied(completed) && completed.data.length === 1)

  const reEnroll = must(await A.client.rpc('learner_grant_free_enrollment', { p_course_id: courseId }), 're-enrol after completion')
  record('re-enrolment after completion creates a new history row', 'new id, old row retained', reEnroll === first ? 'same id' : 'new id', reEnroll !== first)
  const history = sql(`select count(*)::int n from enrollments where user_id='${A.id}' and course_id='${courseId}'`)[0].n
  record('history retained after re-enrolment', '2 rows (1 completed + 1 active)', `${history} row(s)`, history === 2)

  sql(`update enrollments set granted_at = now() - interval '2 days', expires_at = now() - interval '1 minute' where id='${reEnroll}'`)
  sql(`update enrollments set status='revoked', revoked_at=now(), revoked_by='${A.id}' where id='${first}'`)
  const expired = await A.client.rpc('learner_get_lesson', { p_lesson_id: protectedLesson, p_locale: 'en' })
  record('expired (and revoked) entitlement denies protected body', 'empty result', denied(expired) ? codeOf(expired) : `${expired.data.length} row(s)`, denied(expired) || expired.data.length === 0)
  const expiredPreview = await A.client.rpc('learner_get_lesson', { p_lesson_id: previewLesson, p_locale: 'en' })
  record('preview stays available without entitlement', '1 row', denied(expiredPreview) ? codeOf(expiredPreview) : `${expiredPreview.data.length} row(s)`, !denied(expiredPreview) && expiredPreview.data.length === 1)

  // Real admin revoke path: B revoked by the admin through the RPC, audited with the exact enrollment.
  const bEnrollment = sql(`select id from enrollments where user_id='${B.id}' and course_id='${courseId}' and status='active'`)[0].id
  const adminRevoke = await admin.rpc('admin_revoke_enrollment', { p_enrollment_id: bEnrollment })
  record('authorized admin can revoke an enrollment', 'RPC succeeds', adminRevoke.error ? codeOf(adminRevoke) : 'ok', !adminRevoke.error)
  const audit = sql(`select count(*)::int n from admin_audit_log where enrollment_id='${bEnrollment}'`)[0].n
  record('revocation is audited against the exact enrollment', '1 audit row', `${audit} row(s)`, audit === 1)
  const bAfter = await B.client.rpc('learner_get_lesson', { p_lesson_id: protectedLesson, p_locale: 'en' })
  record('revoked learner loses protected body', 'empty result', denied(bAfter) ? codeOf(bAfter) : `${bAfter.data.length} row(s)`, denied(bAfter) || bAfter.data.length === 0)
  const bRow = sql(`select status from enrollments where id='${bEnrollment}'`)[0].status
  record('revoked row is kept as history', 'status revoked, row present', bRow, bRow === 'revoked')
} finally {
  // Retire test data: archive the test course and ban the synthetic learners. History rows stay.
  try {
    if (courseId && admin) await admin.rpc('admin_set_course_status', { p_course_id: courseId, p_status: 'archived' })
    for (const l of Object.values(learners)) await svc.auth.admin.updateUserById(l.id, { ban_duration: '876000h' })
    if (temporaryFactorId && admin) await admin.auth.mfa.unenroll({ factorId: temporaryFactorId })
  } catch (error) {
    console.error('cleanup warning:', error.message)
  }
}

console.log(JSON.stringify({ runId, courseId, learners: Object.values(learners).map((l) => l.id), results, failures }, null, 2))
if (failures) process.exitCode = 1
