import type { ProductEventName } from './api.types.js'

const SESSION_KEY = 'aiyracare.browser_session'

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

interface TrackOptions {
  patientId?: string
  route?: string
}

/**
 * Telemetria de produto sem PHI — fire-and-forget.
 * Ver docs/OBSERVABILITY.md e allowlist em product-event.ts (API).
 */
export function trackProductEvent(
  eventName: ProductEventName,
  properties?: Record<string, unknown>,
  options?: TrackOptions,
): void {
  const route = options?.route ?? (typeof window !== 'undefined' ? window.location.pathname : undefined)
  void import('./api.js').then(({ api }) =>
    api.telemetry.track({
      events: [{
        eventName,
        sessionId: getBrowserSessionId(),
        route,
        patientId: options?.patientId,
        properties: properties ?? {},
      }],
    }),
  ).catch(() => undefined)
}

export function trackProductEventBatch(
  events: Array<{
    eventName: ProductEventName
    properties?: Record<string, unknown>
    patientId?: string
    route?: string
  }>,
): void {
  if (!events.length) return
  const route = typeof window !== 'undefined' ? window.location.pathname : undefined
  const sessionId = getBrowserSessionId()
  void import('./api.js').then(({ api }) =>
    api.telemetry.track({
      events: events.map((e) => ({
        eventName: e.eventName,
        sessionId,
        route: e.route ?? route,
        patientId: e.patientId,
        properties: e.properties ?? {},
      })),
    }),
  ).catch(() => undefined)
}
