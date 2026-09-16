import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackProductEvent } from '../product-events.js'
import { resolveScreenFeatureKey } from './screen-feature-key.js'

const SESSION_KEY = 'aiyracare.screen_telemetry'

function markScreenSeen(featureKey: string): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    const seen = raw ? (JSON.parse(raw) as string[]) : []
    if (seen.includes(featureKey)) return false
    seen.push(featureKey)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(seen.slice(-40)))
    return true
  } catch {
    return true
  }
}

/** Uma vez por sessão por tela — alimenta matriz acesso × fail rate no console ops. */
export function useScreenTelemetry(): void {
  const { pathname } = useLocation()

  useEffect(() => {
    const featureKey = resolveScreenFeatureKey(pathname)
    if (!featureKey || !markScreenSeen(featureKey)) return
    trackProductEvent('app_screen_viewed', { feature_key: featureKey }, { route: pathname })
  }, [pathname])
}
