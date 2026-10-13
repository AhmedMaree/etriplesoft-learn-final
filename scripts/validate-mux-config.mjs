import Mux from '@mux/ts'
import nextEnv from '@next/env'

nextEnv.loadEnvConfig(process.cwd(), true)

const required = [
  'MUX_ENVIRONMENT',
  'MUX_TOKEN_ID',
  'MUX_TOKEN_SECRET',
  'MUX_SIGNING_KEY',
  'MUX_PRIVATE_KEY',
  'MUX_WEBHOOK_SECRET',
  'MUX_ALLOWED_ORIGINS',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]
const missing = required.filter((name) => !process.env[name]?.trim())
if (missing.length) {
  process.stderr.write(`Mux configuration validation: FAIL (missing ${missing.join(', ')})\n`)
  process.exit(1)
}

if (!['development', 'production'].includes(process.env.MUX_ENVIRONMENT)) {
  process.stderr.write('Mux configuration validation: FAIL (MUX_ENVIRONMENT must be development or production)\n')
  process.exit(1)
}

const origins = process.env.MUX_ALLOWED_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean)
if (origins.length === 0 || origins.some((value) => {
  try {
    const origin = new URL(value)
    return origin.origin !== value || !['http:', 'https:'].includes(origin.protocol)
  } catch {
    return true
  }
})) {
  process.stderr.write('Mux configuration validation: FAIL (invalid MUX_ALLOWED_ORIGINS)\n')
  process.exit(1)
}

try {
  const mux = new Mux({ maxRetries: 0, logLevel: 'off' })
  await mux.video.assets.list({ limit: 1 })
  const issuedAt = Math.floor(Date.now() / 1000)
  const token = await mux.jwt.signPlaybackId('configuration-check', { type: 'video', expiration: '5m' })
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
  if (claims.sub !== 'configuration-check' || claims.aud !== 'v' || claims.exp - issuedAt < 295 || claims.exp - issuedAt > 305) {
    throw new Error('Unexpected signed playback claims.')
  }
  process.stdout.write(`Mux ${process.env.MUX_ENVIRONMENT} configuration validation: PASS (credentials and signing key accepted; values withheld)\n`)
} catch {
  process.stderr.write('Mux configuration validation: FAIL (API credential check or signing-key check failed; details withheld)\n')
  process.exit(1)
}
