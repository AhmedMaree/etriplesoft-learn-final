// Orphaned avatar detection for the `avatars` bucket only. A folder is an orphan when its
// name is a UUID and no auth.users row has that id. Anything else is never touched.

export const AVATAR_BUCKET = 'avatars'
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PAGE_SIZE = 100

async function listPage(admin, folder, offset) {
  const { data, error } = await admin.storage.from(AVATAR_BUCKET).list(folder, { limit: PAGE_SIZE, offset })
  if (error) throw new Error(`Could not list ${AVATAR_BUCKET}/${folder}: ${error.message}`)
  return data ?? []
}

async function listAll(admin, folder) {
  const all = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await listPage(admin, folder, offset)
    all.push(...page)
    if (page.length < PAGE_SIZE) return all
  }
}

export async function listAuthUserIds(admin) {
  const ids = new Set()
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`Could not list auth users: ${error.message}`)
    for (const user of data.users) ids.add(user.id)
    if (data.users.length < 200) return ids
  }
}

export async function findOrphanFolders(admin) {
  const userIds = await listAuthUserIds(admin)
  const orphans = []
  const skipped = []
  for (const entry of await listAll(admin, '')) {
    if (entry.id !== null) { skipped.push(entry.name); continue } // a loose file at the bucket root, not a folder
    if (!UUID_PATTERN.test(entry.name)) { skipped.push(entry.name); continue }
    const userId = entry.name.toLowerCase()
    if (userIds.has(userId)) continue
    const files = (await listAll(admin, entry.name)).filter((file) => file.id !== null)
    orphans.push({
      folder: entry.name,
      files: files.map((file) => ({ name: file.name, size: file.metadata?.size ?? 0, createdAt: file.created_at ?? null })),
    })
  }
  return { orphans, skipped }
}

// Removes only the listed orphan folders, re-checking right before deleting that the user still
// does not exist, and verifying the folder is empty afterwards.
export async function removeOrphanFolders(admin, orphans) {
  let removed = 0
  for (const orphan of orphans) {
    if (!UUID_PATTERN.test(orphan.folder)) throw new Error(`Refusing non-UUID folder: ${orphan.folder}`)
    const lookup = await admin.auth.admin.getUserById(orphan.folder)
    if (lookup.data?.user) throw new Error(`Folder ${orphan.folder} now has a user; aborting.`)
    const paths = orphan.files.map((file) => `${orphan.folder}/${file.name}`)
    if (paths.length === 0) continue
    const { data, error } = await admin.storage.from(AVATAR_BUCKET).remove(paths)
    if (error) throw new Error(`Could not remove ${orphan.folder}: ${error.message}`)
    if ((data?.length ?? 0) !== paths.length) throw new Error(`Removal of ${orphan.folder} was incomplete.`)
    removed += paths.length
  }
  return removed
}
