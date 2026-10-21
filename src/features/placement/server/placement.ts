import 'server-only'
import { cache } from 'react'
import type { Locale } from '@/i18n/config'
import { createClient } from '@/lib/supabase/server'
import { parsePlacementQuiz, parsePlacementStatus, type PlacementQuiz, type PlacementStatus } from '../types'

// Every call runs with the caller's own session; the database scores answers and decides what they may see.

// Memoized per request: the overview page and its content both need it.
export const getPlacementStatus = cache(async (): Promise<PlacementStatus | null> => {
  const { data, error } = await (await createClient()).rpc('learner_placement_status')
  return error ? null : parsePlacementStatus(data)
})

/** The current skill check in exact locale, or null when none is published in that language. */
export async function getPlacementQuiz(locale: Locale): Promise<PlacementQuiz | null> {
  const { data, error } = await (await createClient()).rpc('learner_placement_questions', { p_locale: locale })
  if (error) throw new Error('Level check unavailable.')
  return data === null ? null : parsePlacementQuiz(data)
}

/** Measurement only: a failure must never break the overview. */
export async function recordRecommendationsShown(courseIds: string[]): Promise<void> {
  if (courseIds.length === 0) return
  await (await createClient())
    .rpc('learner_record_recommendation_events', { p_event: 'shown', p_course_ids: courseIds })
    .then(() => undefined, () => undefined)
}
