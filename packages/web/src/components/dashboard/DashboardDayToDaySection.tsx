import { useAvaPatientLens } from '../ava/useAvaPatientLens.js'
import { WalletTodayPanel } from '../patient/WalletTodayPanel.js'
import { DayToDayDiscoveryHub } from './DayToDayDiscoveryHub.js'
import './dashboard-day-to-day-section.css'

/** Bloco «Dia a dia» + «Hoje» no dashboard — mesma lente Ava do registro rápido. */
export function DashboardDayToDaySection() {
  const { patients, patientId, routePatientId, loading, setPatientId } = useAvaPatientLens()

  if (loading || !patientId || patients.length === 0) return null

  return (
    <div className="dashboard-day-to-day-section">
      <div className="dashboard-day-to-day-section__cell dashboard-day-to-day-section__cell--hub">
        <DayToDayDiscoveryHub patientId={patientId} hasPatients />
      </div>
      <div className="dashboard-day-to-day-section__cell dashboard-day-to-day-section__cell--today">
        <WalletTodayPanel
          patientId={patientId}
          patients={patients}
          routePatientId={routePatientId}
          onPatientChange={setPatientId}
        />
      </div>
    </div>
  )
}
