import type { ProductEventName } from './api.types.js'

const SESSION_KEY = 'aiyracare.browser_session'
const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:3010')

const CLINICIAN_SHARE_EVENTS = new Set<ProductEventName>([
  'clinician_share_viewed',
  'clinician_share_feedback',
  'clinician_share_cta_click',
])

function getBrowserSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return 'anonymous'
  }
}

/** Telemetria pública do portal médico (sem login). */
export function trackClinicianShareEvent(
  eventName: ProductEventName,
  properties?: Record<string, unknown>,
): void {
  if (!CLINICIAN_SHARE_EVENTS.has(eventName)) return
  const route = typeof window !== 'undefined' ? window.location.pathname : undefined
  void fetch(`${BASE_URL}/telemetry/public-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      events: [{
        eventName,
        sessionId: getBrowserSessionId(),
        route,
        properties: properties ?? {},
      }],
    }),
  }).catch(() => undefined)
}
