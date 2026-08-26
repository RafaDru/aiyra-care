import { useEffect, useState } from 'react'

export type AvaDockIntroPhase = 'greeting' | 'settling' | 'done'

const GREETING_MS = 4200
const SETTLE_MS = 2200

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Intro: saudação → transição suave (settling) → neutro. */
export function useAvaDockIntro(): { phase: AvaDockIntroPhase; introDone: boolean } {
  const [phase, setPhase] = useState<AvaDockIntroPhase>(() =>
    prefersReducedMotion() ? 'done' : 'greeting',
  )

  useEffect(() => {
    if (prefersReducedMotion()) return

    const toSettling = window.setTimeout(() => setPhase('settling'), GREETING_MS)
    const toDone = window.setTimeout(() => setPhase('done'), GREETING_MS + SETTLE_MS)
    return () => {
      window.clearTimeout(toSettling)
      window.clearTimeout(toDone)
    }
  }, [])

  return { phase, introDone: phase === 'done' }
}
