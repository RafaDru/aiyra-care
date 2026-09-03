import { useEffect, useRef } from 'react'
import { api } from '../lib/api.js'
import { SILENT_SYNC_STALE_MS } from '../lib/silent-sync.js'

const silentStartedForPatient = new Set<string>()

/**
 * Sync silencioso ConecteSUS na Carteira — fetch HTTP + import quando gov.br sessão válida.
 */
export function useSilentConecteSUSSync(
  patientId: string,
  patientCpf: string | null | undefined,
  govbrSessionReady: boolean,
  conectesusLastFetchAt: string | null | undefined,
  onUpdated?: () => void,
) {
  const runningRef = useRef(false)

  useEffect(() => {
    const cpf = patientCpf?.replace(/\D/g, '')
    if (!cpf || cpf.length !== 11) return
    if (!govbrSessionReady) return
    if (silentStartedForPatient.has(patientId)) return

    if (conectesusLastFetchAt) {
      const age = Date.now() - new Date(conectesusLastFetchAt).getTime()
      if (age < SILENT_SYNC_STALE_MS) return
    }

    if (runningRef.current) return
    runningRef.current = true
    silentStartedForPatient.add(patientId)

    void api.patients.conectesusSync(patientId, { silent: true })
      .then((r) => {
        if (!r.skipped && (r.importedVaccines || r.importedExams)) onUpdated?.()
      })
      .catch((e) => console.warn('Silent ConecteSUS sync failed', e))
      .finally(() => {
        runningRef.current = false
      })
  }, [patientId, patientCpf, govbrSessionReady, conectesusLastFetchAt, onUpdated])
}
