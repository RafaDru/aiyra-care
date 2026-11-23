import { useEffect, useState } from 'react'

const NARROW_VIEWPORT_MQ = '(max-width: 768px)'
const STANDALONE_DISPLAY_MQ = '(display-mode: standalone)'

function matchesCompactShell(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia(NARROW_VIEWPORT_MQ).matches ||
    window.matchMedia(STANDALONE_DISPLAY_MQ).matches
  )
}

/** Layout mobile/PWA: viewport estreito ou app instalado (`display-mode: standalone`). */
export function useCompactAppShell(): boolean {
  const [compact, setCompact] = useState(matchesCompactShell)

  useEffect(() => {
    const narrow = window.matchMedia(NARROW_VIEWPORT_MQ)
    const standalone = window.matchMedia(STANDALONE_DISPLAY_MQ)
    const update = () => setCompact(narrow.matches || standalone.matches)
    narrow.addEventListener('change', update)
    standalone.addEventListener('change', update)
    update()
    return () => {
      narrow.removeEventListener('change', update)
      standalone.removeEventListener('change', update)
    }
  }, [])

  return compact
}