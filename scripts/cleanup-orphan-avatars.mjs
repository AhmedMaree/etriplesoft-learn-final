import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { AVATAR_BUCKET, findOrphanFolders, removeOrphanFolders } from './lib/avatar-orphans.mjs'

// Dry run by default. Deleting needs BOTH --apply and --expect=<orphan count> matching what a
// fresh scan finds, so a stale report can never delete a different set than the one reviewed.
//
//   npm run storage:orphans                       # list orphans, delete nothing
//   npm run storage:orphans -- --json             # same, machine-readable
//   npm run storage:orphans -- --apply --expect=2 # delete exactly the 2 reviewed folders

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const asJson = args.includes('--json')
const expectArg = args.find((arg) => arg.startsWith('--expect='))
const expected = expectArg ? Number(expectArg.slice('--expect='.length)) : null

// node --env-file keeps a UTF-8 BOM on the first variable name; tolerate it.
const env = (name) => process.env[name] ?? process.env[`﻿${name}`]
const url = env('NEXT_PUBLIC_SUPABASE_URL')
const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY')
const expectedRef = env('SUPABASE_DEV_PROJECT_REF')
if (!url || !serviceRoleKey) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and a process-only SUPABASE_SERVICE_ROLE_KEY. The key must never use a NEXT_PUBLIC_ variable.')
}
const projectRef = new URL(url).hostname.split('.')[0]
const linkedRef = (await readFile('supabase/.temp/project-ref', 'utf8')).trim()
if (!expectedRef || projectRef !== expectedRef || projectRef !== linkedRef) {
  throw new Error('The app URL, SUPABASE_DEV_PROJECT_REF and the Supabase CLI link must all identify the same DEV project.')
}
if (apply && (expected === null || !Number.isInteger(expected))) {
  throw new Error('--apply requires --expect=<number of orphan folders you reviewed>.')
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
const { orphans, skipped } = await findOrphanFolders(admin)

if (asJson) {
  console.log(JSON.stringify({ bucket: AVATAR_BUCKET, mode: apply ? 'apply' : 'dry-run', orphans, skipped }))
} else {
  console.log(`Bucket: ${AVATAR_BUCKET} (UUID folders with no matching auth user)`)
  console.log(`Ignored entries that are not UUID folders: ${skipped.length}`)
  console.table(orphans.map((orphan) => ({
    folder: orphan.folder,
    files: orphan.files.length,
    bytes: orphan.files.reduce((sum, file) => sum + file.size, 0),
    newest: orphan.files.map((file) => file.createdAt).filter(Boolean).sort().at(-1) ?? '',
  })))
}

if (!apply) {
  if (!asJson) console.log(orphans.length === 0 ? 'DRY RUN: no orphans found.' : `DRY RUN: nothing deleted. To delete exactly these ${orphans.length}: npm run storage:orphans -- --apply --expect=${orphans.length}`)
} else if (orphans.length !== expected) {
  console.error(`Aborted: found ${orphans.length} orphan folder(s) but --expect=${expected}. Nothing deleted.`)
  process.exitCode = 1
} else {
  const removed = await removeOrphanFolders(admin, orphans)
  console.log(`Removed ${removed} object(s) from ${orphans.length} orphan folder(s).`)
}
