import 'server-only'

import Mux from '@mux/ts'

let muxClient: Mux | undefined

export function getMuxClient(): Mux {
  getMuxEnvironment()
  const required = ['MUX_TOKEN_ID', 'MUX_TOKEN_SECRET', 'MUX_SIGNING_KEY', 'MUX_PRIVATE_KEY', 'MUX_WEBHOOK_SECRET'] as const
  const missing = required.filter((key) => !process.env[key]?.trim())
  if (missing.length) {
    throw new Error(`Missing server-only Mux configuration: ${missing.join(', ')}`)
  }

  muxClient ??= new Mux({
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET,
    jwtSigningKey: process.env.MUX_SIGNING_KEY,
    jwtPrivateKey: process.env.MUX_PRIVATE_KEY,
    webhookSecret: process.env.MUX_WEBHOOK_SECRET,
    logLevel: 'off',
    maxRetries: 1,
  })
  return muxClient
}

export function getMuxEnvironment(): 'development' | 'production' {
  const value = process.env.MUX_ENVIRONMENT
  if (value !== 'development' && value !== 'production') {
    throw new Error('MUX_ENVIRONMENT must be development or production.')
  }
  return value
}

export function getMuxAllowedOrigins(): string[] {
  const value = process.env.MUX_ALLOWED_ORIGINS
  if (!value?.trim()) throw new Error('Missing MUX_ALLOWED_ORIGINS configuration.')
  const origins = value.split(',').map((origin) => origin.trim()).filter(Boolean)
  if (origins.some((origin) => {
    try {
      const parsed = new URL(origin)
      return parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol)
    } catch {
      return true
    }
  })) throw new Error('MUX_ALLOWED_ORIGINS must contain exact HTTP(S) origins.')
  return origins
}
