import { useEffect, useState } from 'react'
import { useDesignPreviewMode } from '../contexts/DesignPreviewModeContext.js'

const NARROW_VIEWPORT_MQ = '(max-width: 768px)'
const STANDALONE_DISPLAY_MQ = '(display-mode: standalone)'
const COARSE_POINTER_MQ = '(pointer: coarse)'

function matchesCompactShell(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia(STANDALONE_DISPLAY_MQ).matches) return true
  const narrow = window.matchMedia(NARROW_VIEWPORT_MQ).matches
  const coarse = window.matchMedia(COARSE_POINTER_MQ).matches
  return narrow && coarse
}

/** PWA compact: `standalone` ou viewport estreito **com** pointer coarse (não quebra web estreita no desktop). */
export function useCompactAppShell(): boolean {
  const designPreview = useDesignPreviewMode()
  const [compact, setCompact] = useState(() => designPreview || matchesCompactShell())

  useEffect(() => {
    if (designPreview) {
      setCompact(true)
      return
    }
    const narrow = window.matchMedia(NARROW_VIEWPORT_MQ)
    const standalone = window.matchMedia(STANDALONE_DISPLAY_MQ)
    const coarse = window.matchMedia(COARSE_POINTER_MQ)
    const update = () =>
      setCompact(standalone.matches || (narrow.matches && coarse.matches))
    narrow.addEventListener('change', update)
    standalone.addEventListener('change', update)
    coarse.addEventListener('change', update)
    update()
    return () => {
      narrow.removeEventListener('change', update)
      standalone.removeEventListener('change', update)
      coarse.removeEventListener('change', update)
    }
  }, [designPreview])

  return designPreview || compact
}