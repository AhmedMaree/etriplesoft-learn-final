import type { SupabaseClient } from '@supabase/supabase-js'

export const AVATAR_BUCKET: 'avatars'
export const UUID_PATTERN: RegExp
export type OrphanFolder = {
  folder: string
  files: { name: string; size: number; createdAt: string | null }[]
}
export function listAuthUserIds(admin: SupabaseClient): Promise<Set<string>>
export function findOrphanFolders(admin: SupabaseClient): Promise<{ orphans: OrphanFolder[]; skipped: string[] }>
export function removeOrphanFolders(admin: SupabaseClient, orphans: OrphanFolder[]): Promise<number>
