import { useEffect } from 'react'
import { usePathname } from 'expo-router'
import { setMobileTelemetryRoute } from '@/lib/client-errors'

/** Mantém rota atual para telemetria (paridade web `window.location`). */
export function MobileTelemetryRoute() {
  const pathname = usePathname()
  useEffect(() => {
    setMobileTelemetryRoute(pathname ?? '/')
  }, [pathname])
  return null
}
