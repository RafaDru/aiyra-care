import { useEffect } from 'react'
import { useCompactPatientChrome } from '../contexts/CompactPatientChromeContext.js'
import { samplePatientChromeFromViewport } from '../lib/patient-chrome-scroll.js'

/** Sincroniza progress / macroProgress com scroll do viewport (paciente + design auto). */
export function usePatientChromeScrollSync(enabled: boolean) {
  const { setChrome } = useCompactPatientChrome()

  useEffect(() => {
    if (!enabled) return

    const onScroll = () => {
      const { progress, macroProgress } = samplePatientChromeFromViewport()
      setChrome({ progress, macroProgress, patientFocus: true })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [enabled, setChrome])
}