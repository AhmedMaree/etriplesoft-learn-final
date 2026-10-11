'use client'

import { useEffect, useState } from 'react'

// Counts down from `seconds` each time `trigger` changes to a new non-null value (a fresh
// action-state object per rate-limited response). Returns the whole seconds left; 0 = ready.
export function useCooldown(trigger: unknown, seconds: number): number {
  const [left, setLeft] = useState(0)

  useEffect(() => {
    if (!trigger) return
    const end = Date.now() + seconds * 1000
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining === 0) window.clearInterval(timer)
    }
    const timer = window.setInterval(tick, 1000)
    tick()
    return () => window.clearInterval(timer)
  }, [trigger, seconds])

  return left
}
