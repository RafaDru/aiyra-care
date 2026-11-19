import type { Patient } from '../../lib/api.types.js'
import { AvaPatientLensChips } from './AvaPatientLensChips.js'
import { AvaPatientLensSelect } from './AvaPatientLensSelect.js'
import './ava-chat.css'
import './ava-patient-lens-control.css'

interface Props {
  patients: Patient[]
  value: string
  onChange: (patientId: string) => void
  routePatientId?: string | null
  disabled?: boolean
  block?: boolean
  /** Lista familiar curta: chips evitam dropdown Ant Design com layout quebrado. */
  preferChips?: boolean
}

const CHIPS_MAX = 12

export function AvaPatientLensControl({
  patients,
  value,
  onChange,
  routePatientId,
  disabled,
  block = false,
  preferChips = true,
}: Props) {
  const useChips = preferChips && patients.length > 1 && patients.length <= CHIPS_MAX

  if (useChips) {
    return (
      <div className={block ? 'ava-patient-lens-control ava-patient-lens-control--block' : 'ava-patient-lens-control'}>
        <AvaPatientLensChips patients={patients} value={value} onChange={onChange} disabled={disabled} />
      </div>
    )
  }

  return (
    <AvaPatientLensSelect
      block={block}
      patients={patients}
      value={value}
      onChange={onChange}
      routePatientId={routePatientId}
      disabled={disabled}
    />
  )
}