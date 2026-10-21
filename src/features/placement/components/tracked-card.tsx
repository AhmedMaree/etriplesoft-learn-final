'use client'

import type { MouseEvent, ReactNode } from 'react'
import { trackRecommendationClickAction } from '../server/actions'

/** A course card whose links record a recommendation click. Navigation is never delayed or blocked. */
export function TrackedCard({ courseId, className, children }: { courseId: string; className: string; children: ReactNode }) {
  function track(event: MouseEvent<HTMLElement>) {
    if (event.target instanceof Element && event.target.closest('a')) void trackRecommendationClickAction(courseId)
  }
  return (
    <article className={className} onClickCapture={track}>
      {children}
    </article>
  )
}
