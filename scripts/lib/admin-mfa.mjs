import { createHmac } from 'node:crypto'

// Admin authority needs an MFA-verified (aal2) session, so scripts and tests that act as an admin
// complete a TOTP challenge after the password sign-in. RFC 6238: SHA-1, 30-second steps, 6 digits.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32(secret) {
  let bits = ''
  for (const char of secret.replace(/[\s=]/g, '').toUpperCase()) {
    const value = ALPHABET.indexOf(char)
    if (value < 0) throw new Error('The TOTP secret is not valid base32.')
    bits += value.toString(2).padStart(5, '0')
  }
  const bytes = []
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2))
  return Buffer.from(bytes)
}

export function totpCode(secret, now = Date.now()) {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30000)))
  const digest = createHmac('sha1', base32(secret)).update(counter).digest()
  const offset = digest[digest.length - 1] & 0x0f
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0')
}

// A code is accepted once; a second verification in the same 30-second step waits for the next one.
async function verifyWithRetry(client, factorId, secret) {
  let { error } = await client.auth.mfa.challengeAndVerify({ factorId, code: totpCode(secret) })
  if (error) {
    await new Promise((resolve) => setTimeout(resolve, 30000 - (Date.now() % 30000) + 500))
    ;({ error } = await client.auth.mfa.challengeAndVerify({ factorId, code: totpCode(secret) }))
  }
  if (error) throw new Error(`MFA verification failed: ${error.message}`)
}

// Enrolls a TOTP factor for the signed-in user and upgrades the session to aal2. Returns the secret.
export async function enrollAdminTotp(client) {
  const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ETripleSoft Learn admin' })
  if (error || !data) throw new Error(`MFA enrollment failed: ${error?.message}`)
  await verifyWithRetry(client, data.id, data.totp.secret)
  return data.totp.secret
}

// Upgrades a password session to aal2 with the user's verified TOTP factor.
export async function verifyAdminTotp(client, secret) {
  if (!secret) throw new Error('An admin TOTP secret is required: admin RPCs need an MFA-verified session.')
  const { data, error } = await client.auth.mfa.listFactors()
  if (error) throw new Error(`Listing MFA factors failed: ${error.message}`)
  const factor = data.totp.find((item) => item.status === 'verified')
  if (!factor) throw new Error('This admin account has no verified TOTP factor. Set it up in the admin area first.')
  await verifyWithRetry(client, factor.id, secret)
}

// Password sign-in plus the TOTP step, for operator scripts acting as UPLOAD_ADMIN_EMAIL.
export async function signInAdmin(client, { email, password, totpSecret }) {
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Admin sign-in failed: ${error.message}`)
  await verifyAdminTotp(client, totpSecret)
}
