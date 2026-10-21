import { SKILL_LEVELS, isSkillLevel, type PlacementStatus, type SkillLevel } from './types'

// Plain rules, kept free of server code so they are easy to test and tune.

export type AreaLevel = {
  area: string
  /** Current level: the measured level, raised by courses completed since. */
  level: SkillLevel
  /** Level measured by the latest level check; null when the area was never checked. */
  measured: SkillLevel | null
  /** True when completed courses have raised the level above the measured one. */
  raised: boolean
}

export type RecommendationReason = 'match' | 'nextStep' | 'challenge' | 'foundation' | 'explore'

export type Recommendation<T> = { course: T; area: string | null; reason: RecommendationReason }

type RecommendableCourse = { slug: string; category: string | null; level: string | null }

const rank = (level: SkillLevel) => SKILL_LEVELS.indexOf(level)
const higher = (a: SkillLevel, b: SkillLevel) => (rank(a) >= rank(b) ? a : b)
const stepUp = (level: SkillLevel): SkillLevel => SKILL_LEVELS[Math.min(rank(level) + 1, SKILL_LEVELS.length - 1)]

/** Levels for the learner's chosen areas (in their order), then any other measured area. */
export function currentLevels(status: PlacementStatus): AreaLevel[] {
  const measured = new Map(status.result?.areas.map((item) => [item.area, item.level]))
  // Finishing a course at a level means the learner is ready for the next one.
  const fromCourses = new Map(status.completed.map((item) => [item.area, stepUp(item.level)]))
  const areas = [...new Set([...(status.goals?.interests ?? []), ...measured.keys()])]
  return areas.map((area) => {
    const checked = measured.get(area) ?? null
    const completed = fromCourses.get(area)
    const level = completed ? higher(checked ?? 'beginner', completed) : (checked ?? 'beginner')
    return { area, level, measured: checked, raised: checked !== null && rank(level) > rank(checked) }
  })
}

// Preference by course level minus learner level: same level, one step up, one step down, then further.
const DISTANCE_ORDER = [0, 1, -1, 2, -2]

/**
 * Orders courses for the learner: chosen areas first (in the learner's order), then by how well the
 * course level fits the learner's level in that area, keeping catalog order for ties. Courses the
 * learner is already enrolled in are left out. Other areas only fill the remaining places.
 */
export function recommendCourses<T extends RecommendableCourse>(
  courses: T[],
  levels: AreaLevel[],
  interests: string[],
  excludedSlugs: ReadonlySet<string>,
  limit = 3,
): Recommendation<T>[] {
  const levelOf = new Map(levels.map((item) => [item.area, item.level]))
  return courses
    .map((course, index) => {
      const area = course.category
      const interest = area ? interests.indexOf(area) : -1
      const courseLevel: SkillLevel = isSkillLevel(course.level) ? course.level : 'beginner'
      const distance = rank(courseLevel) - rank((area && levelOf.get(area)) || 'beginner')
      const reason: RecommendationReason =
        interest < 0 ? 'explore' : distance === 0 ? 'match' : distance === 1 ? 'nextStep' : distance > 1 ? 'challenge' : 'foundation'
      return { course, area, reason, interest, fit: DISTANCE_ORDER.indexOf(distance), index }
    })
    .filter(({ course }) => !excludedSlugs.has(course.slug))
    .sort(
      (a, b) =>
        Number(a.interest < 0) - Number(b.interest < 0) ||
        a.fit - b.fit ||
        a.interest - b.interest ||
        a.index - b.index,
    )
    .slice(0, limit)
    .map(({ course, area, reason }) => ({ course, area, reason }))
}
