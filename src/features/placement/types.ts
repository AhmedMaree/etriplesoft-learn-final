export const PLACEMENT_ROLES = ['business_user', 'functional_consultant', 'developer', 'system_admin', 'exploring'] as const
export const EXPERIENCE_LEVELS = ['none', 'some', 'regular', 'expert'] as const
export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const

export type PlacementRole = (typeof PLACEMENT_ROLES)[number]
export type Experience = (typeof EXPERIENCE_LEVELS)[number]
export type SkillLevel = (typeof SKILL_LEVELS)[number]

export type PlacementGoals = { role: PlacementRole; interests: string[]; experience: Experience }
export type AreaResult = { area: string; correct: number; total: number; level: SkillLevel }

export type PlacementStatus = {
  learnerType: string | null
  skipped: boolean
  /** Has an active or completed enrollment. */
  enrolled: boolean
  /** Areas the learner may choose: categories of published courses. */
  areas: string[]
  goals: PlacementGoals | null
  result: { id: string; method: 'quiz' | 'self_reported'; createdAt: string; areas: AreaResult[] } | null
  /** Highest level of a completed course per area. */
  completed: { area: string; level: SkillLevel }[]
}

export type PlacementQuestion = { id: string; area: string; prompt: string; options: { id: string; label: string }[] }
export type PlacementQuiz = { versionId: string; questions: PlacementQuestion[] }

export type PlacementError = 'invalid' | 'changed' | 'limit' | 'failed'

/** Areas pre-selected when a learner picks a role; they can change them. */
export const ROLE_AREAS: Record<PlacementRole, string[]> = {
  business_user: ['functional'],
  functional_consultant: ['functional'],
  developer: ['technical'],
  system_admin: ['technical'],
  exploring: ['functional', 'technical'],
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isString = (value: unknown): value is string => typeof value === 'string'
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString)
const oneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value)

export const isPlacementRole = (value: unknown): value is PlacementRole => oneOf(PLACEMENT_ROLES, value)
export const isExperience = (value: unknown): value is Experience => oneOf(EXPERIENCE_LEVELS, value)
export const isSkillLevel = (value: unknown): value is SkillLevel => oneOf(SKILL_LEVELS, value)

export function parsePlacementStatus(value: unknown): PlacementStatus | null {
  if (!isRecord(value) || !isStringArray(value.areas) || !Array.isArray(value.completed)) return null
  let goals: PlacementGoals | null = null
  if (isRecord(value.goals)) {
    const { role, interests, experience } = value.goals
    if (!isPlacementRole(role) || !isStringArray(interests) || !isExperience(experience)) return null
    goals = { role, interests, experience }
  }
  let result: PlacementStatus['result'] = null
  if (isRecord(value.result)) {
    const { id, method, createdAt, areas } = value.result
    if (!isString(id) || (method !== 'quiz' && method !== 'self_reported') || !isString(createdAt) || !Array.isArray(areas)) return null
    const parsed = areas.flatMap((item): AreaResult[] =>
      isRecord(item) && isString(item.area) && typeof item.correct === 'number' && typeof item.total === 'number' && isSkillLevel(item.level)
        ? [{ area: item.area, correct: item.correct, total: item.total, level: item.level }]
        : [],
    )
    result = { id, method, createdAt, areas: parsed }
  }
  return {
    learnerType: isString(value.learnerType) ? value.learnerType : null,
    skipped: value.skipped === true,
    enrolled: value.enrolled === true,
    areas: value.areas,
    goals,
    result,
    completed: value.completed.flatMap((item) =>
      isRecord(item) && isString(item.area) && isSkillLevel(item.level) ? [{ area: item.area, level: item.level }] : [],
    ),
  }
}

export function parsePlacementQuiz(value: unknown): PlacementQuiz | null {
  if (!isRecord(value) || !isString(value.versionId) || !Array.isArray(value.questions)) return null
  const questions = value.questions.flatMap((item): PlacementQuestion[] => {
    if (!isRecord(item) || !isString(item.id) || !isString(item.area) || !isString(item.prompt) || !Array.isArray(item.options)) return []
    const options = item.options.flatMap((option) =>
      isRecord(option) && isString(option.id) && isString(option.label) ? [{ id: option.id, label: option.label }] : [],
    )
    return options.length > 0 ? [{ id: item.id, area: item.area, prompt: item.prompt, options }] : []
  })
  return { versionId: value.versionId, questions }
}

/** Learners who have not started a course are sent to the level check from the overview. Learners
 * already enrolled, and company-invited learners (whose courses may be assigned), get the overview
 * prompt instead. */
export function needsPlacement(status: PlacementStatus): boolean {
  return !status.result && !status.skipped && !status.enrolled && status.learnerType !== 'company_invited'
}
