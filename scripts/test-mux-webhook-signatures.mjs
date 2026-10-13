import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import Mux from '@mux/ts'

const secret = 'phase-11-webhook-signature-test-secret'
const mux = new Mux({ webhookSecret: secret, maxRetries: 0 })
const event = JSON.stringify({
  id: 'evt_phase11_signature_test',
  type: 'video.asset.ready',
  created_at: new Date().toISOString(),
  object: { type: 'video.asset', id: 'asset_phase11_test' },
  data: { id: 'asset_phase11_test', playback_ids: [{ id: 'signed-playback-test', policy: 'signed' }] },
})

function headersFor(body, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return new Headers({ 'mux-signature': `t=${timestamp},v1=${signature}` })
}

test('accepts a valid Mux signature over the exact raw body', async () => {
  const parsed = await mux.webhooks.unwrap(event, headersFor(event))
  assert.equal(parsed.id, 'evt_phase11_signature_test')
})

test('rejects a forged webhook signature', async () => {
  await assert.rejects(mux.webhooks.unwrap(event, new Headers({ 'mux-signature': 't=1,v1=00' })))
})

test('rejects a body modified after the signature was created', async () => {
  const signed = headersFor(event)
  await assert.rejects(mux.webhooks.unwrap(`${event} `, signed))
})

test('rejects an expired webhook timestamp', async () => {
  const stale = Math.floor(Date.now() / 1000) - 600
  await assert.rejects(mux.webhooks.unwrap(event, headersFor(event, stale)))
})
