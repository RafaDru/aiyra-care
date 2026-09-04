import { trackProductEvent } from '../product-events.js'

export type SyncTelemetryMode = 'manual' | 'silent'

export function trackSyncJobStarted(
  portalType: string | undefined,
  mode: SyncTelemetryMode,
  patientId?: string,
): void {
  trackProductEvent('sync_job_started', {
    portal_type: portalType ?? 'unknown',
    mode,
  }, { patientId })
}

export function trackSyncJobSkipped(
  portalType: string | undefined,
  reason: string,
  mode: SyncTelemetryMode,
  patientId?: string,
): void {
  trackProductEvent('sync_job_started', {
    portal_type: portalType ?? 'unknown',
    mode,
    status: 'skipped',
    reason: reason.slice(0, 64),
  }, { patientId })
}
