import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { signInAdmin } from './admin-mfa.mjs'

// Shared plumbing for the AI operator commands (transcribe-course-videos, extract-course-documents):
// environment checks, an admin Supabase session whose RPCs survive network drops, and a Gemini key pool
// that moves to the next key when one is out of daily quota or rejected.

nextEnv.loadEnvConfig(process.cwd(), true)

export const GEMINI = 'https://generativelanguage.googleapis.com'
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function requireOperatorEnv(names) {
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'UPLOAD_ADMIN_EMAIL', 'UPLOAD_ADMIN_PASSWORD', 'UPLOAD_ADMIN_TOTP_SECRET', 'GEMINI_API_KEY', ...names]
    .filter((name) => !process.env[name]?.trim())
  if (missing.length) throw new Error(`Missing local operator settings: ${missing.join(', ')}`)
  if (process.env.MUX_ENVIRONMENT !== 'development') throw new Error('Content operations are restricted to the development environment.')
}

export function parseArgs() {
  const args = process.argv.slice(2)
  const arg = (name) => args.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3)
  return { arg, apply: args.includes('--apply'), all: args.includes('--all'), courseSlug: arg('course'), limit: Number(arg('limit') ?? Infinity) }
}

// Network drops (TypeError: fetch failed) are retried with growing waits; a long run must survive them.
export const NETWORK_ATTEMPTS = 6
export const isNetworkError = (error) => error instanceof TypeError || /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket/i.test(String(error?.message ?? error))

export async function resilientFetch(url, init, label) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetch(url, init)
    } catch (error) {
      if (!isNetworkError(error) || attempt >= NETWORK_ATTEMPTS) throw error
      console.log(`  ${label}: network error, retrying in ${10 * attempt} s`)
      await sleep(10_000 * attempt)
    }
  }
}

/** Signs in as the upload admin; every write goes through audited admin RPCs that re-check the role. */
export async function createAdminSession() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: true },
  })
  await signInAdmin(supabase, { email: process.env.UPLOAD_ADMIN_EMAIL, password: process.env.UPLOAD_ADMIN_PASSWORD, totpSecret: process.env.UPLOAD_ADMIN_TOTP_SECRET })
  async function rpc(name, params) {
    for (let attempt = 1; ; attempt += 1) {
      const { data, error: rpcError } = await supabase.rpc(name, params)
      if (!rpcError) return data
      if (!isNetworkError(rpcError) || attempt >= NETWORK_ATTEMPTS) throw new Error(`${name} failed (${rpcError.code}): ${rpcError.message}`)
      console.log(`  ${name}: network error, retrying in ${10 * attempt} s`)
      await sleep(10_000 * attempt)
    }
  }
  async function courses({ all, courseSlug }) {
    if (all) return (await rpc('admin_ai_index_overview')).map((row) => ({ id: row.course_id, slug: row.slug }))
    const { data, error: courseError } = await supabase.from('courses').select('id, slug').eq('slug', courseSlug).maybeSingle()
    if (courseError || !data) throw new Error(`Published course "${courseSlug}" was not found.`)
    return [data]
  }
  return { supabase, rpc, courses }
}

/** A daily quota or a rejected key cannot recover by waiting; the caller moves to the next key. */
export class KeyExhausted extends Error {}

/** GEMINI_API_KEY, GEMINI_API_KEY_2 … _9 (same names as the app), tried in order. */
export function createGeminiPool() {
  const keys = [...new Set(['GEMINI_API_KEY', ...Array.from({ length: 8 }, (_, i) => `GEMINI_API_KEY_${i + 2}`)].map((name) => process.env[name]?.trim()).filter(Boolean))]
  const pool = {
    keys,
    index: 0,
    get key() {
      return keys[pool.index]
    },
    /** Moves to the next key; false when none is left. */
    advance() {
      if (pool.index + 1 >= keys.length) return false
      pool.index += 1
      return true
    },
    // Retries per-minute limits and transient provider errors; throws KeyExhausted for key-level failures.
    async fetch(url, init, label) {
      for (let attempt = 1; ; attempt += 1) {
        const response = await resilientFetch(url, { ...init, headers: { ...init.headers, 'x-goog-api-key': pool.key } }, label)
        if (response.ok) return response
        const body = await response.text()
        if ((response.status === 429 && body.includes('PerDay')) || response.status === 401 || response.status === 403 || body.includes('API_KEY_INVALID'))
          throw new KeyExhausted(`key ${pool.index + 1}: ${response.status}`)
        const retryable = response.status === 429 || response.status >= 500
        if (!retryable || attempt >= 6) throw new Error(`${label} failed with ${response.status}: ${body.slice(0, 200)}`)
        const wait = response.status === 429 ? 30_000 * attempt : 3_000 * attempt
        console.log(`  ${label}: ${response.status}, retrying in ${Math.round(wait / 1000)} s`)
        await sleep(wait)
      }
    },
  }
  return pool
}

export function languageOf(text) {
  const arabic = (text.match(/[؀-ۿ]/g) ?? []).length
  const latin = (text.match(/[A-Za-z]/g) ?? []).length
  return arabic > latin ? 'ar' : 'en'
}

export function modelName(...candidates) {
  const model = candidates.map((value) => value?.trim()).find(Boolean) ?? 'gemini-3.5-flash-lite'
  if (!/^[a-z0-9][a-z0-9.-]{1,63}$/.test(model)) throw new Error('Invalid Gemini model name.')
  return model
}
