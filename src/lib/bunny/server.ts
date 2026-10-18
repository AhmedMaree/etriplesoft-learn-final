import 'server-only'

import { createHash } from 'node:crypto'

const EMBED_ORIGIN = 'https://iframe.mediadelivery.net'
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function getBunnyConfig() {
  const libraryId = process.env.BUNNY_LIBRARY_ID?.trim()
  const tokenKey = process.env.BUNNY_TOKEN_KEY?.trim()
  if (!libraryId || !/^\d+$/.test(libraryId) || !tokenKey) {
    throw new Error('Missing server-only Bunny Stream configuration: BUNNY_LIBRARY_ID, BUNNY_TOKEN_KEY')
  }
  return { libraryId, tokenKey }
}

/**
 * Signs a Bunny Stream embed URL with the library's embed token authentication key.
 * Call only after the database has authorized the learner for this video.
 */
export function signBunnyEmbedUrl(videoId: string, expiresInSeconds: number): string {
  if (!GUID_PATTERN.test(videoId)) throw new Error('Invalid Bunny video ID.')
  const { libraryId, tokenKey } = getBunnyConfig()
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds
  const token = createHash('sha256').update(`${tokenKey}${videoId}${expires}`).digest('hex')
  const url = new URL(`/embed/${libraryId}/${videoId}`, EMBED_ORIGIN)
  url.search = new URLSearchParams({ token, expires: String(expires), autoplay: 'false', preload: 'true', responsive: 'true' }).toString()
  return url.toString()
}
