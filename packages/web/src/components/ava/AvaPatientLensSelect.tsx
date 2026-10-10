import { Select, Tag } from 'antd'
import type { SelectProps } from 'antd'
import { clsx } from 'clsx'
import { useTranslation } from 'react-i18next'
import type { Patient } from '../../lib/api.types.js'
import './ava-patient-lens-select.css'

interface Props {
  patients: Patient[]
  value: string
  onChange: (patientId: string) => void
  /** Rota fixa a um paciente — seletor ainda permite override com aviso visual. */
  routePatientId?: string | null
  disabled?: boolean
  /** Largura total do controle (ex.: bloco Hoje no dashboard). */
  block?: boolean
}

function patientFirstName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return name
  return trimmed.split(/\s+/)[0] ?? trimmed
}

function optionPlainLabel(p: Patient): string {
  return p.isSelf ? patientFirstName(p.name) : p.name
}

function PatientOptionLabel({ patient }: { patient: Patient }) {
  const { t } = useTranslation()
  return (
    <span className="ava-patient-lens-select__option">
      <span className="ava-patient-lens-select__option-name">{patient.name}</span>
      {patient.isSelf && (
        <Tag color="purple" style={{ margin: 0, fontSize: 10, lineHeight: 18, flexShrink: 0 }}>
          {t('patient.you')}
        </Tag>
      )}
    </span>
  )
}

export function AvaPatientLensSelect({
  patients,
  value,
  onChange,
  routePatientId: _routePatientId,
  disabled,
  block = false,
}: Props) {
  const { t } = useTranslation()
  const active = patients.find((p) => p.id === value) ?? null

  const labelRender: SelectProps['labelRender'] = (props) => {
    const p = patients.find((x) => x.id === props.value) ?? active
    if (!p) return props.label
    return (
      <span className="ava-patient-lens-select__selector">
        <span className="ava-patient-lens-select__option-name">{optionPlainLabel(p)}</span>
        {p.isSelf && (
          <Tag color="purple" style={{ margin: 0, fontSize: 10, lineHeight: 18, flexShrink: 0 }}>
            {t('patient.you')}
          </Tag>
        )}
      </span>
    )
  }

  return (
    <Select
      className={clsx('ava-patient-lens-select', block && 'ava-patient-lens-select--block')}
      size="small"
      value={value}
      disabled={disabled || patients.length <= 1}
      onChange={onChange}
      popupMatchSelectWidth={block}
      labelRender={labelRender}
      style={
        block
          ? { width: '100%', maxWidth: '100%', minWidth: 0 }
          : { minWidth: 160, maxWidth: 280 }
      }
      options={patients.map((p) => ({
        value: p.id,
        label: optionPlainLabel(p),
      }))}
      optionRender={(option) => {
        const p = patients.find((x) => x.id === option.value)
        if (!p) return option.label
        return <PatientOptionLabel patient={p} />
      }}
      aria-label={t('ava.patientLensLabel')}
    />
  )
}
