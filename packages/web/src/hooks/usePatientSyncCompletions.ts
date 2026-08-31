import { useEffect } from 'react'
import { openPatientSyncStream } from '../lib/patient-sync-stream.js'
import { refreshAccountFreshness } from '../lib/account-freshness.js'
import { useAuth } from '../contexts/AuthContext.js'
import { trackProductEvent } from '../lib/product-events.js'

/**
 * Recebe eventos sync.completed/failed para o paciente e dispara refresh.
 */
export function usePatientSyncCompletions(patientId: string | undefined, onCompleted?: () => void) {
  const { loading: authLoading, authUserId, session, configured: authConfigured } = useAuth()

  useEffect(() => {
    if (!patientId) return
    if (authConfigured && (authLoading || !authUserId)) return

    const close = openPatientSyncStream(patientId, (payload, event) => {
      if (event === 'completed' || event === 'failed') {
        trackProductEvent('sync_job_terminal', {
          job_id: payload.jobId,
          portal_type: payload.portalType,
          status: payload.status,
        }, { patientId })
      }
      if (payload.status === 'success') {
        void refreshAccountFreshness().catch(() => undefined)
        onCompleted?.()
      }
    })
    return close
  }, [patientId, onCompleted, authLoading, authUserId, session?.access_token, authConfigured])
}
