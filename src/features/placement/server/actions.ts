'use server'

import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { isLocale } from '@/i18n/config'
import { createClient } from '@/lib/supabase/server'
import {
  isExperience,
  isPlacementRole,
  parsePlacementStatus,
  type PlacementError,
  type PlacementGoals,
  type PlacementStatus,
} from '../types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const AREA_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

type Result = { status: PlacementStatus } | { error: PlacementError }

function errorOf(code: string | undefined): PlacementError {
  switch (code) {
    case '22023':
      return 'invalid'
    case '40001':
    case 'P0002':
      return 'changed'
    case '54000':
      return 'limit'
    default:
      return 'failed'
  }
}

// Shape checks only; the database validates areas, questions and options and does all scoring.
function parseGoals(input: unknown): PlacementGoals | null {
  if (typeof input !== 'object' || input === null) return null
  const { role, interests, experience } = input as Record<string, unknown>
  if (!isPlacementRole(role) || !isExperience(experience) || !Array.isArray(interests)) return null
  if (interests.length < 1 || interests.length > 10) return null
  if (!interests.every((area): area is string => typeof area === 'string' && AREA_PATTERN.test(area))) return null
  return { role, interests, experience }
}

function parseAnswers(input: unknown): Record<string, string | null> | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const entries = Object.entries(input as Record<string, unknown>)
  if (entries.length > 100) return null
  for (const [question, option] of entries) {
    if (!UUID_PATTERN.test(question)) return null
    if (option !== null && (typeof option !== 'string' || !UUID_PATTERN.test(option))) return null
  }
  return Object.fromEntries(entries) as Record<string, string | null>
}

function toResult(data: unknown, error: { code?: string } | null): Result {
  if (error) return { error: errorOf(error.code) }
  const status = parsePlacementStatus(data)
  return status ? { status } : { error: 'failed' }
}

export async function submitPlacementAction(input: { goals: unknown; versionId: unknown; answers: unknown }): Promise<Result> {
  const goals = parseGoals(input?.goals)
  if (!goals) return { error: 'invalid' }
  const supabase = await createClient()
  if (goals.experience === 'none') {
    const { data, error } = await supabase.rpc('learner_placement_submit', {
      p_role: goals.role,
      p_interests: goals.interests,
      p_experience: goals.experience,
    })
    return toResult(data, error)
  }
  const answers = parseAnswers(input?.answers)
  if (typeof input?.versionId !== 'string' || !UUID_PATTERN.test(input.versionId) || !answers) return { error: 'invalid' }
  const { data, error } = await supabase.rpc('learner_placement_submit', {
    p_role: goals.role,
    p_interests: goals.interests,
    p_experience: goals.experience,
    p_version_id: input.versionId,
    p_answers: answers,
  })
  return toResult(data, error)
}

export async function updatePlacementGoalsAction(input: unknown): Promise<Result> {
  const goals = parseGoals(input)
  if (!goals) return { error: 'invalid' }
  const { data, error } = await (await createClient()).rpc('learner_placement_update_goals', {
    p_role: goals.role,
    p_interests: goals.interests,
    p_experience: goals.experience,
  })
  return toResult(data, error)
}

export async function skipPlacementAction(): Promise<{ error: PlacementError } | void> {
  const locale = await getLocale()
  if (!isLocale(locale)) return { error: 'invalid' }
  const { error } = await (await createClient()).rpc('learner_placement_skip')
  if (error) return { error: errorOf(error.code) }
  redirect(`/${locale}/overview`)
}

/** Measurement only; failures are ignored. */
export async function trackRecommendationClickAction(courseId: unknown): Promise<void> {
  if (typeof courseId !== 'string' || !UUID_PATTERN.test(courseId)) return
  await (await createClient())
    .rpc('learner_record_recommendation_events', { p_event: 'clicked', p_course_ids: [courseId] })
    .then(() => undefined, () => undefined)
}
