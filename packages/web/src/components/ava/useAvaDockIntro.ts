import { useEffect, useState } from 'react'

export type AvaDockIntroPhase = 'greeting' | 'offer' | 'done'

const GREETING_MS = 3000
const OFFER_MS = 3000

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useAvaDockIntro(): { phase: AvaDockIntroPhase; introDone: boolean } {
  const [phase, setPhase] = useState<AvaDockIntroPhase>(() =>
    prefersReducedMotion() ? 'done' : 'greeting',
  )

  useEffect(() => {
    if (prefersReducedMotion()) return

    const toOffer = window.setTimeout(() => setPhase('offer'), GREETING_MS)
    const toDone = window.setTimeout(() => setPhase('done'), GREETING_MS + OFFER_MS)
    return () => {
      window.clearTimeout(toOffer)
      window.clearTimeout(toDone)
    }
  }, [])

  return { phase, introDone: phase === 'done' }
}
