import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

// One-off operator command that creates the FIRST administrator (Phase 06, decision D11). The web
// app has no public path to create an admin; later grants happen through the audited admin RPCs.
//
//   npm run admin:bootstrap -- --email=person@example.com            # dry run: shows what would happen
//   npm run admin:bootstrap -- --email=person@example.com --apply    # writes the grant
//
// Refuses to run when any active administrator already exists. The grant is audited by the
// user_roles trigger. Needs a process-only SUPABASE_SERVICE_ROLE_KEY; never put it in .env.local
// under a NEXT_PUBLIC_ name or commit it.

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const emailArg = args.find((arg) => arg.startsWith('--email='))
const email = emailArg ? emailArg.slice('--email='.length).trim().toLowerCase() : ''

// node --env-file keeps a UTF-8 BOM on the first variable name; tolerate it.
const env = (name) => process.env[name] ?? process.env[`﻿${name}`]
const url = env('NEXT_PUBLIC_SUPABASE_URL')
const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY')
const expectedRef = env('SUPABASE_DEV_PROJECT_REF')

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Pass the new administrator as --email=person@example.com.')
if (!url || !serviceRoleKey) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and a process-only SUPABASE_SERVICE_ROLE_KEY. The key must never use a NEXT_PUBLIC_ variable.')
}
const projectRef = new URL(url).hostname.split('.')[0]
const linkedRef = (await readFile('supabase/.temp/project-ref', 'utf8')).trim()
if (!expectedRef || projectRef !== expectedRef || projectRef !== linkedRef) {
  throw new Error('The app URL, SUPABASE_DEV_PROJECT_REF and the Supabase CLI link must all identify the same project.')
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

const { data: existing, error: existingError } = await admin
  .from('user_roles')
  .select('id')
  .eq('role', 'admin')
  .is('revoked_at', null)
  .limit(1)
if (existingError) throw new Error(`Could not check existing administrators: ${existingError.message}`)
if (existing.length > 0) {
  console.error('Refused: an active administrator already exists. Use the admin console to grant further roles.')
  process.exit(1)
}

// Exact-email lookup (case-insensitive) through the Auth admin API.
let target = null
for (let page = 1; !target; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) throw new Error(`Could not look up the account: ${error.message}`)
  target = data.users.find((user) => user.email?.toLowerCase() === email) ?? null
  if (data.users.length < 200) break
}
if (!target) {
  console.error('Refused: no account exists with that email. The person must sign up first.')
  process.exit(1)
}
if (!target.email_confirmed_at) {
  console.error('Refused: that account has not confirmed its email address.')
  process.exit(1)
}

console.log(`Target account: ${target.id} (${email})`)
if (!apply) {
  console.log('DRY RUN: nothing written. Re-run with --apply to grant the first administrator role.')
} else {
  const { error } = await admin.from('user_roles').insert({ user_id: target.id, role: 'admin', granted_by: target.id })
  if (error) throw new Error(`Could not grant the role: ${error.message}`)
  console.log('Granted the admin role. The grant is recorded in admin_audit_log.')
}
