import { useEffect } from 'react'
import { openPatientSyncStream } from '../lib/patient-sync-stream.js'
import { useAuth } from '../contexts/AuthContext.js'

/**
 * Recebe eventos sync.completed/failed para o paciente e dispara refresh.
 */
export function usePatientSyncCompletions(patientId: string | undefined, onCompleted?: () => void) {
  const { loading: authLoading, session, configured: authConfigured } = useAuth()

  useEffect(() => {
    if (!patientId || !onCompleted) return
    if (authConfigured && (authLoading || !session)) return

    const close = openPatientSyncStream(patientId, (payload) => {
      if (payload.status === 'success') onCompleted()
    })
    return close
  }, [patientId, onCompleted, authLoading, session, authConfigured])
}
