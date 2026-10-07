import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const env = process.env
const url = env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !publishableKey || !serviceRoleKey) {
  throw new Error(
    'Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and server-only SUPABASE_SERVICE_ROLE_KEY before running hosted RLS validation.',
  )
}

if (env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('A service-role key must never use a NEXT_PUBLIC_ variable.')
}

const projectRef = new URL(url).hostname.split('.')[0]
const linkedProjectRef = (await readFile('supabase/.temp/project-ref', 'utf8')).trim()
const expectedProjectRef = env.SUPABASE_DEV_PROJECT_REF

if (!expectedProjectRef || projectRef !== expectedProjectRef || projectRef !== linkedProjectRef) {
  throw new Error('The app URL, SUPABASE_DEV_PROJECT_REF, and Supabase CLI link must all identify the same DEV project.')
}

const runId = `${Date.now()}-${randomBytes(4).toString('hex')}`
const password = randomBytes(24).toString('base64url')
const service = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anonymous = createClient(url, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const users = []
const avatarKeys = []
const results = []
let failures = 0

function record(scenario, expected, actual, passed) {
  results.push({ scenario, expected, actual, result: passed ? 'PASS' : 'FAIL' })
  if (!passed) failures += 1
}

async function checkQuery(scenario, query, expectedCount, { expectError = false } = {}) {
  const { data, error } = await query
  const count = Array.isArray(data) ? data.length : data ? 1 : 0
  const passed = expectError ? Boolean(error) : !error && count === expectedCount
  record(scenario, expectError ? 'request rejected' : `${expectedCount} row(s)`, error ? `rejected (${error.code ?? error.status ?? 'error'})` : `${count} row(s)`, passed)
  return { data, error, passed }
}

async function createValidationUser(label) {
  const email = `codex-rls-validation-${runId}-${label}@example.test`
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      codex_hosted_rls_validation: true,
      run_id: runId,
      display_name: `Validation ${label}`,
      role: 'admin',
      permissions: { admin: true },
    },
  })
  if (error || !data.user) throw new Error(`Could not create disposable DEV validation user (${label}): ${error?.message ?? 'missing user'}`)
  users.push({ id: data.user.id, email })

  const client = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw new Error(`Could not sign in disposable DEV validation user (${label}): ${signInError.message}`)
  return { id: data.user.id, client }
}

