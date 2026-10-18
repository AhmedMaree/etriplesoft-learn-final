import { readFile } from 'node:fs/promises'

// One-off operator command that asks Bunny Stream to pull videos straight from Google Drive links,
// so nothing is downloaded locally. Each video lands in a Bunny collection named after its course.
//
//   node --env-file=.env.local scripts/fetch-drive-videos-to-bunny.mjs --list=videos.json            # dry run
//   ... --apply      # create missing collections and submit the fetches
//   ... --status     # show encoding status of the listed videos
//
// videos.json: [{ "course": "Odoo Development", "title": "L07 - Inventory basics", "url": "<Drive link>" }]
// Drive files must be shared "Anyone with the link" until encoding finishes. A video whose title already
// exists in its course collection is skipped, so reruns do not duplicate. Needs BUNNY_LIBRARY_ID / BUNNY_API_KEY.

const args = process.argv.slice(2)
const arg = (name) => args.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3)
const apply = args.includes('--apply')
const status = args.includes('--status')
const listPath = arg('list')
if (!listPath) throw new Error('Pass --list=<videos.json>.')

const env = (name) => process.env[name] ?? process.env[`﻿${name}`]
const libraryId = env('BUNNY_LIBRARY_ID')
const apiKey = env('BUNNY_API_KEY')
if (!libraryId || !apiKey) throw new Error('Set BUNNY_LIBRARY_ID and BUNNY_API_KEY in .env.local.')

const STATUS = ['created', 'uploaded', 'processing', 'transcoding', 'finished', 'error', 'upload failed']

/** Accepts a Drive share/open link or a bare file ID and returns a direct download URL. */
function directDriveUrl(link) {
  const id = link.match(/\/d\/([\w-]{20,})/)?.[1]
    ?? link.match(/[?&]id=([\w-]{20,})/)?.[1]
    ?? (/^[\w-]{20,}$/.test(link) ? link : null)
  if (!id) throw new Error(`Not a Google Drive file link: ${link}`)
  return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`
}

async function bunny(method, route, body) {
  const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}${route}`, {
    method,
    headers: { AccessKey: apiKey, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(`Bunny ${method} ${route} failed: ${response.status} ${await response.text()}`)
  return response.status === 204 ? null : response.json()
}

async function listAll(route) {
  const items = []
  for (let page = 1; ; page += 1) {
    const separator = route.includes('?') ? '&' : '?'
    const data = await bunny('GET', `${route}${separator}page=${page}&itemsPerPage=100`)
    items.push(...data.items)
    if (items.length >= data.totalItems || data.items.length === 0) return items
  }
}

const videos = JSON.parse(await readFile(listPath, 'utf8'))
for (const video of videos) {
  if (!video.course?.trim() || !video.title?.trim() || !video.url) throw new Error(`Each entry needs course, title and url: ${JSON.stringify(video)}`)
  video.directUrl = directDriveUrl(video.url.trim())
}

// Read-only calls first: they also prove the key and library ID are right.
const collections = new Map((await listAll('/collections')).map((item) => [item.name, item.guid]))
const existingByCollection = new Map()
async function existingTitles(collectionId) {
  if (!existingByCollection.has(collectionId)) {
    const items = await listAll(`/videos?collection=${collectionId}`)
    existingByCollection.set(collectionId, new Map(items.map((item) => [item.title, item])))
  }
  return existingByCollection.get(collectionId)
}

const courses = [...new Set(videos.map((video) => video.course.trim()))]
for (const course of courses) {
  const courseVideos = videos.filter((video) => video.course.trim() === course)
  let collectionId = collections.get(course)
  console.log(`\n${course}${collectionId ? '' : ' (new collection)'}`)
  if (!collectionId && apply) {
    collectionId = (await bunny('POST', '/collections', { name: course })).guid
    collections.set(course, collectionId)
  }
  const existing = collectionId ? await existingTitles(collectionId) : new Map()

  for (const video of courseVideos) {
    const title = video.title.trim()
    const found = existing.get(title)
    if (status || found) {
      console.log(`  ${title}: ${found ? `${STATUS[found.status] ?? found.status} (${found.guid})` : 'not in Bunny'}`)
      continue
    }
    if (!apply) {
      console.log(`  ${title}: would fetch`)
      continue
    }
    await bunny('POST', `/videos/fetch?collectionId=${collectionId}`, { url: video.directUrl, title })
    console.log(`  ${title}: fetch submitted`)
  }
}

if (!apply && !status) console.log('\nDry run only. Re-run with --apply to create collections and start the fetches.')
if (apply) console.log('\nBunny now downloads and encodes in the background. Check progress with --status.')
