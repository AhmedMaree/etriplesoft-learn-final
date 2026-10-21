'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { Link, useRouter } from '@/i18n/navigation'
import {
  EXPERIENCE_LEVELS,
  PLACEMENT_ROLES,
  ROLE_AREAS,
  type Experience,
  type PlacementError,
  type PlacementGoals,
  type PlacementQuiz,
  type PlacementRole,
  type PlacementStatus,
} from '../types'
import { skipPlacementAction, submitPlacementAction, updatePlacementGoalsAction } from '../server/actions'

export type AreaOption = { key: string; title: string; description: string | null }

type Step = 'goals' | 'quiz' | 'result'

const NOT_SURE = ''

export function PlacementFlow({
  mode,
  areas,
  quiz,
  initialGoals,
}: {
  /** 'goals' changes goals only and keeps the measured levels. */
  mode: 'full' | 'goals'
  areas: AreaOption[]
  quiz: PlacementQuiz | null
  initialGoals: PlacementGoals | null
}) {
  const t = useTranslations('placement')
  const levels = useTranslations('courses')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>('goals')
  const [role, setRole] = useState<PlacementRole | null>(initialGoals?.role ?? null)
  const [interests, setInterests] = useState<string[]>(initialGoals?.interests.filter((area) => areas.some((a) => a.key === area)) ?? [])
  const [interestsTouched, setInterestsTouched] = useState(Boolean(initialGoals))
  const [experience, setExperience] = useState<Experience | null>(initialGoals?.experience ?? null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PlacementStatus['result']>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  // Move focus to the new step's heading so keyboard and screen-reader users start at the top.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    heading.current?.focus()
  }, [step])

  const skipsQuiz = experience === 'none' || !quiz
  const totalSteps = mode === 'goals' || skipsQuiz ? 1 : 2
  const questions = quiz?.questions.filter((question) => interests.includes(question.area)) ?? []
  const areaTitle = (key: string) => areas.find((area) => area.key === key)?.title ?? key

  function chooseRole(next: PlacementRole) {
    setRole(next)
    if (!interestsTouched) setInterests(ROLE_AREAS[next].filter((area) => areas.some((a) => a.key === area)))
  }

  function toggleArea(key: string) {
    setInterestsTouched(true)
    setInterests((current) => (current.includes(key) ? current.filter((area) => area !== key) : [...current, key]))
  }

  function showError(code: PlacementError) {
    setError(t(`errors.${code}`))
  }

  function goals(): PlacementGoals | null {
    if (!role || !experience || interests.length === 0) {
      setError(t('errors.goalsIncomplete'))
      return null
    }
    return { role, interests, experience }
  }

  function submitGoals(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const chosen = goals()
    if (!chosen) return
    setError(null)
    if (mode === 'goals') {
      startTransition(async () => {
        const saved = await updatePlacementGoalsAction(chosen)
        if ('error' in saved) return showError(saved.error)
        router.push('/overview')
        router.refresh()
      })
    } else if (chosen.experience === 'none') {
      startTransition(async () => {
        const saved = await submitPlacementAction({ goals: chosen, versionId: null, answers: null })
        if ('error' in saved) return showError(saved.error)
        setResult(saved.status.result)
        setStep('result')
      })
    } else if (!quiz) {
      // No skill check in this language: keep the goals so suggestions still work, and leave the check for later.
      startTransition(async () => {
        const saved = await updatePlacementGoalsAction(chosen)
        if ('error' in saved) return showError(saved.error)
        const skipped = await skipPlacementAction()
        if (skipped?.error) showError(skipped.error)
      })
    } else {
      setStep('quiz')
    }
  }

  function submitQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const chosen = goals()
    if (!chosen || !quiz) return
    if (questions.some((question) => answers[question.id] === undefined)) {
      setError(t('errors.unanswered'))
      return
    }
    setError(null)
    const payload = Object.fromEntries(questions.map((question) => [question.id, answers[question.id] || null]))
    startTransition(async () => {
      const saved = await submitPlacementAction({ goals: chosen, versionId: quiz.versionId, answers: payload })
      if ('error' in saved) return showError(saved.error)
      setResult(saved.status.result)
      setStep('result')
    })
  }

  function skip() {
    setError(null)
    startTransition(async () => {
      const skipped = await skipPlacementAction()
      if (skipped?.error) showError(skipped.error)
    })
  }

  const skipButton = mode === 'full' && (
    <button type="button" className="text-button pl-skip" onClick={skip} disabled={pending}>
      {t('skip')}
    </button>
  )
  const errorBox = error && (
    <p className="pl-error" role="alert">
      {error}
    </p>
  )

  if (step === 'result' && result) {
    return (
      <section className="ov-section pl-panel" aria-labelledby="pl-heading">
        <span className="ov-dots" aria-hidden="true" />
        <h2 id="pl-heading" ref={heading} tabIndex={-1}>
          {t('resultHeading')}
        </h2>
        <p className="pl-intro">{t('resultCopy')}</p>
        <ul className="pl-results">
          {result.areas.map((area) => (
            <li key={area.area}>
              <strong dir="auto">{areaTitle(area.area)}</strong>
              <span className="pl-level">{levels(area.level)}</span>
              <small>{result.method === 'quiz' ? t('resultScore', { correct: String(area.correct), total: String(area.total) }) : t('resultSelf')}</small>
            </li>
          ))}
        </ul>
        <div className="pl-actions">
          <Link className="btn" href="/overview">
            {t('goOverview')} <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />
          </Link>
        </div>
      </section>
    )
  }

  if (step === 'quiz' && quiz) {
    return (
      <section className="ov-section pl-panel" aria-labelledby="pl-heading">
        <span className="ov-dots" aria-hidden="true" />
        <p className="pl-step">{t('stepLabel', { current: '2', total: String(totalSteps) })}</p>
        <h2 id="pl-heading" ref={heading} tabIndex={-1}>
          {t('quizHeading')}
        </h2>
        <p className="pl-intro">{t('quizIntro', { count: String(questions.length) })}</p>
        <form className="pl-form" onSubmit={submitQuiz} noValidate>
          {interests.map((area) => {
            const areaQuestions = questions.filter((question) => question.area === area)
            if (areaQuestions.length === 0) return null
            return (
              <div className="pl-area" key={area}>
                <h3 dir="auto">{areaTitle(area)}</h3>
                {areaQuestions.map((question, index) => (
                  <fieldset className="pl-question" key={question.id}>
                    <legend>
                      <span className="pl-number">{t('questionLabel', { n: String(index + 1) })}</span>
                      <span dir="auto">{question.prompt}</span>
                    </legend>
                    <div className="pl-choices">
                      {[...question.options, { id: NOT_SURE, label: t('notSure') }].map((option) => (
                        <label className={`pl-choice${answers[question.id] === option.id ? ' chosen' : ''}${option.id === NOT_SURE ? ' muted' : ''}`} key={option.id || 'not-sure'}>
                          <input
                            type="radio"
                            name={question.id}
                            value={option.id}
                            checked={answers[question.id] === option.id}
                            onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                          />
                          <span dir="auto">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            )
          })}
          {errorBox}
          <div className="pl-actions">
            <button type="button" className="btn outline" onClick={() => setStep('goals')} disabled={pending}>
              {t('back')}
            </button>
            <span className="pl-actions-end">
              {skipButton}
              <button type="submit" className="btn" disabled={pending}>
                {pending ? t('saving') : t('seeResults')}
              </button>
            </span>
          </div>
        </form>
      </section>
    )
  }

  return (
    <section className="ov-section pl-panel" aria-labelledby="pl-heading">
      <span className="ov-dots" aria-hidden="true" />
      {mode === 'full' && <p className="pl-step">{t('stepLabel', { current: '1', total: String(totalSteps) })}</p>}
      <h2 id="pl-heading" ref={heading} tabIndex={-1}>
        {mode === 'goals' ? t('goalsModeHeading') : t('goalsHeading')}
      </h2>
      <p className="pl-intro">{mode === 'goals' ? t('goalsModeCopy') : t('goalsCopy')}</p>
      <form className="pl-form" onSubmit={submitGoals} noValidate>
        <fieldset className="pl-question">
          <legend>{t('roleLegend')}</legend>
          <div className="pl-choices">
            {PLACEMENT_ROLES.map((value) => (
              <label className={`pl-choice${role === value ? ' chosen' : ''}`} key={value}>
                <input type="radio" name="role" value={value} checked={role === value} onChange={() => chooseRole(value)} />
                <span>{t(`roles.${value}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="pl-question">
          <legend>
            {t('areasLegend')} <small className="pl-hint">{t('areasHint')}</small>
          </legend>
          <div className="pl-choices pl-choices--cards">
            {areas.map((area) => (
              <label className={`pl-choice pl-card${interests.includes(area.key) ? ' chosen' : ''}`} key={area.key}>
                <input type="checkbox" name="areas" value={area.key} checked={interests.includes(area.key)} onChange={() => toggleArea(area.key)} />
                <span>
                  <strong dir="auto">{area.title}</strong>
                  {area.description && <small dir="auto">{area.description}</small>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="pl-question">
          <legend>{t('experienceLegend')}</legend>
          <div className="pl-choices pl-choices--inline">
            {EXPERIENCE_LEVELS.map((value) => (
              <label className={`pl-choice${experience === value ? ' chosen' : ''}`} key={value}>
                <input type="radio" name="experience" value={value} checked={experience === value} onChange={() => setExperience(value)} />
                <span>{t(`experience.${value}`)}</span>
              </label>
            ))}
          </div>
          {mode === 'full' && experience === 'none' && <p className="pl-note">{t('noQuizNote')}</p>}
          {mode === 'full' && experience && experience !== 'none' && !quiz && <p className="pl-note">{t('quizUnavailable')}</p>}
        </fieldset>
        {errorBox}
        <div className="pl-actions">
          {mode === 'goals' ? (
            <Link className="btn outline" href="/settings?tab=learning">
              {t('cancel')}
            </Link>
          ) : (
            skipButton
          )}
          <button type="submit" className="btn" disabled={pending}>
            {pending ? t('saving') : mode === 'goals' ? t('saveGoals') : experience === 'none' ? t('seeResults') : t('continue')}
            {!pending && <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />}
          </button>
        </div>
      </form>
    </section>
  )
}
