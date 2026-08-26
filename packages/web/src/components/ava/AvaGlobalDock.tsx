import { useEffect, useState } from 'react'
import { AvaDockWidget } from './AvaDockWidget.js'
import { useAvaPatientLens } from './useAvaPatientLens.js'
import { subscribeAvaOpen, type AvaOpenRequest } from '../../lib/ava-dock-bus.js'
import './ava-global-dock.css'

/** Presença global da Ava: orb fixo + lente de paciente resolvida. */
export function AvaGlobalDock() {
  const {
    patients,
    patientId,
    routePatientId,
    lensOverridesRoute,
    loading,
    setPatientId,
  } = useAvaPatientLens()

  const [openRequest, setOpenRequest] = useState<AvaOpenRequest | null>(null)
  const [openRequestEpoch, setOpenRequestEpoch] = useState(0)

  useEffect(() => {
    return subscribeAvaOpen((req) => {
      setPatientId(req.patientId)
      setOpenRequest(req)
      setOpenRequestEpoch((n) => n + 1)
    })
  }, [setPatientId])

  if (loading || !patientId) return null

  return (
    <div className="ava-global-dock">
      <AvaDockWidget
        patientId={patientId}
        patients={patients}
        onPatientChange={setPatientId}
        routePatientId={routePatientId}
        lensOverridesRoute={lensOverridesRoute}
        openRequest={openRequest}
        openRequestEpoch={openRequestEpoch}
        onOpenRequestConsumed={() => setOpenRequest(null)}
      />
    </div>
  )
}
