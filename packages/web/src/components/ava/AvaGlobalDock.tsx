import { AvaDockWidget } from './AvaDockWidget.js'
import { useAvaPatientLens } from './useAvaPatientLens.js'
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

  if (loading || !patientId) return null

  return (
    <div className="ava-global-dock">
      <AvaDockWidget
        patientId={patientId}
        patients={patients}
        onPatientChange={setPatientId}
        routePatientId={routePatientId}
        lensOverridesRoute={lensOverridesRoute}
      />
    </div>
  )
}
