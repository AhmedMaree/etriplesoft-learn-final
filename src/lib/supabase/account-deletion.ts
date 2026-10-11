import type { SupabaseClient } from '@supabase/supabase-js'

// Account deletion must not strand private avatar files: auth.users rows cascade to the
// database, but Storage objects are not part of that cascade. The caller supplies a
// service-role client (server-side only; the application holds no such client today), and
// this helper removes the user's avatar objects through the Storage API first. If listing,
// removal or the post-removal check fails it throws BEFORE the user is deleted, so the
// account (and its folder) stay intact and the operation can be retried.

const AVATAR_BUCKET = 'avatars'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PAGE_SIZE = 100

export class AvatarCleanupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AvatarCleanupError'
  }
}

async function listObjectPaths(admin: SupabaseClient, folder: string): Promise<string[]> {
  const paths: string[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await admin.storage.from(AVATAR_BUCKET).list(folder, { limit: PAGE_SIZE, offset })
    if (error) throw new AvatarCleanupError(`Could not list avatar objects: ${error.message}`)
    for (const entry of data ?? []) {
      // Folder entries have no id/metadata; the avatar layout is flat, but never skip a nested folder silently.
      if (entry.id === null) paths.push(...(await listObjectPaths(admin, `${folder}/${entry.name}`)))
      else paths.push(`${folder}/${entry.name}`)
    }
    if (!data || data.length < PAGE_SIZE) return paths
  }
}

export async function deleteAccountWithAvatar(admin: SupabaseClient, userId: string): Promise<{ removedObjects: number }> {
  if (!UUID_PATTERN.test(userId)) throw new AvatarCleanupError('Refusing to delete: user id is not a UUID.')

  const paths = await listObjectPaths(admin, userId)
  if (paths.length > 0) {
    const { data, error } = await admin.storage.from(AVATAR_BUCKET).remove(paths)
    if (error) throw new AvatarCleanupError(`Could not remove avatar objects: ${error.message}`)
    if ((data?.length ?? 0) !== paths.length) throw new AvatarCleanupError('Avatar removal was incomplete; account not deleted.')
    const leftover = await listObjectPaths(admin, userId)
    if (leftover.length > 0) throw new AvatarCleanupError('Avatar objects still present after removal; account not deleted.')
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(`Could not delete user: ${error.message}`)
  return { removedObjects: paths.length }
}
