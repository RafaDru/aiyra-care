import { useAvaPatientLens } from '../ava/useAvaPatientLens.js'
import { WalletTodayPanel } from '../patient/WalletTodayPanel.js'
import { DayToDayDiscoveryHub } from './DayToDayDiscoveryHub.js'

/** Bloco «Hoje» no dashboard — mesma lente Ava do registro rápido. */
export function DashboardDayToDaySection() {
  const { patients, patientId, routePatientId, loading, setPatientId } = useAvaPatientLens()

  if (loading || !patientId || patients.length === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <DayToDayDiscoveryHub patientId={patientId} hasPatients />
      <WalletTodayPanel
        patientId={patientId}
        patients={patients}
        routePatientId={routePatientId}
        onPatientChange={setPatientId}
      />
    </div>
  )
}