try {
  const userA = await createValidationUser('a')
  const userB = await createValidationUser('b')

  const anonymousCases = [
    ['anonymous cannot read profiles', anonymous.from('profiles').select('id').limit(1)],
    ['anonymous cannot read learner preferences', anonymous.from('learner_preferences').select('user_id').limit(1)],
    ['anonymous cannot read role assignments', anonymous.from('user_roles').select('id').limit(1)],
    ['anonymous cannot read role audit records', anonymous.from('admin_audit_log').select('id').limit(1)],
    ['anonymous cannot update profiles', anonymous.from('profiles').update({ display_name: 'Blocked anonymous update' }).eq('id', userA.id)],
    ['anonymous cannot update preferences', anonymous.from('learner_preferences').update({ preferred_locale: 'ar' }).eq('user_id', userA.id)],
    ['anonymous cannot update role assignments', anonymous.from('user_roles').update({ revoked_at: new Date().toISOString(), revoked_by: userA.id }).eq('id', '00000000-0000-0000-0000-000000000000')],
    ['anonymous cannot delete role assignments', anonymous.from('user_roles').delete().eq('id', '00000000-0000-0000-0000-000000000000')],
    ['anonymous cannot insert role assignments', anonymous.from('user_roles').insert({ user_id: '00000000-0000-0000-0000-000000000000', role: 'admin', granted_by: '00000000-0000-0000-0000-000000000000' })],
  ]
  for (const [scenario, query] of anonymousCases) await checkQuery(scenario, query, 0, { expectError: true })

  for (const [label, owner, other] of [['User A', userA, userB], ['User B', userB, userA]]) {
    const ownProfile = await checkQuery(`${label} reads own profile`, owner.client.from('profiles').select('id, display_name, updated_at').eq('id', owner.id), 1)
    record(`${label} trigger initializes only display name`, `Validation ${label === 'User A' ? 'a' : 'b'}`, ownProfile.data?.[0]?.display_name, ownProfile.data?.[0]?.display_name === `Validation ${label === 'User A' ? 'a' : 'b'}`)
    const profileUpdate = await checkQuery(`${label} updates own profile`, owner.client.from('profiles').update({ display_name: `RLS validation ${label}` }).eq('id', owner.id).select('id, updated_at'), 1)
    const previousProfileUpdatedAt = ownProfile.data?.[0]?.updated_at
    const profileUpdatedAt = profileUpdate.data?.[0]?.updated_at
    record(`${label} profile update refreshes updated_at`, 'timestamp changes', profileUpdatedAt !== previousProfileUpdatedAt ? 'changed' : 'unchanged', Boolean(profileUpdatedAt && previousProfileUpdatedAt && profileUpdatedAt !== previousProfileUpdatedAt))
    await checkQuery(`${label} cannot read other profile`, owner.client.from('profiles').select('id').eq('id', other.id), 0)
    await checkQuery(`${label} cannot update other profile`, owner.client.from('profiles').update({ display_name: 'Blocked cross-user update' }).eq('id', other.id).select('id'), 0)

    const ownPreferences = await checkQuery(`${label} reads own preferences`, owner.client.from('learner_preferences').select('user_id, updated_at').eq('user_id', owner.id), 1)
    const preferencesUpdate = await checkQuery(`${label} updates own preferences`, owner.client.from('learner_preferences').update({ preferred_locale: 'ar' }).eq('user_id', owner.id).select('user_id, updated_at'), 1)
    const previousPreferencesUpdatedAt = ownPreferences.data?.[0]?.updated_at
    const preferencesUpdatedAt = preferencesUpdate.data?.[0]?.updated_at
    record(`${label} preferences update refreshes updated_at`, 'timestamp changes', preferencesUpdatedAt !== previousPreferencesUpdatedAt ? 'changed' : 'unchanged', Boolean(preferencesUpdatedAt && previousPreferencesUpdatedAt && preferencesUpdatedAt !== previousPreferencesUpdatedAt))
    await checkQuery(`${label} cannot read other preferences`, owner.client.from('learner_preferences').select('user_id').eq('user_id', other.id), 0)
    await checkQuery(`${label} cannot update other preferences`, owner.client.from('learner_preferences').update({ preferred_locale: 'en' }).eq('user_id', other.id).select('user_id'), 0)
    await checkQuery(`${label} sees no role grants for self`, owner.client.from('user_roles').select('role').eq('user_id', owner.id), 0)

    for (const role of ['admin', 'instructor', 'organization_manager']) {
      const { error } = await owner.client.from('user_roles').insert({ user_id: owner.id, role, granted_by: owner.id })
      record(`${label} cannot grant self ${role}`, 'request rejected', error ? `rejected (${error.code ?? error.status ?? 'error'})` : 'insert accepted', Boolean(error))
    }

    const roleUpdate = await owner.client.from('user_roles')
      .update({ revoked_at: new Date().toISOString(), revoked_by: owner.id })
      .eq('user_id', owner.id)
    record(`${label} cannot modify protected role assignments`, 'request rejected', roleUpdate.error ? `rejected (${roleUpdate.error.code ?? roleUpdate.error.status ?? 'error'})` : 'update accepted', Boolean(roleUpdate.error))

    const roleDelete = await owner.client.from('user_roles').delete().eq('user_id', owner.id)
    record(`${label} cannot delete protected role assignments`, 'request rejected', roleDelete.error ? `rejected (${roleDelete.error.code ?? roleDelete.error.status ?? 'error'})` : 'delete accepted', Boolean(roleDelete.error))
  }

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/VsgAAAAASUVORK5CYII=', 'base64')
  const avatarPath = `${userA.id}/avatar`
  const ownAvatar = await userA.client.storage.from('avatars').upload(avatarPath, new Blob([png], { type: 'image/png' }), {
    contentType: 'image/png',
    upsert: false,
  })
  record('avatar owner can upload allowed PNG', 'upload succeeds', ownAvatar.error ? `rejected (${ownAvatar.error.statusCode ?? 'error'})` : 'uploaded', !ownAvatar.error)
  if (!ownAvatar.error) avatarKeys.push(avatarPath)

  const crossAvatar = await userA.client.storage.from('avatars').upload(`${userB.id}/forbidden.png`, new Blob([png], { type: 'image/png' }), {
    contentType: 'image/png',
    upsert: false,
  })
  record('avatar owner cannot write another user path', 'request rejected', crossAvatar.error ? `rejected (${crossAvatar.error.statusCode ?? 'error'})` : 'upload accepted', Boolean(crossAvatar.error))

  const invalidAvatar = await userA.client.storage.from('avatars').upload(`${userA.id}/invalid.svg`, new Blob(['<svg/>'], { type: 'image/svg+xml' }), {
    contentType: 'image/svg+xml',
    upsert: false,
  })
  record('avatar bucket rejects unsupported MIME types', 'request rejected', invalidAvatar.error ? `rejected (${invalidAvatar.error.statusCode ?? 'error'})` : 'upload accepted', Boolean(invalidAvatar.error))

  const oversizedAvatar = await userA.client.storage.from('avatars').upload(`${userA.id}/oversized.png`, new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: 'image/png' }), {
    contentType: 'image/png',
    upsert: false,
  })
  record('avatar bucket rejects files larger than 5 MB', 'request rejected', oversizedAvatar.error ? `rejected (${oversizedAvatar.error.statusCode ?? 'error'})` : 'upload accepted', Boolean(oversizedAvatar.error))

  const crossRead = await userB.client.storage.from('avatars').download(avatarPath)
  record('avatar owner cannot read another user object', 'request rejected', crossRead.error ? `rejected (${crossRead.error.statusCode ?? 'error'})` : 'download accepted', Boolean(crossRead.error))
  const anonymousAvatar = await anonymous.storage.from('avatars').download(avatarPath)
  record('anonymous users cannot read private avatar objects', 'request rejected', anonymousAvatar.error ? `rejected (${anonymousAvatar.error.statusCode ?? 'error'})` : 'download accepted', Boolean(anonymousAvatar.error))
} finally {
  if (avatarKeys.length > 0) {
    const { error } = await service.storage.from('avatars').remove(avatarKeys)
    record('cleanup temporary avatar objects', 'temporary objects deleted', error ? `failed (${error.statusCode ?? 'error'})` : 'deleted', !error)
  }
  for (const user of users.reverse()) {
    const { error } = await service.auth.admin.deleteUser(user.id)
    record(`cleanup ${user.email}`, 'temporary user deleted', error ? `failed (${error.code ?? error.status ?? 'error'})` : 'deleted', !error)
  }

  console.table(results)
  if (failures > 0) process.exitCode = 1
}
