import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { AvaDockWidget } from './AvaDockWidget.js'
import './ava-global-dock.css'

/**
 * Resolve o paciente "da lente" atual a partir da rota:
 * - /patients/:id → id da URL
 * - ?patientId=... → query param (ex.: emergência)
 * - fallback: primeiro paciente da conta (Ava é global).
 */
function useGlobalPatientId(): string | null {
  const location = useLocation()
  const params = useParams()
  const [fallbackId, setFallbackId] = useState<string | null>(null)

  const routePatientId =
    (params as Record<string, string | undefined>).id ??
    new URLSearchParams(location.search).get('patientId')

  useEffect(() => {
    if (routePatientId) return
    let cancelled = false
    api.patients
      .list()
      .then((patients) => {
        if (!cancelled && patients.length > 0) setFallbackId(patients[0].id)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [routePatientId])

  return useMemo(() => routePatientId ?? fallbackId, [routePatientId, fallbackId])
}

/** Presença global da Ava: orb fixo sobreposto ao conteúdo, disponível em todas as páginas. */
export function AvaGlobalDock() {
  const patientId = useGlobalPatientId()

  if (!patientId) return null

  return (
    <div className="ava-global-dock">
      <AvaDockWidget patientId={patientId} />
    </div>
  )
}
