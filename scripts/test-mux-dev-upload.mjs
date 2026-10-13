import nextEnv from '@next/env'
import Mux from '@mux/ts'

nextEnv.loadEnvConfig(process.cwd(), true)

if (process.env.MUX_ENVIRONMENT !== 'development') {
  process.stderr.write('Mux Development upload test: FAIL (environment is not Development)\n')
  process.exit(1)
}

const origin = process.env.MUX_ALLOWED_ORIGINS?.split(',').map((value) => value.trim()).find(Boolean)
if (!origin) {
  process.stderr.write('Mux Development upload test: FAIL (allowed origin is missing)\n')
  process.exit(1)
}

const mux = new Mux({ maxRetries: 0, logLevel: 'off' })
let uploadId

try {
  const upload = await mux.video.uploads.create({
    cors_origin: origin,
    timeout: 60,
    test: true,
    new_asset_settings: {
      playback_policies: ['signed'],
      video_quality: 'basic',
      passthrough: 'phase11-development-configuration-check',
    },
  })
  uploadId = upload.id
  if (!uploadId || !upload.url || upload.status !== 'waiting'
    || upload.new_asset_settings?.playback_policies?.[0] !== 'signed') {
    throw new Error('Mux did not create the expected signed test upload.')
  }

  const cancelled = await mux.video.uploads.cancel(uploadId)
  if (cancelled.status !== 'cancelled') throw new Error('Mux did not cancel the test upload.')
  process.stdout.write('Mux Development signed test upload creation and cancellation: PASS (provider identifiers/URL withheld)\n')
} catch {
  process.stderr.write('Mux Development signed test upload creation/cancellation: FAIL (details withheld)\n')
  process.exitCode = 1
}
